/**
 * Seenn React Native SDK Types
 *
 * Re-exports from @seenn/types (single source of truth)
 * Plus React Native specific types
 *
 * @see https://www.npmjs.com/package/@seenn/types
 */

// Re-export all types from @seenn/types
export type {
  // Core Job Types
  JobStatus,
  ChildProgressMode,
  SeennJob,
  StageInfo,
  QueueInfo,
  JobResult,
  JobError,

  // Parent-Child Types
  ParentInfo,
  ChildrenStats,
  ChildJobSummary,
  ParentWithChildren,

  // SSE Types
  ConnectionState,
  SSEEventType,
  SSEEvent,

  // In-App Message Types
  InAppMessageType,
  InAppMessage,

  // Live Activity Types
  LiveActivityStartParams,
  LiveActivityUpdateParams,
  LiveActivityEndParams,
  LiveActivityResult,
  LiveActivityPushTokenEvent,

  // SDK Configuration
  SeennConfig,
} from '@seenn/types';

// Re-export constants
export { SDK_VERSION, MIN_API_VERSION, SSE_PROTOCOL_VERSION } from '@seenn/types';

// ============================================
// React Native Specific Types (not in @seenn/types)
// ============================================

/**
 * @deprecated Use ChildJobSummary instead
 */
export interface ChildJob {
  childId: string;
  parentJobId: string;
  title: string;
  status: import('@seenn/types').JobStatus;
  progress?: number;
  stage?: import('@seenn/types').StageInfo;
  weight?: number;
}

/**
 * Live Activity configuration (React Native specific)
 */
export interface LiveActivityConfig {
  jobId: string;
  title: string;
  startProgress?: number;
}
