export const IPC_CHANNELS = {
  AUTH: {
    LOGIN: "auth:login",
    LOGOUT: "auth:logout",
    GET_CURRENT_USER: "auth:get-current-user",
  },
  SESSION: {
    CREATE: "session:create",
    JOIN: "session:join",
    LEAVE: "session:leave",
    LIST: "session:list",
    GET: "session:get",
    SAVE: "session:save",
    LOAD_ALL: "session:load-all",
    DELETE: "session:delete",
  },
  RECORDING: {
    START: "recording:start",
    STOP: "recording:stop",
    PAUSE: "recording:pause",
    RESUME: "recording:resume",
    GET_STATUS: "recording:get-status",
    LIST_LOCAL: "recording:list-local",
    DELETE_LOCAL: "recording:delete-local",
    WRITE_CHUNK: "recording:write-chunk",
    FINALIZE: "recording:finalize",
  },
  UPLOAD: {
    ENQUEUE: "upload:enqueue",
    GET_QUEUE: "upload:get-queue",
    RETRY: "upload:retry",
    CANCEL: "upload:cancel",
  },
  FFMPEG: {
    PROCESS: "ffmpeg:process",
    GET_JOB_STATUS: "ffmpeg:get-job-status",
    CANCEL_JOB: "ffmpeg:cancel-job",
  },
  TRANSCRIPTION: {
    START: "transcription:start",
    GET_STATUS: "transcription:get-status",
    GET_RESULT: "transcription:get-result",
    SAVE: "transcription:save",
  },
  DAILY: {
    CREATE_ROOM: "daily:create-room",
    DELETE_ROOM: "daily:delete-room",
    CREATE_TOKEN: "daily:create-token",
  },
  SYSTEM: {
    GET_APP_VERSION: "system:get-app-version",
    GET_PLATFORM: "system:get-platform",
    OPEN_EXTERNAL: "system:open-external",
    SHOW_SAVE_DIALOG: "system:show-save-dialog",
    SHOW_OPEN_DIALOG: "system:show-open-dialog",
    GET_USER_DATA_PATH: "system:get-user-data-path",
  },
} as const;

export type IpcChannel =
  | (typeof IPC_CHANNELS.AUTH)[keyof typeof IPC_CHANNELS.AUTH]
  | (typeof IPC_CHANNELS.SESSION)[keyof typeof IPC_CHANNELS.SESSION]
  | (typeof IPC_CHANNELS.RECORDING)[keyof typeof IPC_CHANNELS.RECORDING]
  | (typeof IPC_CHANNELS.UPLOAD)[keyof typeof IPC_CHANNELS.UPLOAD]
  | (typeof IPC_CHANNELS.FFMPEG)[keyof typeof IPC_CHANNELS.FFMPEG]
  | (typeof IPC_CHANNELS.TRANSCRIPTION)[keyof typeof IPC_CHANNELS.TRANSCRIPTION]
  | (typeof IPC_CHANNELS.DAILY)[keyof typeof IPC_CHANNELS.DAILY]
  | (typeof IPC_CHANNELS.SYSTEM)[keyof typeof IPC_CHANNELS.SYSTEM];

export const IPC_EVENTS = {
  UPLOAD_PROGRESS: "upload:progress",
  FFMPEG_PROGRESS: "ffmpeg:progress",
  TRANSCRIPTION_PROGRESS: "transcription:progress",
  RECORDING_CHUNK_WRITTEN: "recording:chunk-written",
} as const;
