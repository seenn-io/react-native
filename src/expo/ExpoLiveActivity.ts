/**
 * Expo Live Activity Integration
 *
 * This module provides Live Activity support for Expo projects using
 * the expo-live-activity package from Software Mansion.
 *
 * Requirements:
 * - expo-live-activity package installed
 * - Expo SDK 50+
 * - iOS 16.2+
 * - Expo Dev Client (not Expo Go)
 *
 * @see https://github.com/software-mansion-labs/expo-live-activity
 */

import { Platform } from 'react-native';
import type { SeennJob } from '../types';

// Types for expo-live-activity (optional peer dependency)
interface ExpoLiveActivityState {
  title: string;
  subtitle?: string;
  progressBar?: {
    progress: number; // 0-1
  };
  imageName?: string;
}

interface ExpoLiveActivityConfig {
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  progressViewTint?: string;
  deepLinkUrl?: string;
}

// Lazy load expo-live-activity to avoid crashes when not installed
let expoLiveActivity: any = null;

function getExpoLiveActivity() {
  if (expoLiveActivity === null) {
    try {
      expoLiveActivity = require('expo-live-activity');
    } catch (e) {
      console.warn(
        '[@seenn/react-native] expo-live-activity not installed. ' +
          'Install it with: npx expo install expo-live-activity'
      );
      expoLiveActivity = false;
    }
  }
  return expoLiveActivity || null;
}

/**
 * Check if expo-live-activity is available
 */
export function isExpoLiveActivityAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  return getExpoLiveActivity() !== null;
}

/**
 * Start a Live Activity using expo-live-activity
 */
export async function startExpoLiveActivity(
  job: SeennJob,
  config?: ExpoLiveActivityConfig
): Promise<string | null> {
  const lib = getExpoLiveActivity();
  if (!lib) return null;

  try {
    const state: ExpoLiveActivityState = {
      title: job.title,
      subtitle: job.message || getStatusMessage(job.status),
      progressBar: {
        progress: (job.progress || 0) / 100, // Convert 0-100 to 0-1
      },
    };

    const result = await lib.startActivity(state, {
      backgroundColor: config?.backgroundColor || '#1c1c1e',
      titleColor: config?.titleColor || '#ffffff',
      subtitleColor: config?.subtitleColor || '#9ca3af',
      progressViewTint: config?.progressViewTint || '#3b82f6',
      deepLinkUrl: config?.deepLinkUrl,
      ...config,
    });

    return result?.id || null;
  } catch (error) {
    console.error('[@seenn/react-native] Failed to start Expo Live Activity:', error);
    return null;
  }
}

/**
 * Update a Live Activity using expo-live-activity
 */
export async function updateExpoLiveActivity(
  activityId: string,
  job: SeennJob
): Promise<boolean> {
  const lib = getExpoLiveActivity();
  if (!lib) return false;

  try {
    const state: ExpoLiveActivityState = {
      title: job.title,
      subtitle: job.message || getStageMessage(job) || getStatusMessage(job.status),
      progressBar: {
        progress: (job.progress || 0) / 100,
      },
    };

    await lib.updateActivity(activityId, state);
    return true;
  } catch (error) {
    console.error('[@seenn/react-native] Failed to update Expo Live Activity:', error);
    return false;
  }
}

/**
 * Stop a Live Activity using expo-live-activity
 */
export async function stopExpoLiveActivity(
  activityId: string,
  job?: SeennJob
): Promise<boolean> {
  const lib = getExpoLiveActivity();
  if (!lib) return false;

  try {
    const finalState: ExpoLiveActivityState = {
      title: job?.title || 'Completed',
      subtitle: job?.status === 'completed'
        ? (job?.message || 'Done!')
        : (job?.error?.message || 'Failed'),
      progressBar: {
        progress: job?.status === 'completed' ? 1 : (job?.progress || 0) / 100,
      },
    };

    await lib.stopActivity(activityId, finalState);
    return true;
  } catch (error) {
    console.error('[@seenn/react-native] Failed to stop Expo Live Activity:', error);
    return false;
  }
}

/**
 * Listen for push token updates (for background activity updates)
 */
export function addExpoActivityTokenListener(
  callback: (event: { activityId: string; token: string }) => void
): (() => void) | null {
  const lib = getExpoLiveActivity();
  if (!lib) return null;

  try {
    const subscription = lib.addActivityTokenListener(callback);
    return () => subscription?.remove?.();
  } catch (error) {
    console.error('[@seenn/react-native] Failed to add token listener:', error);
    return null;
  }
}

// Helper functions
function getStatusMessage(status: string): string {
  switch (status) {
    case 'queued':
      return 'Waiting in queue...';
    case 'pending':
      return 'Starting...';
    case 'running':
      return 'Processing...';
    case 'completed':
      return 'Completed!';
    case 'failed':
      return 'Failed';
    default:
      return '';
  }
}

function getStageMessage(job: SeennJob): string | null {
  if (!job.stage) return null;
  return `${job.stage.name} (${job.stage.current}/${job.stage.total})`;
}

/**
 * Expo Live Activity API
 *
 * Provides a unified interface for Live Activities in Expo projects.
 * Uses expo-live-activity under the hood.
 */
export const ExpoLiveActivity = {
  isAvailable: isExpoLiveActivityAvailable,
  start: startExpoLiveActivity,
  update: updateExpoLiveActivity,
  stop: stopExpoLiveActivity,
  addTokenListener: addExpoActivityTokenListener,
};
