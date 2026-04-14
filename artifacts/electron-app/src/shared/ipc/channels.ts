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
  },
  RECORDING: {
    START: "recording:start",
    STOP: "recording:stop",
    PAUSE: "recording:pause",
    RESUME: "recording:resume",
    GET_STATUS: "recording:get-status",
    LIST_LOCAL: "recording:list-local",
    DELETE_LOCAL: "recording:delete-local",
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
  },
  SYSTEM: {
    GET_APP_VERSION: "system:get-app-version",
    GET_PLATFORM: "system:get-platform",
    OPEN_EXTERNAL: "system:open-external",
    SHOW_SAVE_DIALOG: "system:show-save-dialog",
    SHOW_OPEN_DIALOG: "system:show-open-dialog",
  },
} as const;

export type IpcChannel =
  | (typeof IPC_CHANNELS.AUTH)[keyof typeof IPC_CHANNELS.AUTH]
  | (typeof IPC_CHANNELS.SESSION)[keyof typeof IPC_CHANNELS.SESSION]
  | (typeof IPC_CHANNELS.RECORDING)[keyof typeof IPC_CHANNELS.RECORDING]
  | (typeof IPC_CHANNELS.UPLOAD)[keyof typeof IPC_CHANNELS.UPLOAD]
  | (typeof IPC_CHANNELS.FFMPEG)[keyof typeof IPC_CHANNELS.FFMPEG]
  | (typeof IPC_CHANNELS.TRANSCRIPTION)[keyof typeof IPC_CHANNELS.TRANSCRIPTION]
  | (typeof IPC_CHANNELS.SYSTEM)[keyof typeof IPC_CHANNELS.SYSTEM];
