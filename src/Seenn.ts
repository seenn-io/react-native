// Seenn React Native SDK - Main Class
// MIT License - Open Source

import { SSEService } from './services/SSEService';
import { PollingService } from './services/PollingService';
import { StateManager } from './state/StateManager';
import type {
  SeennConfig,
  SeennJob,
  ConnectionState,
  ConnectionMode,
  InAppMessage,
} from './types';

export class Seenn {
  private config: SeennConfig;
  private sseService: SSEService | null = null;
  private pollingService: PollingService | null = null;
  private stateManager: StateManager;
  private currentUserId: string | null = null;

  constructor(config: SeennConfig) {
    this.config = {
      mode: 'sse',
      pollInterval: 5000,
      reconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      debug: false,
      ...config,
      sseUrl: config.sseUrl || `${config.baseUrl}/v1/sse`,
    };

    this.stateManager = new StateManager();
  }

  /**
   * Check if using polling mode
   */
  get isPollingMode(): boolean {
    return this.config.mode === 'polling';
  }

  /**
   * Check if using SSE mode
   */
  get isSSEMode(): boolean {
    return this.config.mode !== 'polling';
  }

  /**
   * Connect for real-time updates (SSE or Polling based on config)
   */
  async connect(userId: string): Promise<void> {
    if (this.sseService || this.pollingService) {
      this.log('Already connected');
      return;
    }

    this.currentUserId = userId;
    this.log(`Connecting for user: ${userId} (mode: ${this.config.mode})`);

    if (this.isPollingMode) {
      // Polling mode for self-hosted backends
      this.pollingService = new PollingService({
        baseUrl: this.config.baseUrl,
        authToken: this.config.authToken,
        pollInterval: this.config.pollInterval,
        debug: this.config.debug,
      });

      // Listen to connection state changes
      this.pollingService.on('connectionStateChange', (state: ConnectionState) => {
        this.stateManager.setConnectionState(state);
      });

      // Setup event listeners for polling
      this.setupPollingEventListeners();

      // Start polling
      this.pollingService.connect(userId);
    } else {
      // SSE mode (default)
      this.sseService = new SSEService({
        url: this.config.sseUrl!,
        authToken: this.config.authToken,
        reconnect: this.config.reconnect,
        reconnectInterval: this.config.reconnectInterval,
        maxReconnectAttempts: this.config.maxReconnectAttempts,
        debug: this.config.debug,
      });

      // Listen to connection state changes
      this.sseService.on('connectionStateChange', (state: ConnectionState) => {
        this.stateManager.setConnectionState(state);
      });

      // Listen to SSE events
      this.setupEventListeners();

      // Start connection
      this.sseService.connect(userId);
    }
  }

  /**
   * Disconnect from SSE or Polling
   */
  disconnect(): void {
    this.log('Disconnecting');

    if (this.sseService) {
      this.sseService.disconnect();
      this.sseService.removeAllListeners();
      this.sseService = null;
    }

    if (this.pollingService) {
      this.pollingService.disconnect();
      this.pollingService.removeAllListeners();
      this.pollingService = null;
    }

    this.stateManager.setConnectionState('disconnected');
  }

  /**
   * Force reconnect to SSE
   *
   * Useful for recovering from connection issues or when app returns to foreground.
   *
   * @example
   * ```ts
   * // Reconnect when app comes to foreground
   * useEffect(() => {
   *   const subscription = AppState.addEventListener('change', (state) => {
   *     if (state === 'active') {
   *       seenn.reconnect();
   *     }
   *   });
   *   return () => subscription.remove();
   * }, []);
   * ```
   */
  async reconnect(): Promise<void> {
    if (!this.currentUserId) {
      this.log('Cannot reconnect: no previous connection');
      return;
    }

    this.log('Force reconnecting');

    // Disconnect if connected
    if (this.sseService) {
      this.sseService.disconnect();
      this.sseService.removeAllListeners();
      this.sseService = null;
    }

    // Reconnect
    await this.connect(this.currentUserId);
  }

  /**
   * Manually update job state
   *
   * Useful for polling fallback or optimistic updates.
   *
   * @example
   * ```ts
   * // Polling fallback when SSE is disconnected
   * const fetchJob = async (jobId: string) => {
   *   const response = await fetch(`/api/jobs/${jobId}`);
   *   const job = await response.json();
   *   seenn.updateJob(job);
   * };
   * ```
   */
  updateJob(job: SeennJob): void {
    this.log('Manual job update', job.jobId);
    this.stateManager.updateJob(job);
  }

  /**
   * Subscribe to job updates (polling mode only)
   * In SSE mode, all jobs for the user are automatically received.
   *
   * @example
   * ```ts
   * // Subscribe to a specific job for polling
   * seenn.subscribeJobForPolling('job_123');
   * ```
   */
  subscribeJobForPolling(jobId: string): void {
    if (this.pollingService) {
      this.pollingService.subscribeJob(jobId);
    } else {
      this.log('subscribeJobForPolling: Not in polling mode, ignoring');
    }
  }

  /**
   * Subscribe to multiple jobs (polling mode only)
   */
  subscribeJobsForPolling(jobIds: string[]): void {
    if (this.pollingService) {
      this.pollingService.subscribeJobs(jobIds);
    } else {
      this.log('subscribeJobsForPolling: Not in polling mode, ignoring');
    }
  }

  /**
   * Unsubscribe from job updates (polling mode only)
   */
  unsubscribeJobFromPolling(jobId: string): void {
    if (this.pollingService) {
      this.pollingService.unsubscribeJob(jobId);
    }
  }

  /**
   * Get subscribed job IDs (polling mode only)
   */
  getPollingSubscribedJobIds(): string[] {
    if (this.pollingService) {
      return this.pollingService.getSubscribedJobIds();
    }
    return [];
  }

  /**
   * Subscribe to a specific job
   * Returns unsubscribe function
   */
  subscribeToJob(jobId: string, callback: (job: SeennJob | null) => void): () => void {
    return this.stateManager.getJob$(jobId).subscribe(callback);
  }

  /**
   * Subscribe to all jobs
   * Returns unsubscribe function
   */
  subscribeToAllJobs(callback: (jobs: Map<string, SeennJob>) => void): () => void {
    return this.stateManager.getAllJobs$().subscribe(callback);
  }

  /**
   * Subscribe to connection state
   * Returns unsubscribe function
   */
  subscribeToConnectionState(callback: (state: ConnectionState) => void): () => void {
    return this.stateManager.getConnectionState$().subscribe(callback);
  }

  /**
   * Get current job (synchronous)
   */
  getJob(jobId: string): SeennJob | null {
    return this.stateManager.getJob(jobId);
  }

  /**
   * Get all jobs (synchronous)
   */
  getAllJobs(): Map<string, SeennJob> {
    return this.stateManager.getAllJobs();
  }

  /**
   * Get connection state (synchronous)
   */
  getConnectionState(): ConnectionState {
    return this.stateManager.getConnectionState$().value;
  }

  /**
   * React hook: useJob
   * Usage: const job = useJob(jobId);
   */
  useJob(jobId: string): SeennJob | null {
    // This will be implemented as a React hook in a separate file
    // For now, just return current value
    return this.getJob(jobId);
  }

  /**
   * Dispose (cleanup)
   */
  dispose(): void {
    this.disconnect();
    this.stateManager.dispose();
  }

  // Private methods

  private setupEventListeners(): void {
    if (!this.sseService) return;

    // connected event
    this.sseService.on('connected', (data) => {
      this.log('Connected', data);
    });

    // job.sync event (state reconciliation on connect/reconnect)
    this.sseService.on('job.sync', (job: SeennJob) => {
      this.log('Job sync', job.jobId);
      this.stateManager.updateJob(job);
    });

    // connection.idle event (server closing due to inactivity)
    this.sseService.on('connection.idle', (data: { reason: string; idleTime: number }) => {
      this.log('Connection idle', data.reason);
      // Connection will close after this, auto-reconnect will handle it
    });

    // job.started event
    this.sseService.on('job.started', (job: SeennJob) => {
      this.log('Job started', job.jobId);
      this.stateManager.updateJob(job);
    });

    // job.progress event
    this.sseService.on('job.progress', (job: SeennJob) => {
      this.log('Job progress', `${job.jobId}: ${job.progress}%`);
      this.stateManager.updateJob(job);
    });

    // job.completed event
    this.sseService.on('job.completed', (job: SeennJob) => {
      this.log('Job completed', job.jobId);
      this.stateManager.updateJob(job);
    });

    // job.failed event
    this.sseService.on('job.failed', (job: SeennJob) => {
      this.log('Job failed', job.jobId);
      this.stateManager.updateJob(job);
    });

    // job.cancelled event
    this.sseService.on('job.cancelled', (job: SeennJob) => {
      this.log('Job cancelled', job.jobId);
      this.stateManager.updateJob(job);
    });

    // child.progress event
    this.sseService.on('child.progress', (data: any) => {
      this.log('Child progress', data);
      // Update parent job with child progress
      const parentJob = this.stateManager.getJob(data.parentJobId);
      if (parentJob) {
        const updatedJob = { ...parentJob, ...data };
        this.stateManager.updateJob(updatedJob);
      }
    });

    // in_app_message event
    this.sseService.on('in_app_message', (message: InAppMessage) => {
      this.log('In-app message', message);
      // Emit as custom event for user to handle
      this.sseService?.emit('inAppMessage', message);
    });

    // heartbeat event
    this.sseService.on('heartbeat', (data) => {
      this.log('Heartbeat', data);
    });

    // error event
    this.sseService.on('error', (error) => {
      this.log('Error', error.message);
    });
  }

  private setupPollingEventListeners(): void {
    if (!this.pollingService) return;

    // job.started event
    this.pollingService.on('job.started', (job: SeennJob) => {
      this.log('Job started (polling)', job.jobId);
      this.stateManager.updateJob(job);
    });

    // job.progress event
    this.pollingService.on('job.progress', (job: SeennJob) => {
      this.log('Job progress (polling)', `${job.jobId}: ${job.progress}%`);
      this.stateManager.updateJob(job);
    });

    // job.completed event
    this.pollingService.on('job.completed', (job: SeennJob) => {
      this.log('Job completed (polling)', job.jobId);
      this.stateManager.updateJob(job);
    });

    // job.failed event
    this.pollingService.on('job.failed', (job: SeennJob) => {
      this.log('Job failed (polling)', job.jobId);
      this.stateManager.updateJob(job);
    });

    // job.cancelled event
    this.pollingService.on('job.cancelled', (job: SeennJob) => {
      this.log('Job cancelled (polling)', job.jobId);
      this.stateManager.updateJob(job);
    });
  }

  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[Seenn] ${message}`, data || '');
    }
  }
}
