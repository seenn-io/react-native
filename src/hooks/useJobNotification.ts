// Seenn React Native SDK - Cross-Platform Job Notification Hook
// MIT License - Open Source

import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { SeennJob } from '@seenn/types';
import { JobNotification } from '../native/JobNotification';

export interface UseJobNotificationOptions {
  /** Whether to automatically sync notification with job state (default: true) */
  autoSync?: boolean;
  /** Custom title (defaults to job.title) */
  title?: string;
  /** Dismiss delay after completion in ms (default: 5000 on Android, 300000 on iOS) */
  dismissAfter?: number;
}

export interface UseJobNotificationResult {
  /** Whether job notification is supported on this device */
  isSupported: boolean;
  /** Whether notification is currently active for this job */
  isActive: boolean;
  /** Start notification manually */
  start: () => Promise<boolean>;
  /** Update notification manually */
  update: () => Promise<boolean>;
  /** End notification manually */
  end: (status?: 'completed' | 'failed' | 'cancelled') => Promise<boolean>;
  /** Cancel notification without ending animation */
  cancel: () => Promise<boolean>;
  /** Current platform */
  platform: 'ios' | 'android' | 'other';
}

/**
 * Hook for automatic job notification management on both iOS and Android
 *
 * Automatically syncs notification/activity state with job progress:
 * - iOS: Live Activity (Lock Screen, Dynamic Island)
 * - Android: Ongoing Notification (persistent notification drawer)
 *
 * @param job - SeennJob object to track (or null when not tracking)
 * @param options - Configuration options
 * @returns Notification state and control functions
 *
 * @example
 * ```tsx
 * import { useJob, useJobNotification } from '@seenn/react-native';
 *
 * function JobScreen({ jobId }: { jobId: string }) {
 *   const { job } = useJob(jobId);
 *
 *   // Auto-sync notification with job state
 *   const { isActive, isSupported } = useJobNotification(job);
 *
 *   return (
 *     <View>
 *       <Text>{job?.title}</Text>
 *       <Text>Progress: {job?.progress}%</Text>
 *       {isSupported && <Text>Notification: {isActive ? 'Active' : 'Inactive'}</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useJobNotification(
  job: SeennJob | null | undefined,
  options: UseJobNotificationOptions = {}
): UseJobNotificationResult {
  const { autoSync = true, title, dismissAfter } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const isStartedRef = useRef(false);
  const lastStatusRef = useRef<string | null>(null);

  // Check support on mount
  useEffect(() => {
    JobNotification.isSupported().then(setIsSupported);
  }, []);

  // Get default dismiss delay based on platform
  const getDismissAfter = useCallback(() => {
    if (dismissAfter !== undefined) return dismissAfter;
    // iOS uses seconds, Android uses milliseconds
    return Platform.OS === 'ios' ? 300 : 5000;
  }, [dismissAfter]);

  // Start notification
  const start = useCallback(async (): Promise<boolean> => {
    if (!job || !isSupported) return false;

    const result = await JobNotification.start({
      jobId: job.jobId,
      title: title || job.title,
      jobType: job.jobType,
      initialProgress: job.progress,
      initialMessage: job.message,
    });

    if (result.success) {
      isStartedRef.current = true;
      setIsActive(true);
    }

    return result.success;
  }, [job, isSupported, title]);

  // Update notification
  const update = useCallback(async (): Promise<boolean> => {
    if (!job || !isActive) return false;

    return JobNotification.update({
      jobId: job.jobId,
      progress: job.progress,
      status: job.status as 'pending' | 'running' | 'completed' | 'failed',
      message: job.message,
      stageName: job.stage?.name,
      stageIndex: job.stage?.current,
      stageTotal: job.stage?.total,
      estimatedEndTime: job.estimatedCompletionAt
        ? Math.floor(new Date(job.estimatedCompletionAt).getTime() / 1000)
        : undefined,
    });
  }, [job, isActive]);

  // End notification
  const end = useCallback(
    async (status?: 'completed' | 'failed' | 'cancelled'): Promise<boolean> => {
      if (!job) return false;

      const finalStatus = status || (job.status === 'completed' ? 'completed' : job.status === 'failed' ? 'failed' : 'cancelled');

      const result = await JobNotification.end({
        jobId: job.jobId,
        finalStatus,
        finalProgress: job.progress,
        message: job.message,
        resultUrl: job.result?.url,
        errorMessage: job.error?.message,
        dismissAfter: getDismissAfter(),
      });

      if (result) {
        isStartedRef.current = false;
        setIsActive(false);
      }

      return result;
    },
    [job, getDismissAfter]
  );

  // Cancel notification
  const cancel = useCallback(async (): Promise<boolean> => {
    if (!job) return false;

    const result = await JobNotification.cancel(job.jobId);

    if (result) {
      isStartedRef.current = false;
      setIsActive(false);
    }

    return result;
  }, [job]);

  // Auto-sync effect
  useEffect(() => {
    if (!autoSync || !job || !isSupported) return;

    const syncNotification = async () => {
      const jobId = job.jobId;
      const status = job.status;

      // Check if notification is active
      const currentlyActive = await JobNotification.isActive(jobId);
      setIsActive(currentlyActive);

      // Start notification if job is running and not started
      if ((status === 'pending' || status === 'running') && !isStartedRef.current) {
        await start();
      }
      // Update if running and already started
      else if (status === 'running' && isStartedRef.current) {
        await update();
      }
      // End if completed/failed and was started
      else if ((status === 'completed' || status === 'failed') && isStartedRef.current) {
        if (lastStatusRef.current !== status) {
          await end(status);
        }
      }

      lastStatusRef.current = status;
    };

    syncNotification();
  }, [job, autoSync, isSupported, start, update, end]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't cancel on unmount - let the notification persist
      // User can call cancel() explicitly if needed
    };
  }, []);

  return {
    isSupported,
    isActive,
    start,
    update,
    end,
    cancel,
    platform: JobNotification.platform,
  };
}

export default useJobNotification;
