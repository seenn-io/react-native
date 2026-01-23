// Seenn React Native SDK - Main Class
// MIT License - Open Source

import { SSEService } from './services/SSEService';
import { StateManager } from './state/StateManager';
import type {
  SeennConfig,
  SeennJob,
  ConnectionState,
  InAppMessage,
} from './types';

export class Seenn {
  private config: SeennConfig;
  private sseService: SSEService | null = null;
  private stateManager: StateManager;
  private currentUserId: string | null = null;

  constructor(config: SeennConfig) {
    this.config = {
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
   * Connect to SSE for real-time updates
   */
  async connect(userId: string): Promise<void> {
    if (this.sseService) {
      this.log('Already connected');
      return;
    }

    this.currentUserId = userId;
    this.log(`Connecting for user: ${userId}`);

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

  /**
   * Disconnect from SSE
   */
  disconnect(): void {
    this.log('Disconnecting');

    if (this.sseService) {
      this.sseService.disconnect();
      this.sseService.removeAllListeners();
      this.sseService = null;
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

  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[Seenn] ${message}`, data || '');
    }
  }
}
