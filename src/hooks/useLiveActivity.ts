// Seenn React Native SDK - useLiveActivity Hook
// MIT License - Open Source

import { useEffect, useRef, useCallback, useState } from 'react';
import { LiveActivity } from '../native/LiveActivity';
import type { SeennJob } from '../types';

export interface UseLiveActivityOptions {
  /**
   * Automatically start Live Activity when job starts running
   * @default false
   */
  autoStart?: boolean;

  /**
   * Automatically end Live Activity when job completes/fails
   * @default true
   */
  autoEnd?: boolean;

  /**
   * Seconds to keep Live Activity on screen after ending
   * @default 300 (5 minutes)
   */
  dismissAfter?: number;

  /**
   * Called when Live Activity push token is received
   * Use this to send the token to your backend for push updates
   */
  onPushToken?: (token: string) => void;
}

export interface UseLiveActivityResult {
  /**
   * Whether a Live Activity is currently active for this job
   */
  isActive: boolean;

  /**
   * Whether Live Activities are supported on this device
   */
  isSupported: boolean;

  /**
   * Manually start the Live Activity
   * Returns true if started successfully
   */
  start: () => Promise<boolean>;

  /**
   * Manually end the Live Activity
   * Returns true if ended successfully
   */
  end: () => Promise<boolean>;

  /**
   * Manually update the Live Activity with current job state
   * Returns true if updated successfully
   */
  sync: () => Promise<boolean>;
}

/**
 * React hook to sync a Seenn job with iOS Live Activity
 *
 * @param job - The job to track (from useSeennJob)
 * @param options - Configuration options
 * @returns Live Activity control functions and state
 *
 * @example
 * ```tsx
 * function JobScreen({ jobId }) {
 *   const seenn = useSeenn();
 *   const job = useSeennJob(seenn, jobId);
 *
 *   // Auto-sync mode (recommended)
 *   const { isActive, isSupported } = useLiveActivity(job, {
 *     autoStart: true,
 *     autoEnd: true,
 *     onPushToken: (token) => sendTokenToBackend(jobId, token),
 *   });
 *
 *   return (
 *     <View>
 *       <Text>{job?.title}</Text>
 *       <Text>Progress: {job?.progress}%</Text>
 *       {isSupported && (
 *         <Text>Live Activity: {isActive ? 'Active' : 'Inactive'}</Text>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Manual control mode
 * function JobScreen({ jobId }) {
 *   const job = useSeennJob(seenn, jobId);
 *   const { start, end, isActive } = useLiveActivity(job);
 *
 *   return (
 *     <View>
 *       <Button
 *         title={isActive ? "Hide from Lock Screen" : "Show on Lock Screen"}
 *         onPress={isActive ? end : start}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useLiveActivity(
  job: SeennJob | null,
  options: UseLiveActivityOptions = {}
): UseLiveActivityResult {
  const {
    autoStart = false,
    autoEnd = true,
    dismissAfter = 300,
    onPushToken,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const prevStatusRef = useRef<string | null>(null);
  const jobIdRef = useRef<string | null>(null);

  // Check support on mount
  useEffect(() => {
    LiveActivity.isSupported().then(setIsSupported);
  }, []);

  // Subscribe to push token events
  useEffect(() => {
    if (!onPushToken || !job) return;

    const unsubscribe = LiveActivity.onPushToken((event) => {
      if (event.jobId === job.jobId) {
        onPushToken(event.token);
      }
    });

    return unsubscribe;
  }, [job?.jobId, onPushToken]);

  // Sync with job state
  useEffect(() => {
    if (!job || !isSupported) return;

    const syncActivity = async () => {
      const prevStatus = prevStatusRef.current;
      const currentStatus = job.status;
      const isNewJob = jobIdRef.current !== job.jobId;

      // Track job ID
      jobIdRef.current = job.jobId;

      // Check if activity is still active (might have been dismissed by user)
      const stillActive = await LiveActivity.isActive(job.jobId);
      if (isActive && !stillActive) {
        setIsActive(false);
      }

      // Auto-start when job starts running
      if (autoStart && currentStatus === 'running') {
        if (isNewJob || prevStatus !== 'running') {
          if (!stillActive) {
            const result = await LiveActivity.start({
              jobId: job.jobId,
              title: job.title,
              jobType: job.jobType,
              initialProgress: job.progress,
              initialMessage: job.message,
            });
            setIsActive(result.success);
          }
        }
      }

      // Update progress while running
      if (currentStatus === 'running' && stillActive) {
        await LiveActivity.update({
          jobId: job.jobId,
          progress: job.progress,
          status: currentStatus,
          message: job.message,
          stageName: job.stage?.name,
          stageIndex: job.stage?.current,
          stageTotal: job.stage?.total,
          estimatedEndTime: job.estimatedCompletionAt
            ? Math.floor(new Date(job.estimatedCompletionAt).getTime() / 1000)
            : undefined,
        });
      }

      // Auto-end when job completes/fails
      if (autoEnd && stillActive) {
        if (currentStatus === 'completed' || currentStatus === 'failed') {
          await LiveActivity.end({
            jobId: job.jobId,
            finalStatus: currentStatus,
            finalProgress: job.progress,
            message: job.message,
            resultUrl: job.result?.url,
            errorMessage: job.error?.message,
            dismissAfter,
          });
          setIsActive(false);
        }
      }

      prevStatusRef.current = currentStatus;
    };

    syncActivity();
  }, [job, autoStart, autoEnd, dismissAfter, isSupported, isActive]);

  // Manual start
  const start = useCallback(async (): Promise<boolean> => {
    if (!job || !isSupported) return false;

    const result = await LiveActivity.start({
      jobId: job.jobId,
      title: job.title,
      jobType: job.jobType,
      initialProgress: job.progress,
      initialMessage: job.message,
    });

    setIsActive(result.success);
    return result.success;
  }, [job, isSupported]);

  // Manual end
  const end = useCallback(async (): Promise<boolean> => {
    if (!job || !isActive) return false;

    const success = await LiveActivity.end({
      jobId: job.jobId,
      finalStatus: job.status as 'completed' | 'failed' | 'cancelled',
      finalProgress: job.progress,
      message: job.message,
      resultUrl: job.result?.url,
      errorMessage: job.error?.message,
      dismissAfter,
    });

    if (success) {
      setIsActive(false);
    }
    return success;
  }, [job, isActive, dismissAfter]);

  // Manual sync (force update)
  const sync = useCallback(async (): Promise<boolean> => {
    if (!job || !isActive) return false;

    return LiveActivity.update({
      jobId: job.jobId,
      progress: job.progress,
      status: job.status as 'pending' | 'running' | 'completed' | 'failed',
      message: job.message,
      stageName: job.stage?.name,
      stageIndex: job.stage?.current,
      stageTotal: job.stage?.total,
    });
  }, [job, isActive]);

  return {
    isActive,
    isSupported,
    start,
    end,
    sync,
  };
}

export default useLiveActivity;
