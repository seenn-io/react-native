// Seenn React Native SDK - Unified Job Notification API
// MIT License - Open Source

import { Platform } from 'react-native';
import { LiveActivity, LiveActivityResult, LiveActivityPushTokenEvent } from './LiveActivity';
import { OngoingNotification } from './OngoingNotification';
import { SeennErrorCode } from '../errors/codes';

// MARK: - Unified Types

export interface JobNotificationStartParams {
  /** Unique job ID */
  jobId: string;
  /** Title shown in notification/activity */
  title: string;
  /** Job type identifier */
  jobType?: string;
  /** Initial progress (0-100) */
  initialProgress?: number;
  /** Initial status message */
  initialMessage?: string;
}

export interface JobNotificationUpdateParams {
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
  /** Estimated end time (Unix timestamp in seconds) - iOS only */
  estimatedEndTime?: number;
}

export interface JobNotificationEndParams {
  /** Job ID to end */
  jobId: string;
  /** Final status */
  finalStatus: 'completed' | 'failed' | 'cancelled';
  /** Final progress (default: 100 for completed) */
  finalProgress?: number;
  /** Final message */
  message?: string;
  /** Result URL (for completed jobs) */
  resultUrl?: string;
  /** Error message (for failed jobs) */
  errorMessage?: string;
  /**
   * Time to keep notification visible after ending
   * - iOS: seconds (default: 300 = 5 min)
   * - Android: milliseconds (default: 5000 = 5 sec)
   */
  dismissAfter?: number;
}

export interface JobNotificationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Job ID */
  jobId?: string;
  /** Platform-specific ID */
  activityId?: string; // iOS
  notificationId?: number; // Android
  /** Error message if failed */
  error?: string;
  /** Error code for programmatic handling */
  code?: SeennErrorCode;
}

// MARK: - Unified JobNotification API

/**
 * Unified Job Notification API for both iOS and Android
 *
 * - iOS: Uses Live Activities (Lock Screen, Dynamic Island)
 * - Android: Uses Ongoing Notifications (persistent notification drawer)
 *
 * @example
 * ```typescript
 * import { JobNotification, SeennErrorCode } from '@seenn/react-native';
 *
 * // Check support (works on both platforms)
 * const supported = await JobNotification.isSupported();
 *
 * // Start notification
 * const result = await JobNotification.start({
 *   jobId: 'job_123',
 *   title: 'Processing video...',
 *   initialProgress: 0,
 * });
 *
 * if (!result.success) {
 *   console.error(`Error [${result.code}]: ${result.error}`);
 * }
 *
 * // Update progress
 * await JobNotification.update({
 *   jobId: 'job_123',
 *   progress: 50,
 *   status: 'running',
 *   message: 'Encoding frames...',
 * });
 *
 * // End notification
 * await JobNotification.end({
 *   jobId: 'job_123',
 *   finalStatus: 'completed',
 *   message: 'Video ready!',
 * });
 * ```
 */
export const JobNotification = {
  /**
   * Current platform
   * @returns 'ios' | 'android' | 'other'
   */
  get platform(): 'ios' | 'android' | 'other' {
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    return 'other';
  },

  /**
   * Check if job notifications are supported on this device
   * - iOS: Requires iOS 16.2+ with Live Activities enabled
   * - Android: Requires Android 8.0+ (API 26)
   */
  async isSupported(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return LiveActivity.isSupported();
    } else if (Platform.OS === 'android') {
      return OngoingNotification.isSupported();
    }
    return false;
  },

  /**
   * Check if notifications are enabled by the user
   * - iOS: Checks if Live Activities are enabled in Settings
   * - Android: Checks if notifications are enabled
   */
  async areEnabled(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return LiveActivity.areActivitiesEnabled();
    } else if (Platform.OS === 'android') {
      return OngoingNotification.areNotificationsEnabled();
    }
    return false;
  },

  /**
   * Check if notification permission is granted
   * - iOS: Live Activities don't require separate permission
   * - Android: POST_NOTIFICATIONS permission (Android 13+)
   */
  async hasPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // iOS Live Activities use the same permission as activities enabled
      return LiveActivity.areActivitiesEnabled();
    } else if (Platform.OS === 'android') {
      return OngoingNotification.hasPermission();
    }
    return false;
  },

  /**
   * Start a new job notification
   *
   * @param params - Notification parameters
   * @returns Result with success status and error code
   */
  async start(params: JobNotificationStartParams): Promise<JobNotificationResult> {
    if (Platform.OS === 'ios') {
      const result = await LiveActivity.start(params);
      return {
        success: result.success,
        jobId: result.jobId,
        activityId: result.activityId,
        error: result.error,
        code: result.code,
      };
    } else if (Platform.OS === 'android') {
      return OngoingNotification.start(params);
    }
    return {
      success: false,
      error: 'Platform not supported',
      code: SeennErrorCode.PLATFORM_NOT_SUPPORTED,
    };
  },

  /**
   * Update an existing job notification
   *
   * @param params - Update parameters
   * @returns Result with success status and error code
   */
  async update(params: JobNotificationUpdateParams): Promise<JobNotificationResult> {
    if (Platform.OS === 'ios') {
      const result = await LiveActivity.update(params);
      return {
        success: result.success,
        jobId: result.jobId,
        error: result.error,
        code: result.code,
      };
    } else if (Platform.OS === 'android') {
      const success = await OngoingNotification.update(params);
      return {
        success,
        jobId: params.jobId,
        error: success ? undefined : 'Update failed',
        code: success ? undefined : SeennErrorCode.UNKNOWN_ERROR,
      };
    }
    return {
      success: false,
      error: 'Platform not supported',
      code: SeennErrorCode.PLATFORM_NOT_SUPPORTED,
    };
  },

  /**
   * End a job notification
   *
   * @param params - End parameters
   * @returns Result with success status and error code
   */
  async end(params: JobNotificationEndParams): Promise<JobNotificationResult> {
    if (Platform.OS === 'ios') {
      const result = await LiveActivity.end(params);
      return {
        success: result.success,
        jobId: result.jobId,
        error: result.error,
        code: result.code,
      };
    } else if (Platform.OS === 'android') {
      const success = await OngoingNotification.end(params);
      return {
        success,
        jobId: params.jobId,
        error: success ? undefined : 'End failed',
        code: success ? undefined : SeennErrorCode.UNKNOWN_ERROR,
      };
    }
    return {
      success: false,
      error: 'Platform not supported',
      code: SeennErrorCode.PLATFORM_NOT_SUPPORTED,
    };
  },

  /**
   * Get all active job notification IDs
   *
   * @returns Array of job IDs with active notifications
   */
  async getActiveIds(): Promise<string[]> {
    if (Platform.OS === 'ios') {
      return LiveActivity.getActiveIds();
    } else if (Platform.OS === 'android') {
      return OngoingNotification.getActiveIds();
    }
    return [];
  },

  /**
   * Check if a specific job has an active notification
   *
   * @param jobId - Job ID to check
   * @returns true if notification is active
   */
  async isActive(jobId: string): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return LiveActivity.isActive(jobId);
    } else if (Platform.OS === 'android') {
      return OngoingNotification.isActive(jobId);
    }
    return false;
  },

  /**
   * Cancel a specific job notification immediately
   *
   * @param jobId - Job ID to cancel
   * @returns Result with success status and error code
   */
  async cancel(jobId: string): Promise<JobNotificationResult> {
    if (Platform.OS === 'ios') {
      const result = await LiveActivity.cancel(jobId);
      return {
        success: result.success,
        jobId: result.jobId,
        error: result.error,
        code: result.code,
      };
    } else if (Platform.OS === 'android') {
      const success = await OngoingNotification.cancel(jobId);
      return {
        success,
        jobId,
        error: success ? undefined : 'Cancel failed',
        code: success ? undefined : SeennErrorCode.UNKNOWN_ERROR,
      };
    }
    return {
      success: false,
      error: 'Platform not supported',
      code: SeennErrorCode.PLATFORM_NOT_SUPPORTED,
    };
  },

  /**
   * Cancel all job notifications immediately
   *
   * @returns Result with success status and error code
   */
  async cancelAll(): Promise<JobNotificationResult> {
    if (Platform.OS === 'ios') {
      const result = await LiveActivity.cancelAll();
      return {
        success: result.success,
        error: result.error,
        code: result.code,
      };
    } else if (Platform.OS === 'android') {
      const success = await OngoingNotification.cancelAll();
      return {
        success,
        error: success ? undefined : 'Cancel all failed',
        code: success ? undefined : SeennErrorCode.UNKNOWN_ERROR,
      };
    }
    return {
      success: false,
      error: 'Platform not supported',
      code: SeennErrorCode.PLATFORM_NOT_SUPPORTED,
    };
  },

  /**
   * Subscribe to push token events (iOS only)
   * On Android, this is a no-op that returns an empty unsubscribe function
   *
   * @param callback - Function called with token event (type: 'liveActivity' | 'device')
   * @returns Unsubscribe function
   */
  onPushToken(callback: (event: LiveActivityPushTokenEvent) => void): () => void {
    if (Platform.OS === 'ios') {
      return LiveActivity.onPushToken(callback);
    }
    // Android doesn't have push tokens for notifications
    return () => {};
  },
};

export default JobNotification;
