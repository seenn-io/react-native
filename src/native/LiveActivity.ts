// Seenn React Native SDK - Live Activity Native Module
// MIT License - Open Source

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { SeennErrorCode } from '../errors/codes';
import { validateJobId, validateTitle, validateProgress, validateStatus } from '../utils/validation';

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
  /** Error code for programmatic handling */
  code?: SeennErrorCode;
}

/** Push token event type */
export type PushTokenType = 'liveActivity' | 'device';

export interface LiveActivityPushTokenEvent {
  /** Type of push token */
  type: PushTokenType;
  /** Job ID the token is for (only for liveActivity type) */
  jobId?: string;
  /** APNs push token */
  token: string;
}

// MARK: - Push Authorization Types

/** iOS push authorization status */
export type PushAuthorizationStatus =
  | 'notDetermined'
  | 'denied'
  | 'authorized'
  | 'provisional'
  | 'ephemeral';

/** Push authorization information */
export interface PushAuthorizationInfo {
  /** Current authorization status */
  status: PushAuthorizationStatus;
  /** Whether current authorization is provisional */
  isProvisional: boolean;
  /** Whether user can be prompted to upgrade to full authorization */
  canRequestFullAuthorization: boolean;
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

// MARK: - Helper Functions

function createErrorResult(error: string, code: SeennErrorCode): LiveActivityResult {
  return { success: false, error, code };
}

function logWarning(message: string): void {
  if (__DEV__) {
    console.warn(`[Seenn] ${message}`);
  }
}

// MARK: - LiveActivity API

/**
 * iOS Live Activity API for Seenn jobs
 *
 * @example
 * ```typescript
 * import { LiveActivity, SeennErrorCode } from '@seenn/react-native';
 *
 * // Check support
 * const supported = await LiveActivity.isSupported();
 *
 * // Start activity with validation
 * const result = await LiveActivity.start({
 *   jobId: 'job_123',
 *   title: 'Processing video...',
 *   initialProgress: 0,
 * });
 *
 * if (!result.success) {
 *   // Handle specific error codes
 *   if (result.code === SeennErrorCode.PLATFORM_NOT_SUPPORTED) {
 *     console.log('Not on iOS');
 *   } else if (result.code === SeennErrorCode.INVALID_JOB_ID) {
 *     console.log('Invalid job ID');
 *   }
 * }
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
   * Returns false on Android and iOS < 16.2
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
   * @returns Result with success status, activity ID, and error code if failed
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
   *   console.error(`Failed [${result.code}]: ${result.error}`);
   * }
   * ```
   */
  async start(params: LiveActivityStartParams): Promise<LiveActivityResult> {
    // Platform check
    if (Platform.OS !== 'ios') {
      logWarning('LiveActivity.start() is only supported on iOS. Call ignored.');
      return createErrorResult(
        'Live Activities are only supported on iOS',
        SeennErrorCode.PLATFORM_NOT_SUPPORTED
      );
    }

    // Native module check
    if (!NativeModule) {
      return createErrorResult(
        'Native module not available. Ensure native setup is complete.',
        SeennErrorCode.NATIVE_MODULE_NOT_FOUND
      );
    }

    // Validate jobId
    const jobIdError = validateJobId(params.jobId);
    if (jobIdError) {
      return createErrorResult(jobIdError.message, jobIdError.code);
    }

    // Validate title
    const titleError = validateTitle(params.title);
    if (titleError) {
      return createErrorResult(titleError.message, titleError.code);
    }

    // Validate initialProgress
    const progressError = validateProgress(params.initialProgress);
    if (progressError) {
      return createErrorResult(progressError.message, progressError.code);
    }

    try {
      const result = await NativeModule.startActivity(params);
      if (result.success) {
        return result;
      }
      // Native returned an error
      return {
        success: false,
        error: result.error || 'Unknown native error',
        code: result.code || SeennErrorCode.UNKNOWN_ERROR,
      };
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        SeennErrorCode.UNKNOWN_ERROR
      );
    }
  },

  /**
   * Update an existing Live Activity
   *
   * @param params - Update parameters
   * @returns Result with success status and error code if failed
   *
   * @example
   * ```typescript
   * const result = await LiveActivity.update({
   *   jobId: 'job_123',
   *   progress: 75,
   *   status: 'running',
   *   message: 'Almost done...',
   *   stageName: 'Encoding',
   *   stageIndex: 2,
   *   stageTotal: 3,
   * });
   *
   * if (!result.success) {
   *   console.error(`Update failed [${result.code}]: ${result.error}`);
   * }
   * ```
   */
  async update(params: LiveActivityUpdateParams): Promise<LiveActivityResult> {
    // Platform check
    if (Platform.OS !== 'ios') {
      logWarning('LiveActivity.update() is only supported on iOS. Call ignored.');
      return createErrorResult(
        'Live Activities are only supported on iOS',
        SeennErrorCode.PLATFORM_NOT_SUPPORTED
      );
    }

    // Native module check
    if (!NativeModule) {
      return createErrorResult(
        'Native module not available',
        SeennErrorCode.NATIVE_MODULE_NOT_FOUND
      );
    }

    // Validate jobId
    const jobIdError = validateJobId(params.jobId);
    if (jobIdError) {
      return createErrorResult(jobIdError.message, jobIdError.code);
    }

    // Validate progress
    const progressError = validateProgress(params.progress);
    if (progressError) {
      return createErrorResult(progressError.message, progressError.code);
    }

    // Validate status
    const statusError = validateStatus(params.status, [
      'pending',
      'running',
      'completed',
      'failed',
    ]);
    if (statusError) {
      return createErrorResult(statusError.message, statusError.code);
    }

    try {
      const success = await NativeModule.updateActivity(params);
      if (success) {
        return { success: true, jobId: params.jobId };
      }
      return createErrorResult('Activity not found or update failed', SeennErrorCode.ACTIVITY_NOT_FOUND);
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        SeennErrorCode.UNKNOWN_ERROR
      );
    }
  },

  /**
   * End a Live Activity
   *
   * @param params - End parameters
   * @returns Result with success status and error code if failed
   *
   * @example
   * ```typescript
   * // Completed job
   * const result = await LiveActivity.end({
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
  async end(params: LiveActivityEndParams): Promise<LiveActivityResult> {
    // Platform check
    if (Platform.OS !== 'ios') {
      logWarning('LiveActivity.end() is only supported on iOS. Call ignored.');
      return createErrorResult(
        'Live Activities are only supported on iOS',
        SeennErrorCode.PLATFORM_NOT_SUPPORTED
      );
    }

    // Native module check
    if (!NativeModule) {
      return createErrorResult(
        'Native module not available',
        SeennErrorCode.NATIVE_MODULE_NOT_FOUND
      );
    }

    // Validate jobId
    const jobIdError = validateJobId(params.jobId);
    if (jobIdError) {
      return createErrorResult(jobIdError.message, jobIdError.code);
    }

    // Validate finalStatus
    const statusError = validateStatus(params.finalStatus, ['completed', 'failed', 'cancelled']);
    if (statusError) {
      return createErrorResult(statusError.message, statusError.code);
    }

    // Validate finalProgress if provided
    const progressError = validateProgress(params.finalProgress);
    if (progressError) {
      return createErrorResult(progressError.message, progressError.code);
    }

    try {
      const success = await NativeModule.endActivity(params);
      if (success) {
        return { success: true, jobId: params.jobId };
      }
      return createErrorResult('Activity not found or end failed', SeennErrorCode.ACTIVITY_NOT_FOUND);
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        SeennErrorCode.UNKNOWN_ERROR
      );
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

    const jobIdError = validateJobId(jobId);
    if (jobIdError) {
      logWarning(`isActive: ${jobIdError.message}`);
      return false;
    }

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
   * @returns Result with success status
   */
  async cancel(jobId: string): Promise<LiveActivityResult> {
    if (Platform.OS !== 'ios') {
      logWarning('LiveActivity.cancel() is only supported on iOS. Call ignored.');
      return createErrorResult(
        'Live Activities are only supported on iOS',
        SeennErrorCode.PLATFORM_NOT_SUPPORTED
      );
    }

    if (!NativeModule) {
      return createErrorResult(
        'Native module not available',
        SeennErrorCode.NATIVE_MODULE_NOT_FOUND
      );
    }

    const jobIdError = validateJobId(jobId);
    if (jobIdError) {
      return createErrorResult(jobIdError.message, jobIdError.code);
    }

    try {
      const success = await NativeModule.cancelActivity(jobId);
      if (success) {
        return { success: true, jobId };
      }
      return createErrorResult('Activity not found', SeennErrorCode.ACTIVITY_NOT_FOUND);
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        SeennErrorCode.UNKNOWN_ERROR
      );
    }
  },

  /**
   * Cancel all Live Activities immediately
   *
   * @returns Result with success status
   */
  async cancelAll(): Promise<LiveActivityResult> {
    if (Platform.OS !== 'ios') {
      logWarning('LiveActivity.cancelAll() is only supported on iOS. Call ignored.');
      return createErrorResult(
        'Live Activities are only supported on iOS',
        SeennErrorCode.PLATFORM_NOT_SUPPORTED
      );
    }

    if (!NativeModule) {
      return createErrorResult(
        'Native module not available',
        SeennErrorCode.NATIVE_MODULE_NOT_FOUND
      );
    }

    try {
      const success = await NativeModule.cancelAllActivities();
      return { success };
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        SeennErrorCode.UNKNOWN_ERROR
      );
    }
  },

  /**
   * Subscribe to push token events
   * Called when iOS provides a push token for a Live Activity or device
   *
   * @param callback - Function called with token event
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = LiveActivity.onPushToken((event) => {
   *   if (event.type === 'liveActivity') {
   *     console.log(`Live Activity token for ${event.jobId}: ${event.token}`);
   *     // Send token to your backend for Live Activity push updates
   *   } else if (event.type === 'device') {
   *     console.log(`Device push token: ${event.token}`);
   *     // Send token to your backend for regular push notifications
   *   }
   * });
   *
   * // Later: unsubscribe();
   * ```
   */
  onPushToken(callback: (event: LiveActivityPushTokenEvent) => void): () => void {
    const emitter = getEventEmitter();
    if (!emitter) return () => {};

    // Listen to Live Activity push tokens
    const liveActivitySubscription = emitter.addListener(
      'SeennLiveActivityPushToken',
      (data: { jobId: string; token: string }) => {
        callback({
          type: 'liveActivity',
          jobId: data.jobId,
          token: data.token,
        });
      }
    );

    // Listen to device push tokens
    const deviceSubscription = emitter.addListener(
      'SeennDevicePushToken',
      (data: { token: string }) => {
        callback({
          type: 'device',
          token: data.token,
        });
      }
    );

    return () => {
      liveActivitySubscription.remove();
      deviceSubscription.remove();
    };
  },

  // MARK: - Push Authorization (iOS 12+)

  /**
   * Get current push notification authorization status
   *
   * @returns Push authorization info with status and capabilities
   *
   * @example
   * ```typescript
   * const info = await LiveActivity.getPushAuthorizationStatus();
   * console.log(info.status); // 'provisional', 'authorized', etc.
   * console.log(info.isProvisional); // true if quiet notifications
   * console.log(info.canRequestFullAuthorization); // true if upgradeable
   * ```
   */
  async getPushAuthorizationStatus(): Promise<PushAuthorizationInfo> {
    if (Platform.OS !== 'ios') {
      return {
        status: 'notDetermined',
        isProvisional: false,
        canRequestFullAuthorization: false,
      };
    }
    if (!NativeModule) {
      return {
        status: 'notDetermined',
        isProvisional: false,
        canRequestFullAuthorization: false,
      };
    }
    try {
      return await NativeModule.getPushAuthorizationStatus();
    } catch {
      return {
        status: 'notDetermined',
        isProvisional: false,
        canRequestFullAuthorization: false,
      };
    }
  },

  /**
   * Request provisional push authorization (iOS 12+)
   *
   * Provisional push allows sending "quiet" notifications without
   * showing a permission prompt. Notifications appear only in
   * Notification Center without sounds or banners.
   *
   * When users see their first notification, they can choose
   * "Keep" or "Turn Off" to finalize their preference.
   *
   * @returns true if provisional authorization was granted
   *
   * @example
   * ```typescript
   * // Request provisional push - no prompt shown!
   * const granted = await LiveActivity.requestProvisionalPushAuthorization();
   * if (granted) {
   *   console.log('Provisional push enabled');
   * }
   * ```
   */
  async requestProvisionalPushAuthorization(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      logWarning(
        'requestProvisionalPushAuthorization() is only supported on iOS. Call ignored.'
      );
      return false;
    }
    if (!NativeModule) return false;
    try {
      return await NativeModule.requestProvisionalPushAuthorization();
    } catch {
      return false;
    }
  },

  /**
   * Request standard push authorization (shows permission prompt)
   *
   * This shows the standard iOS permission prompt asking users
   * to allow notifications with alerts, sounds, and badges.
   *
   * @returns true if full authorization was granted
   *
   * @example
   * ```typescript
   * const granted = await LiveActivity.requestStandardPushAuthorization();
   * if (granted) {
   *   console.log('Full push access granted');
   * }
   * ```
   */
  async requestStandardPushAuthorization(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      logWarning(
        'requestStandardPushAuthorization() is only supported on iOS. Call ignored.'
      );
      return false;
    }
    if (!NativeModule) return false;
    try {
      return await NativeModule.requestStandardPushAuthorization();
    } catch {
      return false;
    }
  },

  /**
   * Upgrade from provisional to standard push authorization
   *
   * If the user currently has provisional authorization, this
   * shows the standard permission prompt to upgrade to full access.
   *
   * @returns true if upgrade was successful
   *
   * @example
   * ```typescript
   * const info = await LiveActivity.getPushAuthorizationStatus();
   * if (info.canRequestFullAuthorization) {
   *   const upgraded = await LiveActivity.upgradeToStandardPush();
   *   if (upgraded) {
   *     console.log('Upgraded to full push access');
   *   }
   * }
   * ```
   */
  async upgradeToStandardPush(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      logWarning('upgradeToStandardPush() is only supported on iOS. Call ignored.');
      return false;
    }
    if (!NativeModule) return false;
    try {
      return await NativeModule.requestStandardPushAuthorization();
    } catch {
      return false;
    }
  },

  /**
   * Refresh device push token if authorization is already granted
   *
   * Call this on app launch to ensure you have the latest device
   * push token even if permission was granted in a previous session.
   * The token will be delivered via `onPushToken` callback.
   *
   * @returns true if token refresh was triggered, false if not authorized
   *
   * @example
   * ```typescript
   * // On app launch
   * const refreshed = await LiveActivity.refreshDevicePushToken();
   * if (refreshed) {
   *   console.log('Token refresh triggered');
   * }
   * ```
   */
  async refreshDevicePushToken(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.refreshDevicePushToken();
    } catch {
      return false;
    }
  },
};

export default LiveActivity;
