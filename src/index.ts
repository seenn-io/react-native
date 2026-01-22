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
} from './native/LiveActivity';

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
} from './hooks';
export type { EtaCountdownResult } from './hooks';

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
  SSEEventType,
} from './types';

// Errors
export {
  SeennException,
  NetworkException,
  AuthException,
  ConnectionException,
  ValidationException,
} from './errors/SeennException';
