// Seenn React Native SDK - State Manager
// MIT License - Open Source

import EventEmitter from 'eventemitter3';
import type { SeennJob, ConnectionState } from '../types';

/**
 * Simple observable pattern (similar to RxDart's BehaviorSubject)
 * Keeps the last value and emits to new subscribers
 */
export class BehaviorSubject<T> extends EventEmitter {
  private _value: T;

  constructor(initialValue: T) {
    super();
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  next(value: T): void {
    this._value = value;
    this.emit('value', value);
  }

  subscribe(callback: (value: T) => void): () => void {
    // Emit current value immediately
    callback(this._value);

    // Listen for future updates
    this.on('value', callback);

    // Return unsubscribe function
    return () => {
      this.off('value', callback);
    };
  }

  dispose(): void {
    this.removeAllListeners();
  }
}

/**
 * State Manager for Seenn SDK
 * Manages jobs and connection state
 */
export class StateManager {
  private jobs = new Map<string, BehaviorSubject<SeennJob | null>>();
  private allJobs = new BehaviorSubject<Map<string, SeennJob>>(new Map());
  private connectionState = new BehaviorSubject<ConnectionState>('disconnected');

  /**
   * Get or create a BehaviorSubject for a job
   */
  getJob$(jobId: string): BehaviorSubject<SeennJob | null> {
    if (!this.jobs.has(jobId)) {
      this.jobs.set(jobId, new BehaviorSubject<SeennJob | null>(null));
    }
    return this.jobs.get(jobId)!;
  }

  /**
   * Update a job
   */
  updateJob(job: SeennJob): void {
    // Update individual job subject
    const job$ = this.getJob$(job.jobId);
    job$.next(job);

    // Update all jobs map
    const currentJobs = new Map(this.allJobs.value);
    currentJobs.set(job.jobId, job);
    this.allJobs.next(currentJobs);
  }

  /**
   * Remove a job
   */
  removeJob(jobId: string): void {
    // Remove from individual job subject
    const job$ = this.jobs.get(jobId);
    if (job$) {
      job$.next(null);
      job$.dispose();
      this.jobs.delete(jobId);
    }

    // Remove from all jobs map
    const currentJobs = new Map(this.allJobs.value);
    currentJobs.delete(jobId);
    this.allJobs.next(currentJobs);
  }

  /**
   * Get all jobs as observable
   */
  getAllJobs$(): BehaviorSubject<Map<string, SeennJob>> {
    return this.allJobs;
  }

  /**
   * Get connection state as observable
   */
  getConnectionState$(): BehaviorSubject<ConnectionState> {
    return this.connectionState;
  }

  /**
   * Update connection state
   */
  setConnectionState(state: ConnectionState): void {
    this.connectionState.next(state);
  }

  /**
   * Get current job (synchronous)
   */
  getJob(jobId: string): SeennJob | null {
    return this.getJob$(jobId).value;
  }

  /**
   * Get all jobs (synchronous)
   */
  getAllJobs(): Map<string, SeennJob> {
    return this.allJobs.value;
  }

  /**
   * Clear all state
   */
  clear(): void {
    // Dispose all job subjects
    this.jobs.forEach((job$) => {
      job$.dispose();
    });
    this.jobs.clear();

    // Reset all jobs map
    this.allJobs.next(new Map());
  }

  /**
   * Dispose all subjects
   */
  dispose(): void {
    this.clear();
    this.connectionState.dispose();
    this.allJobs.dispose();
  }
}
