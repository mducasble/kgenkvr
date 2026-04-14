export type UploadStatus =
  | "pending"
  | "preparing"
  | "uploading"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface UploadQueueItem {
  id: string;
  recordingId: string;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  status: UploadStatus;
  progress: number;
  uploadedBytes: number;
  destinationUrl?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  enqueuedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface EnqueueUploadPayload {
  recordingId: string;
  filePath: string;
  destinationUrl?: string;
}

export interface UploadQueueState {
  items: UploadQueueItem[];
  isProcessing: boolean;
  totalPending: number;
  totalCompleted: number;
  totalFailed: number;
}
