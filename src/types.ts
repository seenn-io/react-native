// Seenn React Native SDK Types
// MIT License - Open Source

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

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
  progress?: number;
  stage?: StageInfo;
  eta?: number;
  queue?: QueueInfo;
  result?: JobResult;
  error?: JobError;
  // Parent-Child
  parentJobId?: string;
  childProgressMode?: ChildProgressMode;
  children?: ChildJob[];
  childrenCompleted?: number;
  childrenTotal?: number;
  createdAt: string;
  updatedAt: string;
}

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
  id: string;
  label: string;
  index: number;
  total: number;
}

export interface QueueInfo {
  position: number;
  total: number;
  estimatedWaitSeconds?: number;
}

export interface JobResult {
  [key: string]: any;
}

export interface JobError {
  code: string;
  message: string;
  details?: any;
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
  data: any;
  id?: string;
}

// Event types from SSE
export type SSEEventType =
  | 'connected'
  | 'job.started'
  | 'job.progress'
  | 'job.completed'
  | 'job.failed'
  | 'job.cancelled'
  | 'child.progress'
  | 'in_app_message'
  | 'heartbeat'
  | 'error';

export interface LiveActivityConfig {
  jobId: string;
  title: string;
  startProgress?: number;
}
