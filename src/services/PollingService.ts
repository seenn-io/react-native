// Seenn React Native SDK - Polling Service
// MIT License - Open Source

import EventEmitter from 'eventemitter3';
import type { ConnectionState, SeennJob } from '../types';

export interface PollingServiceConfig {
  baseUrl: string;
  apiKey?: string;
  pollInterval?: number;
  debug?: boolean;
}

/**
 * PollingService for self-hosted backends
 * Alternative to SSE for simpler setups
 */
export class PollingService extends EventEmitter {
  private config: PollingServiceConfig;
  private connectionState: ConnectionState = 'disconnected';
  private pollTimer: NodeJS.Timeout | null = null;
  private subscribedJobIds: Set<string> = new Set();
  private userId: string | null = null;

  constructor(config: PollingServiceConfig) {
    super();
    this.config = {
      pollInterval: 5000,
      debug: false,
      ...config,
    };
  }

  /**
   * Connect to polling service
   */
  connect(userId: string): void {
    if (this.connectionState === 'connected') {
      this.log('Already connected');
      return;
    }

    this.userId = userId;
    this.setConnectionState('connecting');
    this.log(`Starting polling for user: ${userId}`);

    // Start polling immediately
    this.startPolling();
    this.setConnectionState('connected');
  }

  /**
   * Disconnect from polling service
   */
  disconnect(): void {
    this.log('Disconnecting polling');
    this.stopPolling();
    this.setConnectionState('disconnected');
  }

  /**
   * Subscribe to a job for polling
   */
  subscribeJob(jobId: string): void {
    this.subscribedJobIds.add(jobId);
    this.log(`Subscribed to job: ${jobId}`);

    // Fetch immediately
    this.fetchJob(jobId);
  }

  /**
   * Subscribe to multiple jobs
   */
  subscribeJobs(jobIds: string[]): void {
    jobIds.forEach(id => this.subscribedJobIds.add(id));
    this.log(`Subscribed to ${jobIds.length} jobs`);

    // Fetch all immediately
    jobIds.forEach(id => this.fetchJob(id));
  }

  /**
   * Unsubscribe from a job
   */
  unsubscribeJob(jobId: string): void {
    this.subscribedJobIds.delete(jobId);
    this.log(`Unsubscribed from job: ${jobId}`);
  }

  /**
   * Get subscribed job IDs
   */
  getSubscribedJobIds(): string[] {
    return Array.from(this.subscribedJobIds);
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private startPolling(): void {
    this.stopPolling();

    this.pollTimer = setInterval(() => {
      this.pollAllJobs();
    }, this.config.pollInterval);

    // Poll immediately
    this.pollAllJobs();
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollAllJobs(): Promise<void> {
    if (this.subscribedJobIds.size === 0) return;

    const jobIds = Array.from(this.subscribedJobIds);

    for (const jobId of jobIds) {
      try {
        await this.fetchJob(jobId);
      } catch (error) {
        this.log(`Error polling job ${jobId}:`, error);
      }
    }
  }

  private async fetchJob(jobId: string): Promise<void> {
    try {
      const url = `${this.config.baseUrl}/v1/jobs/${jobId}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(url, { headers });

      if (response.ok) {
        const data = await response.json();
        const job = this.parseJob(data);

        // Determine event type based on status
        const eventType = this.getEventType(job.status);
        this.emit(eventType, job);

        // Auto-unsubscribe from terminal jobs
        if (this.isTerminal(job.status)) {
          this.subscribedJobIds.delete(jobId);
          this.log(`Job ${jobId} reached terminal state, unsubscribed`);
        }
      } else if (response.status === 404) {
        // Job not found, unsubscribe
        this.subscribedJobIds.delete(jobId);
        this.log(`Job ${jobId} not found, unsubscribed`);
      } else {
        this.log(`Failed to fetch job ${jobId}: ${response.status}`);
      }
    } catch (error) {
      this.log(`Error fetching job ${jobId}:`, error);
    }
  }

  private parseJob(data: Record<string, unknown>): SeennJob {
    return {
      jobId: data.id as string,
      userId: data.userId as string,
      appId: data.appId as string,
      status: data.status as SeennJob['status'],
      title: (data.title as string) || '',
      jobType: (data.jobType as string) || 'job',
      workflowId: data.workflowId as string | undefined,
      progress: (data.progress as number) || 0,
      message: data.message as string | undefined,
      stage: data.stage as SeennJob['stage'],
      estimatedCompletionAt: data.estimatedCompletionAt as string | undefined,
      etaConfidence: data.etaConfidence as number | undefined,
      etaBasedOn: data.etaBasedOn as number | undefined,
      queue: data.queue as SeennJob['queue'],
      result: data.result as SeennJob['result'],
      error: data.error as SeennJob['error'],
      metadata: data.metadata as Record<string, unknown> | undefined,
      parent: data.parent as SeennJob['parent'],
      children: data.children as SeennJob['children'],
      childProgressMode: data.childProgressMode as SeennJob['childProgressMode'],
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
      startedAt: data.startedAt as string | undefined,
      completedAt: data.completedAt as string | undefined,
    };
  }

  private getEventType(status: string): string {
    switch (status) {
      case 'completed': return 'job.completed';
      case 'failed': return 'job.failed';
      case 'cancelled': return 'job.cancelled';
      case 'running': return 'job.progress';
      case 'pending': return 'job.started';
      case 'queued': return 'job.started';
      default: return 'job.progress';
    }
  }

  private isTerminal(status: string): boolean {
    return ['completed', 'failed', 'cancelled'].includes(status);
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connectionStateChange', state);
      this.log(`Connection state: ${state}`);
    }
  }

  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[SeennPolling] ${message}`, data || '');
    }
  }
}
