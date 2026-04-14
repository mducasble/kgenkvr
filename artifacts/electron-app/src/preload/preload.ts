import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/ipc/channels";
import type {
  LoginCredentials,
  CreateSessionPayload,
  JoinSessionPayload,
  RecordingStartPayload,
  EnqueueUploadPayload,
  FfmpegProcessPayload,
  StartTranscriptionPayload,
} from "../shared/types";

const electronAPI = {
  auth: {
    login: (credentials: LoginCredentials) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH.LOGIN, credentials),
    logout: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH.LOGOUT),
    getCurrentUser: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH.GET_CURRENT_USER),
  },

  session: {
    create: (payload: CreateSessionPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION.CREATE, payload),
    join: (payload: JoinSessionPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION.JOIN, payload),
    leave: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION.LEAVE, sessionId),
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION.LIST),
    get: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION.GET, sessionId),
  },

  recording: {
    start: (payload: RecordingStartPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING.START, payload),
    stop: (recordingId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING.STOP, recordingId),
    pause: (recordingId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING.PAUSE, recordingId),
    resume: (recordingId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING.RESUME, recordingId),
    getStatus: (recordingId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING.GET_STATUS, recordingId),
    listLocal: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING.LIST_LOCAL),
    deleteLocal: (recordingId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING.DELETE_LOCAL, recordingId),
  },

  upload: {
    enqueue: (payload: EnqueueUploadPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPLOAD.ENQUEUE, payload),
    getQueue: () =>
      ipcRenderer.invoke(IPC_CHANNELS.UPLOAD.GET_QUEUE),
    retry: (uploadId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPLOAD.RETRY, uploadId),
    cancel: (uploadId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPLOAD.CANCEL, uploadId),
  },

  ffmpeg: {
    process: (payload: FfmpegProcessPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.FFMPEG.PROCESS, payload),
    getJobStatus: (jobId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FFMPEG.GET_JOB_STATUS, jobId),
    cancelJob: (jobId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FFMPEG.CANCEL_JOB, jobId),
  },

  transcription: {
    start: (payload: StartTranscriptionPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIPTION.START, payload),
    getStatus: (jobId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIPTION.GET_STATUS, jobId),
    getResult: (recordingId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIPTION.GET_RESULT, recordingId),
  },

  system: {
    getAppVersion: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.GET_APP_VERSION),
    getPlatform: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.GET_PLATFORM),
    openExternal: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.OPEN_EXTERNAL, url),
    showSaveDialog: (options: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.SHOW_SAVE_DIALOG, options),
    showOpenDialog: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.SHOW_OPEN_DIALOG, options),
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const allowedChannels = [
      "recording:progress",
      "upload:progress",
      "ffmpeg:progress",
      "transcription:progress",
    ];
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
