// Seenn React Native SDK - React Hooks
// MIT License - Open Source

import { useState, useEffect, useRef } from 'react';
import type { Seenn } from './Seenn';
import type { SeennJob, ConnectionState } from './types';

/**
 * Hook to subscribe to a specific job
 *
 * @example
 * const job = useSeennJob(seenn, 'job_123');
 * if (job) {
 *   console.log(`Progress: ${job.progress}%`);
 * }
 */
export function useSeennJob(seenn: Seenn, jobId: string): SeennJob | null {
  const [job, setJob] = useState<SeennJob | null>(() => seenn.getJob(jobId));

  useEffect(() => {
    const unsubscribe = seenn.subscribeToJob(jobId, (updatedJob) => {
      setJob(updatedJob);
    });

    return unsubscribe;
  }, [seenn, jobId]);

  return job;
}

/**
 * Hook to subscribe to all jobs
 *
 * @example
 * const jobs = useSeennJobs(seenn);
 * console.log(`Total jobs: ${jobs.size}`);
 * jobs.forEach((job) => {
 *   console.log(`${job.jobId}: ${job.status}`);
 * });
 */
export function useSeennJobs(seenn: Seenn): Map<string, SeennJob> {
  const [jobs, setJobs] = useState<Map<string, SeennJob>>(() => seenn.getAllJobs());

  useEffect(() => {
    const unsubscribe = seenn.subscribeToAllJobs((updatedJobs) => {
      setJobs(new Map(updatedJobs));
    });

    return unsubscribe;
  }, [seenn]);

  return jobs;
}

/**
 * Hook to subscribe to connection state
 *
 * @example
 * const connectionState = useSeennConnectionState(seenn);
 * if (connectionState === 'connected') {
 *   console.log('Connected to Seenn');
 * }
 */
export function useSeennConnectionState(seenn: Seenn): ConnectionState {
  const [state, setState] = useState<ConnectionState>(() => seenn.getConnectionState());

  useEffect(() => {
    const unsubscribe = seenn.subscribeToConnectionState((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [seenn]);

  return state;
}

/**
 * Hook to track job progress with optional callbacks
 *
 * @example
 * useSeennJobProgress(seenn, 'job_123', {
 *   onProgress: (job) => console.log(`${job.progress}%`),
 *   onComplete: (job) => console.log('Done!', job.result),
 *   onFailed: (job) => console.error('Failed', job.error),
 * });
 */
export function useSeennJobProgress(
  seenn: Seenn,
  jobId: string,
  callbacks?: {
    onProgress?: (job: SeennJob) => void;
    onComplete?: (job: SeennJob) => void;
    onFailed?: (job: SeennJob) => void;
    onCancelled?: (job: SeennJob) => void;
  }
): SeennJob | null {
  const job = useSeennJob(seenn, jobId);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!job) return;

    const prevStatus = prevStatusRef.current;
    const currentStatus = job.status;

    // Only trigger callbacks on status change
    if (prevStatus !== currentStatus) {
      if (currentStatus === 'running' && callbacks?.onProgress) {
        callbacks.onProgress(job);
      } else if (currentStatus === 'completed' && callbacks?.onComplete) {
        callbacks.onComplete(job);
      } else if (currentStatus === 'failed' && callbacks?.onFailed) {
        callbacks.onFailed(job);
      } else if (currentStatus === 'cancelled' && callbacks?.onCancelled) {
        callbacks.onCancelled(job);
      }
    }

    // Always trigger onProgress for progress updates (even if status is same)
    if (currentStatus === 'running' && callbacks?.onProgress) {
      callbacks.onProgress(job);
    }

    prevStatusRef.current = currentStatus;
  }, [job, callbacks]);

  return job;
}

/**
 * Hook to get jobs filtered by status
 *
 * @example
 * const runningJobs = useSeennJobsByStatus(seenn, 'running');
 * console.log(`${runningJobs.length} jobs running`);
 */
export function useSeennJobsByStatus(seenn: Seenn, status: SeennJob['status']): SeennJob[] {
  const jobs = useSeennJobs(seenn);

  const [filteredJobs, setFilteredJobs] = useState<SeennJob[]>(() => {
    return Array.from(jobs.values()).filter((job) => job.status === status);
  });

  useEffect(() => {
    const filtered = Array.from(jobs.values()).filter((job) => job.status === status);
    setFilteredJobs(filtered);
  }, [jobs, status]);

  return filteredJobs;
}
