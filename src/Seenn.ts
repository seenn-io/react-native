// Seenn React Native SDK - Main Class
// MIT License - Open Source

import { PollingService } from './services/PollingService';
import { StateManager } from './state/StateManager';
import type {
  SeennConfig,
  SeennJob,
  ConnectionState,
} from './types';

export class Seenn {
  private config: SeennConfig;
  private pollingService: PollingService | null = null;
  private stateManager: StateManager;
  private currentUserId: string | null = null;

  constructor(config: SeennConfig) {
    // Validate API key format (skip for self-hosted backends)
    const isSelfHosted = config.baseUrl !== 'https://api.seenn.io';

    if (!isSelfHosted && config.apiKey && !config.apiKey.startsWith('pk_') && !config.apiKey.startsWith('sk_')) {
      throw new Error('Invalid API key format. Key must start with pk_ or sk_');
    }

    const basePath = config.basePath ?? '/v1';

    this.config = {
      pollInterval: 5000,
      reconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      debug: false,
      ...config,
      basePath,
    };

    this.stateManager = new StateManager();
  }

  /**
   * Connect for real-time updates (polling)
   */
  async connect(userId: string): Promise<void> {
    if (this.pollingService) {
      this.log('Already connected');
      return;
    }

    this.currentUserId = userId;
    this.log(`Connecting for user: ${userId}`);

    this.pollingService = new PollingService({
      baseUrl: this.config.baseUrl,
      basePath: this.config.basePath,
      apiKey: this.config.apiKey,
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
  }

  /**
   * Disconnect from polling
   */
  disconnect(): void {
    this.log('Disconnecting');

    if (this.pollingService) {
      this.pollingService.disconnect();
      this.pollingService.removeAllListeners();
      this.pollingService = null;
    }

    this.stateManager.setConnectionState('disconnected');
  }

  /**
   * Force reconnect
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
    if (this.pollingService) {
      this.pollingService.disconnect();
      this.pollingService.removeAllListeners();
      this.pollingService = null;
    }

    // Reconnect
    await this.connect(this.currentUserId);
  }

  /**
   * Manually update job state
   *
   * Useful for optimistic updates.
   *
   * @example
   * ```ts
   * // Optimistic update
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
   * Subscribe to job updates (polling mode)
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
      this.log('subscribeJobForPolling: Not connected, ignoring');
    }
  }

  /**
   * Subscribe to multiple jobs
   */
  subscribeJobsForPolling(jobIds: string[]): void {
    if (this.pollingService) {
      this.pollingService.subscribeJobs(jobIds);
    } else {
      this.log('subscribeJobsForPolling: Not connected, ignoring');
    }
  }

  /**
   * Unsubscribe from job updates
   */
  unsubscribeJobFromPolling(jobId: string): void {
    if (this.pollingService) {
      this.pollingService.unsubscribeJob(jobId);
    }
  }

  /**
   * Get subscribed job IDs
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

  private setupPollingEventListeners(): void {
    if (!this.pollingService) return;

    // job.started event
    this.pollingService.on('job.started', (job: SeennJob) => {
      this.log('Job started', job.jobId);
      this.stateManager.updateJob(job);
    });

    // job.progress event
    this.pollingService.on('job.progress', (job: SeennJob) => {
      this.log('Job progress', `${job.jobId}: ${job.progress}%`);
      this.stateManager.updateJob(job);
    });

    // job.completed event
    this.pollingService.on('job.completed', (job: SeennJob) => {
      this.log('Job completed', job.jobId);
      this.stateManager.updateJob(job);
    });

    // job.failed event
    this.pollingService.on('job.failed', (job: SeennJob) => {
      this.log('Job failed', job.jobId);
      this.stateManager.updateJob(job);
    });

    // job.cancelled event
    this.pollingService.on('job.cancelled', (job: SeennJob) => {
      this.log('Job cancelled', job.jobId);
      this.stateManager.updateJob(job);
    });
  }

  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[Seenn] ${message}`, data || '');
    }
  }
}
