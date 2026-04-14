export type RecordingStatus =
  | "idle"
  | "starting"
  | "recording"
  | "paused"
  | "stopping"
  | "processing"
  | "ready"
  | "error";

export type RecordingFormat = "mp4" | "webm" | "mkv";

export interface RecordingConfig {
  format: RecordingFormat;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenCaptureEnabled: boolean;
  outputDirectory: string;
  filenameTemplate: string;
  maxFileSizeMb?: number;
  maxDurationSeconds?: number;
}

export interface RecordingSegment {
  id: string;
  filePath: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
}

export interface LocalRecording {
  id: string;
  sessionId?: string;
  title: string;
  status: RecordingStatus;
  config: RecordingConfig;
  segments: RecordingSegment[];
  totalDurationSeconds?: number;
  totalFileSizeBytes?: number;
  outputFilePath?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export interface RecordingStartPayload {
  sessionId?: string;
  config: RecordingConfig;
}

export interface RecordingStopResult {
  recordingId: string;
  segments: RecordingSegment[];
  outputFilePath: string;
}
