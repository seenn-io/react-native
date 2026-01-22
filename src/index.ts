// Seenn React Native SDK
// MIT License - Open Source
// https://github.com/seenn-io/seenn-sdk

export { Seenn } from './Seenn';

// Live Activity (iOS 16.1+)
export { LiveActivity } from './native/LiveActivity';
export type {
  LiveActivityStartParams,
  LiveActivityUpdateParams,
  LiveActivityEndParams,
  LiveActivityResult,
  LiveActivityPushTokenEvent,
} from './native/LiveActivity';

// Hooks
export {
  useSeennJob,
  useSeennJobs,
  useSeennConnectionState,
  useSeennJobProgress,
  useSeennJobsByStatus,
} from './hooks';

export { useLiveActivity } from './hooks/useLiveActivity';
export type {
  UseLiveActivityOptions,
  UseLiveActivityResult,
} from './hooks/useLiveActivity';

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
