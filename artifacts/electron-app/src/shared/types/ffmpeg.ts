export type FfmpegJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type FfmpegOperation =
  | "concat"
  | "transcode"
  | "extract-audio"
  | "compress"
  | "thumbnail"
  | "trim";

export interface FfmpegJobConfig {
  operation: FfmpegOperation;
  inputPaths: string[];
  outputPath: string;
  outputFormat?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  videoCodec?: string;
  audioCodec?: string;
  startTime?: number;
  endTime?: number;
  thumbnailTimestamp?: number;
  extraArgs?: string[];
}

export interface FfmpegJob {
  id: string;
  recordingId?: string;
  config: FfmpegJobConfig;
  status: FfmpegJobStatus;
  progress: number;
  outputPath?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface FfmpegProcessPayload {
  recordingId?: string;
  config: FfmpegJobConfig;
}
