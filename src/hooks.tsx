// Seenn React Native SDK - React Hooks
// MIT License - Open Source

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Seenn } from './Seenn';
import type { SeennJob, ConnectionState } from './types';

/**
 * Format milliseconds to human readable string
 */
function formatEtaTime(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

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

/**
 * Result from useEtaCountdown hook
 */
export interface EtaCountdownResult {
  /** Remaining time in milliseconds (null if no ETA) */
  remaining: number | null;
  /** Formatted remaining time string (e.g., "2m 30s") */
  formatted: string | null;
  /** Whether job is past its ETA but still running */
  isPastDue: boolean;
  /** ETA confidence score (0.0 - 1.0) */
  confidence: number | null;
  /** Number of historical jobs used to calculate ETA */
  basedOn: number | null;
}

/**
 * Hook to get smooth ETA countdown for a job
 *
 * Updates every second for smooth countdown, syncs with server ETA updates.
 *
 * @example
 * ```tsx
 * function JobProgress({ seenn, jobId }) {
 *   const job = useSeennJob(seenn, jobId);
 *   const eta = useEtaCountdown(job);
 *
 *   return (
 *     <View>
 *       <ProgressBar progress={job?.progress || 0} />
 *       {eta.remaining !== null && (
 *         <Text>~{eta.formatted} remaining</Text>
 *       )}
 *       {eta.isPastDue && (
 *         <Text>Taking longer than expected...</Text>
 *       )}
 *       {eta.confidence !== null && eta.confidence < 0.5 && (
 *         <Text style={{ opacity: 0.6 }}>(estimate may vary)</Text>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useEtaCountdown(job: SeennJob | null): EtaCountdownResult {
  const [remaining, setRemaining] = useState<number | null>(null);

  // Calculate initial remaining time from job's ETA
  const calculateRemaining = useCallback(() => {
    if (!job?.estimatedCompletionAt) return null;
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return null;
    }
    const eta = new Date(job.estimatedCompletionAt).getTime();
    return Math.max(0, eta - Date.now());
  }, [job?.estimatedCompletionAt, job?.status]);

  // Sync with server ETA when it changes
  useEffect(() => {
    setRemaining(calculateRemaining());
  }, [calculateRemaining]);

  // Smooth countdown every second
  useEffect(() => {
    if (remaining === null || remaining <= 0) return;

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return null;
        return Math.max(0, prev - 1000);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining !== null && remaining > 0]);

  // Check if past due (ETA reached but job still running)
  const isPastDue = useMemo(() => {
    if (!job?.estimatedCompletionAt) return false;
    if (job.status !== 'running' && job.status !== 'pending') return false;
    return remaining === 0;
  }, [job?.estimatedCompletionAt, job?.status, remaining]);

  // Format remaining time
  const formatted = useMemo(() => {
    if (remaining === null) return null;
    return formatEtaTime(remaining);
  }, [remaining]);

  return {
    remaining,
    formatted,
    isPastDue,
    confidence: job?.etaConfidence ?? null,
    basedOn: job?.etaBasedOn ?? null,
  };
}

// ============================================
// Parent-Child Hooks
// ============================================

/**
 * Result from useParentJob hook
 */
export interface ParentJobResult {
  /** The parent job (null if not found or not a parent) */
  job: SeennJob | null;
  /** Whether this job is a parent job */
  isParent: boolean;
  /** Children stats (completed, failed, running, pending, total) */
  childStats: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  } | null;
  /** Overall progress (0-100) */
  progress: number;
  /** Whether all children have completed (successfully or failed) */
  allChildrenDone: boolean;
  /** Whether all children completed successfully */
  allChildrenSuccess: boolean;
  /** Whether any child has failed */
  hasFailedChildren: boolean;
}

/**
 * Hook to subscribe to a parent job with children helpers
 *
 * @example
 * ```tsx
 * function BatchProgress({ seenn, batchJobId }) {
 *   const { job, childStats, allChildrenSuccess, progress } = useParentJob(seenn, batchJobId);
 *
 *   if (!job) return <Text>Loading...</Text>;
 *
 *   return (
 *     <View>
 *       <Text>{job.title}</Text>
 *       <ProgressBar progress={progress} />
 *       {childStats && (
 *         <Text>
 *           {childStats.completed}/{childStats.total} completed
 *         </Text>
 *       )}
 *       {allChildrenSuccess && <Text>All done!</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useParentJob(seenn: Seenn, parentJobId: string): ParentJobResult {
  const job = useSeennJob(seenn, parentJobId);

  const result = useMemo((): ParentJobResult => {
    if (!job) {
      return {
        job: null,
        isParent: false,
        childStats: null,
        progress: 0,
        allChildrenDone: false,
        allChildrenSuccess: false,
        hasFailedChildren: false,
      };
    }

    const isParent = job.children !== undefined;
    const childStats = job.children ?? null;

    let allChildrenDone = false;
    let allChildrenSuccess = false;
    let hasFailedChildren = false;

    if (childStats) {
      const doneCount = childStats.completed + childStats.failed;
      allChildrenDone = doneCount === childStats.total;
      allChildrenSuccess = childStats.completed === childStats.total;
      hasFailedChildren = childStats.failed > 0;
    }

    return {
      job,
      isParent,
      childStats,
      progress: job.progress,
      allChildrenDone,
      allChildrenSuccess,
      hasFailedChildren,
    };
  }, [job]);

  return result;
}

/**
 * Result from useChildJob hook
 */
export interface ChildJobResult {
  /** The child job (null if not found or not a child) */
  job: SeennJob | null;
  /** Whether this job is a child job */
  isChild: boolean;
  /** Parent job ID (if this is a child) */
  parentJobId: string | null;
  /** Child index within parent (0-based) */
  childIndex: number | null;
  /** Whether this child job has completed */
  isComplete: boolean;
  /** Whether this child job has failed */
  isFailed: boolean;
}

/**
 * Hook to subscribe to a child job with parent helpers
 *
 * @example
 * ```tsx
 * function ChildJobCard({ seenn, childJobId }) {
 *   const { job, parentJobId, childIndex, isComplete } = useChildJob(seenn, childJobId);
 *
 *   if (!job) return null;
 *
 *   return (
 *     <View>
 *       <Text>#{childIndex + 1}: {job.title}</Text>
 *       <ProgressBar progress={job.progress} />
 *       {isComplete && <Icon name="check" />}
 *     </View>
 *   );
 * }
 * ```
 */
export function useChildJob(seenn: Seenn, childJobId: string): ChildJobResult {
  const job = useSeennJob(seenn, childJobId);

  const result = useMemo((): ChildJobResult => {
    if (!job) {
      return {
        job: null,
        isChild: false,
        parentJobId: null,
        childIndex: null,
        isComplete: false,
        isFailed: false,
      };
    }

    const isChild = job.parent !== undefined;

    return {
      job,
      isChild,
      parentJobId: job.parent?.parentJobId ?? null,
      childIndex: job.parent?.childIndex ?? null,
      isComplete: job.status === 'completed',
      isFailed: job.status === 'failed',
    };
  }, [job]);

  return result;
}

/**
 * Hook to subscribe to multiple specific jobs by ID
 *
 * Useful for watching all children of a parent job.
 *
 * @example
 * ```tsx
 * function ChildrenList({ seenn, childJobIds }) {
 *   const childJobs = useJobsByIds(seenn, childJobIds);
 *
 *   return (
 *     <View>
 *       {childJobs.map((job) => (
 *         <ChildJobCard key={job.jobId} job={job} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useJobsByIds(seenn: Seenn, jobIds: string[]): SeennJob[] {
  const allJobs = useSeennJobs(seenn);

  const filteredJobs = useMemo(() => {
    if (!jobIds || jobIds.length === 0) return [];

    return jobIds
      .map((id) => allJobs.get(id))
      .filter((job): job is SeennJob => job !== undefined);
  }, [allJobs, jobIds]);

  return filteredJobs;
}
