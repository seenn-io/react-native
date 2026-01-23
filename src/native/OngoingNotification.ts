// Seenn React Native SDK - Ongoing Notification Native Module (Android)
// MIT License - Open Source

import { NativeModules, Platform } from 'react-native';

const { SeennOngoingNotification: NativeModule } = NativeModules;

// MARK: - Types

export interface OngoingNotificationStartParams {
  /** Unique job ID */
  jobId: string;
  /** Title shown in notification */
  title: string;
  /** Job type identifier */
  jobType?: string;
  /** Initial progress (0-100) */
  initialProgress?: number;
  /** Initial status message */
  initialMessage?: string;
}

export interface OngoingNotificationUpdateParams {
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
}

export interface OngoingNotificationEndParams {
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
  /** Milliseconds to keep on screen after ending (default: 5000 = 5 sec) */
  dismissAfter?: number;
}

export interface OngoingNotificationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Job ID */
  jobId?: string;
  /** Android notification ID */
  notificationId?: number;
  /** Error message if failed */
  error?: string;
}

// MARK: - OngoingNotification API

/**
 * Android Ongoing Notification API for Seenn jobs
 *
 * Provides Android equivalent of iOS Live Activities using ongoing notifications.
 * Notifications are persistent and shown at the top of the notification drawer.
 *
 * @example
 * ```typescript
 * import { OngoingNotification } from '@seenn/react-native';
 *
 * // Check support
 * const supported = await OngoingNotification.isSupported();
 *
 * // Check permission (Android 13+)
 * const hasPermission = await OngoingNotification.hasPermission();
 *
 * // Start notification
 * const result = await OngoingNotification.start({
 *   jobId: 'job_123',
 *   title: 'Processing video...',
 *   initialProgress: 0,
 * });
 *
 * // Update progress
 * await OngoingNotification.update({
 *   jobId: 'job_123',
 *   progress: 50,
 *   status: 'running',
 *   message: 'Encoding frames...',
 * });
 *
 * // End notification
 * await OngoingNotification.end({
 *   jobId: 'job_123',
 *   finalStatus: 'completed',
 *   message: 'Video ready!',
 * });
 * ```
 */
export const OngoingNotification = {
  /**
   * Check if Ongoing Notifications are supported on this device
   * Returns false on iOS and Android < 8.0
   */
  async isSupported(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.isSupported();
    } catch {
      return false;
    }
  },

  /**
   * Check if notifications are enabled by the user
   */
  async areNotificationsEnabled(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.areNotificationsEnabled();
    } catch {
      return false;
    }
  },

  /**
   * Check if notification permission is granted (Android 13+)
   * On Android 12 and below, this checks if notifications are enabled
   */
  async hasPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.hasNotificationPermission();
    } catch {
      return false;
    }
  },

  /**
   * Start a new Ongoing Notification for a job
   *
   * @param params - Notification parameters
   * @returns Result with success status and notification ID
   *
   * @example
   * ```typescript
   * const result = await OngoingNotification.start({
   *   jobId: 'job_123',
   *   title: 'Generating image...',
   *   jobType: 'image-generation',
   *   initialProgress: 0,
   *   initialMessage: 'Starting...',
   * });
   *
   * if (result.success) {
   *   console.log('Notification started:', result.notificationId);
   * } else {
   *   console.error('Failed:', result.error);
   * }
   * ```
   */
  async start(params: OngoingNotificationStartParams): Promise<OngoingNotificationResult> {
    if (Platform.OS !== 'android') {
      return { success: false, error: 'Ongoing Notifications are only supported on Android' };
    }
    if (!NativeModule) {
      return { success: false, error: 'Native module not available' };
    }
    try {
      return await NativeModule.startNotification(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Update an existing Ongoing Notification
   *
   * @param params - Update parameters
   * @returns true if updated successfully
   *
   * @example
   * ```typescript
   * await OngoingNotification.update({
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
  async update(params: OngoingNotificationUpdateParams): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.updateNotification(params);
    } catch {
      return false;
    }
  },

  /**
   * End an Ongoing Notification
   *
   * @param params - End parameters
   * @returns true if ended successfully
   *
   * @example
   * ```typescript
   * // Completed job
   * await OngoingNotification.end({
   *   jobId: 'job_123',
   *   finalStatus: 'completed',
   *   message: 'Video ready!',
   *   dismissAfter: 5000, // 5 seconds
   * });
   *
   * // Failed job
   * await OngoingNotification.end({
   *   jobId: 'job_456',
   *   finalStatus: 'failed',
   *   errorMessage: 'Processing failed',
   * });
   * ```
   */
  async end(params: OngoingNotificationEndParams): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.endNotification(params);
    } catch {
      return false;
    }
  },

  /**
   * Get all active notification job IDs
   *
   * @returns Array of job IDs with active notifications
   *
   * @example
   * ```typescript
   * const activeIds = await OngoingNotification.getActiveIds();
   * console.log('Active jobs:', activeIds); // ['job_1', 'job_2']
   * ```
   */
  async getActiveIds(): Promise<string[]> {
    if (Platform.OS !== 'android') return [];
    if (!NativeModule) return [];
    try {
      return await NativeModule.getActiveNotificationIds();
    } catch {
      return [];
    }
  },

  /**
   * Check if a specific job has an active notification
   *
   * @param jobId - Job ID to check
   * @returns true if notification is active
   */
  async isActive(jobId: string): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.isNotificationActive(jobId);
    } catch {
      return false;
    }
  },

  /**
   * Cancel a specific notification immediately
   *
   * @param jobId - Job ID to cancel
   * @returns true if cancelled successfully
   */
  async cancel(jobId: string): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.cancelNotification(jobId);
    } catch {
      return false;
    }
  },

  /**
   * Cancel all notifications immediately
   *
   * @returns true if cancelled successfully
   */
  async cancelAll(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!NativeModule) return false;
    try {
      return await NativeModule.cancelAllNotifications();
    } catch {
      return false;
    }
  },
};

export default OngoingNotification;
