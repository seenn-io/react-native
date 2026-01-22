/**
 * useExpoLiveActivity Hook
 *
 * Auto-syncs job state with iOS Live Activity for Expo projects.
 * Uses expo-live-activity package under the hood.
 *
 * @example
 * ```tsx
 * import { useSeennJob, useExpoLiveActivity } from '@seenn/react-native';
 *
 * function JobScreen({ jobId }) {
 *   const job = useSeennJob(seenn, jobId);
 *
 *   // Auto-sync with Live Activity
 *   const { isActive, isSupported } = useExpoLiveActivity(job, {
 *     autoStart: true,
 *     autoEnd: true,
 *   });
 *
 *   return <JobProgress job={job} />;
 * }
 * ```
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SeennJob } from '../types';
import {
  ExpoLiveActivity,
  isExpoLiveActivityAvailable,
  startExpoLiveActivity,
  updateExpoLiveActivity,
  stopExpoLiveActivity,
} from '../expo/ExpoLiveActivity';

export interface UseExpoLiveActivityOptions {
  /**
   * Automatically start Live Activity when job status becomes 'running'
   * @default true
   */
  autoStart?: boolean;

  /**
   * Automatically end Live Activity when job completes or fails
   * @default true
   */
  autoEnd?: boolean;

  /**
   * Custom colors for the Live Activity UI
   */
  colors?: {
    backgroundColor?: string;
    titleColor?: string;
    subtitleColor?: string;
    progressTint?: string;
  };

  /**
   * Deep link URL to open when user taps the Live Activity
   */
  deepLinkUrl?: string;

  /**
   * Called when Live Activity starts
   */
  onStart?: (activityId: string) => void;

  /**
   * Called when Live Activity ends
   */
  onEnd?: () => void;

  /**
   * Called when an error occurs
   */
  onError?: (error: Error) => void;
}

export interface UseExpoLiveActivityResult {
  /**
   * Whether Live Activity is currently active
   */
  isActive: boolean;

  /**
   * Whether expo-live-activity is available
   */
  isSupported: boolean;

  /**
   * Current activity ID (null if not active)
   */
  activityId: string | null;

  /**
   * Manually start the Live Activity
   */
  start: () => Promise<void>;

  /**
   * Manually stop the Live Activity
   */
  stop: () => Promise<void>;
}

export function useExpoLiveActivity(
  job: SeennJob | null,
  options: UseExpoLiveActivityOptions = {}
): UseExpoLiveActivityResult {
  const {
    autoStart = true,
    autoEnd = true,
    colors,
    deepLinkUrl,
    onStart,
    onEnd,
    onError,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isSupported] = useState(() => isExpoLiveActivityAvailable());

  const prevStatusRef = useRef<string | null>(null);
  const prevProgressRef = useRef<number | null>(null);

  // Manual start
  const start = useCallback(async () => {
    if (!isSupported || !job || isActive) return;

    try {
      const id = await startExpoLiveActivity(job, {
        backgroundColor: colors?.backgroundColor,
        titleColor: colors?.titleColor,
        subtitleColor: colors?.subtitleColor,
        progressViewTint: colors?.progressTint,
        deepLinkUrl,
      });

      if (id) {
        setActivityId(id);
        setIsActive(true);
        onStart?.(id);
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [isSupported, job, isActive, colors, deepLinkUrl, onStart, onError]);

  // Manual stop
  const stop = useCallback(async () => {
    if (!activityId) return;

    try {
      await stopExpoLiveActivity(activityId, job || undefined);
      setActivityId(null);
      setIsActive(false);
      onEnd?.();
    } catch (error) {
      onError?.(error as Error);
    }
  }, [activityId, job, onEnd, onError]);

  // Auto-start when job starts running
  useEffect(() => {
    if (!autoStart || !isSupported || !job) return;

    const currentStatus = job.status;
    const prevStatus = prevStatusRef.current;

    // Start when transitioning to 'running'
    if (currentStatus === 'running' && prevStatus !== 'running' && !isActive) {
      start();
    }

    prevStatusRef.current = currentStatus;
  }, [job?.status, autoStart, isSupported, isActive, start]);

  // Auto-update on progress/message changes
  useEffect(() => {
    if (!isActive || !activityId || !job) return;

    const currentProgress = job.progress;
    const prevProgress = prevProgressRef.current;

    // Update if progress changed
    if (currentProgress !== prevProgress) {
      updateExpoLiveActivity(activityId, job);
      prevProgressRef.current = currentProgress;
    }
  }, [isActive, activityId, job?.progress, job?.message, job?.stage]);

  // Auto-end when job completes or fails
  useEffect(() => {
    if (!autoEnd || !isActive || !job) return;

    if (job.status === 'completed' || job.status === 'failed') {
      stop();
    }
  }, [job?.status, autoEnd, isActive, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityId) {
        stopExpoLiveActivity(activityId).catch(() => {});
      }
    };
  }, [activityId]);

  return {
    isActive,
    isSupported,
    activityId,
    start,
    stop,
  };
}
