// Seenn React Native SDK - Error Codes
// MIT License - Open Source

/**
 * Standardized error codes for Seenn SDK operations
 *
 * @example
 * ```typescript
 * import { SeennErrorCode } from '@seenn/react-native';
 *
 * const result = await LiveActivity.start({ jobId: '', title: 'Test' });
 * if (!result.success && result.code === SeennErrorCode.INVALID_JOB_ID) {
 *   console.log('Invalid job ID provided');
 * }
 * ```
 */
export const SeennErrorCode = {
  // Platform errors
  /** Operation not supported on this platform (e.g., LiveActivity on Android) */
  PLATFORM_NOT_SUPPORTED: 'PLATFORM_NOT_SUPPORTED',
  /** Native module not found - native setup incomplete */
  NATIVE_MODULE_NOT_FOUND: 'NATIVE_MODULE_NOT_FOUND',
  /** Live Activity bridge not registered in AppDelegate */
  BRIDGE_NOT_REGISTERED: 'BRIDGE_NOT_REGISTERED',

  // Activity errors
  /** Live Activity not found for the given jobId */
  ACTIVITY_NOT_FOUND: 'ACTIVITY_NOT_FOUND',
  /** Live Activities disabled by user in Settings */
  ACTIVITIES_DISABLED: 'ACTIVITIES_DISABLED',

  // Permission errors
  /** Push notification permission denied */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  /** Push permission not yet requested */
  PERMISSION_NOT_DETERMINED: 'PERMISSION_NOT_DETERMINED',

  // Validation errors
  /** Generic validation error */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Invalid or empty jobId */
  INVALID_JOB_ID: 'INVALID_JOB_ID',
  /** Progress value out of range (must be 0-100) */
  INVALID_PROGRESS: 'INVALID_PROGRESS',
  /** Invalid or empty title */
  INVALID_TITLE: 'INVALID_TITLE',
  /** Invalid status value */
  INVALID_STATUS: 'INVALID_STATUS',

  // Network errors
  /** Network request failed */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Request timed out */
  TIMEOUT: 'TIMEOUT',

  // Generic errors
  /** Unknown error occurred */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type SeennErrorCode = (typeof SeennErrorCode)[keyof typeof SeennErrorCode];
