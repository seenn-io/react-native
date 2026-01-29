// Seenn React Native SDK - Live Activity Native Module
// MIT License - Open Source

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { SeennLiveActivity: NativeModule } = NativeModules;

// MARK: - Types

export interface LiveActivityStartParams {
  /** Unique job ID */
  jobId: string;
  /** Title shown in Live Activity */
  title: string;
  /** Job type identifier */
  jobType?: string;
  /** Initial progress (0-100) */
  initialProgress?: number;
  /** Initial status message */
  initialMessage?: string;
}

export interface LiveActivityUpdateParams {
  /** Job ID to update */
  jobId: string;
  /** Current progress (0-100) */
  progress: number;
  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** Status message */
  message?: string;
  /** Current stage name */
  stageName?: string;
  /** Current stage index (1-based) */
  stageIndex?: number;
  /** Total number of stages */
  stageTotal?: number;
  /** Estimated end time (Unix timestamp in seconds) */
  estimatedEndTime?: number;
}

/** CTA button style presets */
export type LiveActivityCTAButtonStyle = 'primary' | 'secondary' | 'outline';

/** CTA button configuration for Live Activity completion */
export interface LiveActivityCTAButton {
  /** Button text */
  text: string;
  /** Deep link URL to open when tapped */
  deepLink: string;
  /** Button style preset */
  style?: LiveActivityCTAButtonStyle;
  /** Custom background color (hex) */
  backgroundColor?: string;
  /** Custom text color (hex) */
  textColor?: string;
  /** Corner radius (default: 20) */
  cornerRadius?: number;
}

export interface LiveActivityEndParams {
  /** Job ID to end */
  jobId: string;
  /** Final status */
  finalStatus: 'completed' | 'failed' | 'cancelled';
  /** Final progress (default: 100 for completed, current for failed) */
  finalProgress?: number;
  /** Final message */
  message?: string;
  /** Result URL (for completed jobs) */
  resultUrl?: string;
  /** Error message (for failed jobs) */
  errorMessage?: string;
  /** Seconds to keep on screen after ending (default: 300 = 5 min) */
  dismissAfter?: number;
  /** CTA button to show on completion/failure */
  ctaButton?: LiveActivityCTAButton;
}

export interface LiveActivityResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Activity ID (iOS internal ID) */
  activityId?: string;
  /** Job ID */
  jobId?: string;
  /** Error message if failed */
  error?: string;
}

export interface LiveActivityPushTokenEvent {
  /** Job ID the token is for */
  jobId: string;
  /** APNs push token for this Live Activity */
  token: string;
}

// MARK: - Event Emitter

let eventEmitter: NativeEventEmitter | null = null;

function getEventEmitter(): NativeEventEmitter | null {
  if (Platform.OS !== 'ios') return null;
  if (!eventEmitter && NativeModule) {
    eventEmitter = new NativeEventEmitter(NativeModule);
  }
  return eventEmitter;
}

// MARK: - LiveActivity API

/**
 * iOS Live Activity API for Seenn jobs
 *
 * @example
 * ```typescript
 * import { LiveActivity } from '@seenn/react-native';
 *
 * // Check support
 * const supported = await LiveActivity.isSupported();
 *
 * // Start activity
 * const result = await LiveActivity.start({
 *   jobId: 'job_123',
 *   title: 'Processing video...',
 *   initialProgress: 0,
 * });
 *
 * // Update progress
 * await LiveActivity.update({
 *   jobId: 'job_123',
 *   progress: 50,
 *   status: 'running',
 *   message: 'Encoding frames...',
 * });
 *
 * // End activity
 * await LiveActivity.end({
 *   jobId: 'job_123',
 *   finalStatus: 'completed',
 *   resultUrl: 'https://example.com/video.mp4',
 * });
 * ```
 */
export const LiveActivity = {
  /**
   * Check if Live Activities are supported on this device
   * Returns false on Android and iOS < 16.1
   */
  async isSupported(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.isSupported();
    } catch {
      return false;
    }
  },

  /**
   * Check if Live Activities are enabled by the user
   * User can disable Live Activities in Settings
   */
  async areActivitiesEnabled(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.areActivitiesEnabled();
    } catch {
      return false;
    }
  },

  /**
   * Start a new Live Activity for a job
   *
   * @param params - Activity parameters
   * @returns Result with success status and activity ID
   *
   * @example
   * ```typescript
   * const result = await LiveActivity.start({
   *   jobId: 'job_123',
   *   title: 'Generating image...',
   *   jobType: 'image-generation',
   *   initialProgress: 0,
   *   initialMessage: 'Starting...',
   * });
   *
   * if (result.success) {
   *   console.log('Activity started:', result.activityId);
   * } else {
   *   console.error('Failed:', result.error);
   * }
   * ```
   */
  async start(params: LiveActivityStartParams): Promise<LiveActivityResult> {
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'Live Activities are only supported on iOS' };
    }
    if (!NativeModule) {
      return { success: false, error: 'Native module not available' };
    }
    try {
      return await NativeModule.startActivity(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Update an existing Live Activity
   *
   * @param params - Update parameters
   * @returns true if updated successfully
   *
   * @example
   * ```typescript
   * await LiveActivity.update({
   *   jobId: 'job_123',
   *   progress: 75,
   *   status: 'running',
   *   message: 'Almost done...',
   *   stageName: 'Encoding',
   *   stageIndex: 2,
   *   stageTotal: 3,
   * });
   * ```
   */
  async update(params: LiveActivityUpdateParams): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.updateActivity(params);
    } catch {
      return false;
    }
  },

  /**
   * End a Live Activity
   *
   * @param params - End parameters
   * @returns true if ended successfully
   *
   * @example
   * ```typescript
   * // Completed job
   * await LiveActivity.end({
   *   jobId: 'job_123',
   *   finalStatus: 'completed',
   *   message: 'Video ready!',
   *   resultUrl: 'https://example.com/video.mp4',
   *   dismissAfter: 300, // 5 minutes
   * });
   *
   * // Failed job
   * await LiveActivity.end({
   *   jobId: 'job_456',
   *   finalStatus: 'failed',
   *   errorMessage: 'Processing failed',
   *   dismissAfter: 60,
   * });
   * ```
   */
  async end(params: LiveActivityEndParams): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.endActivity(params);
    } catch {
      return false;
    }
  },

  /**
   * Get all active Live Activity job IDs
   *
   * @returns Array of job IDs with active activities
   *
   * @example
   * ```typescript
   * const activeIds = await LiveActivity.getActiveIds();
   * console.log('Active jobs:', activeIds); // ['job_1', 'job_2']
   * ```
   */
  async getActiveIds(): Promise<string[]> {
    if (Platform.OS !== 'ios') return [];
    if (!NativeModule) return [];
    try {
      return await NativeModule.getActiveActivityIds();
    } catch {
      return [];
    }
  },

  /**
   * Check if a specific job has an active Live Activity
   *
   * @param jobId - Job ID to check
   * @returns true if activity is active
   */
  async isActive(jobId: string): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.isActivityActive(jobId);
    } catch {
      return false;
    }
  },

  /**
   * Cancel a specific Live Activity immediately
   *
   * @param jobId - Job ID to cancel
   * @returns true if cancelled successfully
   */
  async cancel(jobId: string): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.cancelActivity(jobId);
    } catch {
      return false;
    }
  },

  /**
   * Cancel all Live Activities immediately
   *
   * @returns true if cancelled successfully
   */
  async cancelAll(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.cancelAllActivities();
    } catch {
      return false;
    }
  },

  /**
   * Subscribe to push token events
   * Called when iOS provides a push token for a Live Activity
   *
   * @param callback - Function called with job ID and token
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = LiveActivity.onPushToken((event) => {
   *   console.log(`Token for ${event.jobId}: ${event.token}`);
   *   // Send token to your backend for push updates
   * });
   *
   * // Later: unsubscribe();
   * ```
   */
  onPushToken(callback: (event: LiveActivityPushTokenEvent) => void): () => void {
    const emitter = getEventEmitter();
    if (!emitter) return () => {};

    const subscription = emitter.addListener('SeennLiveActivityPushToken', callback);
    return () => subscription.remove();
  },
};

export default LiveActivity;
