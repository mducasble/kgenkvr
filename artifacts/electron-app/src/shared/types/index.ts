export * from "./auth";
export * from "./session";
export * from "./recording";
export * from "./upload";
export * from "./ffmpeg";
export * from "./transcription";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AppConfig {
  version: string;
  platform: NodeJS.Platform;
  userDataPath: string;
  recordingsPath: string;
  logsPath: string;
  dailyApiKey?: string;
  elevenLabsApiKey?: string;
  uploadEndpoint?: string;
}

export interface IpcResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
