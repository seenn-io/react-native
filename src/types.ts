// Seenn React Native SDK Types
// MIT License - Open Source

export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ChildProgressMode = 'average' | 'weighted' | 'sequential';

export interface SeennConfig {
  baseUrl: string;
  authToken?: string;
  sseUrl?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  debug?: boolean;
}

export interface SeennJob {
  jobId: string;
  userId: string;
  appId: string;
  status: JobStatus;
  title: string;
  jobType: string;
  /** Job version for ETA tracking */
  version?: string;
  progress: number;
  message?: string;
  stage?: StageInfo;
  estimatedCompletionAt?: string;
  /** ETA confidence score (0.0 - 1.0) */
  etaConfidence?: number;
  /** Number of historical jobs used to calculate ETA */
  etaBasedOn?: number;
  queue?: QueueInfo;
  result?: JobResult;
  error?: JobError;
  metadata?: Record<string, unknown>;
  // Parent-Child
  parent?: ParentInfo;
  children?: ChildrenStats;
  childProgressMode?: ChildProgressMode;
  createdAt: string;
  updatedAt: string;
  /** When the job started running */
  startedAt?: string;
  completedAt?: string;
}

/** Parent info for child jobs */
export interface ParentInfo {
  parentJobId: string;
  childIndex: number;
}

/** Children stats for parent jobs */
export interface ChildrenStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
}

/** Summary of a child job */
export interface ChildJobSummary {
  id: string;
  childIndex: number;
  title: string;
  status: JobStatus;
  progress: number;
  message?: string;
  result?: JobResult;
  error?: JobError;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/** Deprecated - use ChildJobSummary instead */
export interface ChildJob {
  childId: string;
  parentJobId: string;
  title: string;
  status: JobStatus;
  progress?: number;
  stage?: StageInfo;
  weight?: number;
}

export interface StageInfo {
  name: string;
  current: number;
  total: number;
  description?: string;
}

export interface QueueInfo {
  position: number;
  total?: number;
  queueName?: string;
}

export interface JobResult {
  type?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface JobError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface InAppMessage {
  messageId: string;
  type: 'job_complete_banner' | 'job_failed_modal' | 'job_toast';
  jobId: string;
  title: string;
  body?: string;
  cta?: string;
  ctaUrl?: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface SSEEvent {
  event: string;
  data: unknown;
  id?: string;
}

// Event types from SSE
export type SSEEventType =
  | 'connected'
  | 'job.started'
  | 'job.progress'
  | 'job.completed'
  | 'job.failed'
  | 'parent.updated'
  | 'in_app_message'
  | 'heartbeat'
  | 'error';

export interface LiveActivityConfig {
  jobId: string;
  title: string;
  startProgress?: number;
}

/** Parent job with all its children */
export interface ParentWithChildren {
  parent: SeennJob;
  children: ChildJobSummary[];
}
