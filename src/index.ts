// Seenn React Native SDK
// MIT License - Open Source
// https://github.com/seenn-io/seenn-sdk

export { Seenn } from './Seenn';

// Live Activity (iOS 16.1+) - Native Module
export { LiveActivity } from './native/LiveActivity';
export type {
  LiveActivityStartParams,
  LiveActivityUpdateParams,
  LiveActivityEndParams,
  LiveActivityResult,
  LiveActivityPushTokenEvent,
  // Push Token Types (iOS 12+)
  PushTokenType,
  // Push Authorization Types (iOS 12+)
  PushAuthorizationStatus,
  PushAuthorizationInfo,
} from './native/LiveActivity';

// Ongoing Notification (Android 8.0+) - Native Module
export { OngoingNotification } from './native/OngoingNotification';
export type {
  OngoingNotificationStartParams,
  OngoingNotificationUpdateParams,
  OngoingNotificationEndParams,
  OngoingNotificationResult,
} from './native/OngoingNotification';

// Unified Cross-Platform Job Notification API
export { JobNotification } from './native/JobNotification';
export type {
  JobNotificationStartParams,
  JobNotificationUpdateParams,
  JobNotificationEndParams,
  JobNotificationResult,
} from './native/JobNotification';

// Live Activity - Expo Integration (uses expo-live-activity)
export { ExpoLiveActivity } from './expo/ExpoLiveActivity';
export {
  isExpoLiveActivityAvailable,
  startExpoLiveActivity,
  updateExpoLiveActivity,
  stopExpoLiveActivity,
  addExpoActivityTokenListener,
} from './expo/ExpoLiveActivity';

// Hooks
export {
  useSeennJob,
  useSeennJobs,
  useSeennConnectionState,
  useSeennJobProgress,
  useSeennJobsByStatus,
  useEtaCountdown,
  // Parent-Child Hooks
  useParentJob,
  useChildJob,
  useJobsByIds,
} from './hooks';
export type {
  EtaCountdownResult,
  ParentJobResult,
  ChildJobResult,
} from './hooks';

// Live Activity Hooks
export { useLiveActivity } from './hooks/useLiveActivity';
export type {
  UseLiveActivityOptions,
  UseLiveActivityResult,
} from './hooks/useLiveActivity';

export { useExpoLiveActivity } from './hooks/useExpoLiveActivity';
export type {
  UseExpoLiveActivityOptions,
  UseExpoLiveActivityResult,
} from './hooks/useExpoLiveActivity';

// Cross-Platform Job Notification Hook
export { useJobNotification } from './hooks/useJobNotification';
export type {
  UseJobNotificationOptions,
  UseJobNotificationResult,
} from './hooks/useJobNotification';

// Push Token Hook (iOS)
export { useSeennPush } from './hooks/useSeennPush';
export type { UseSeennPushOptions, UseSeennPushResult } from './hooks/useSeennPush';

// Types
export type {
  SeennConfig,
  SeennJob,
  JobStatus,
  StageInfo,
  QueueInfo,
  JobResult,
  JobError,
  ChildJob,
  ChildJobSummary,
  ParentInfo,
  ChildrenStats,
  ParentWithChildren,
  ChildProgressMode,
  InAppMessage,
  ConnectionState,
  ConnectionMode,
} from './types';

// Errors
export {
  SeennException,
  NetworkException,
  AuthException,
  ConnectionException,
  ValidationException,
} from './errors/SeennException';
