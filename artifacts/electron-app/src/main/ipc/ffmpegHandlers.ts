import { IpcMain, BrowserWindow } from "electron";
import { IPC_CHANNELS, IPC_EVENTS } from "../../shared/ipc/channels";
import type { IpcResponse, FfmpegJob, FfmpegProcessPayload } from "../../shared/types";
import { FfmpegService } from "../services/FfmpegService";
import log from "electron-log";

function generateId(): string {
  return `ffmpeg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function registerFfmpegHandlers(ipcMain: IpcMain, ffmpegService: FfmpegService): void {
  ipcMain.handle(IPC_CHANNELS.FFMPEG.PROCESS, async (_event, payload: FfmpegProcessPayload): Promise<IpcResponse<FfmpegJob>> => {
    log.info("IPC: ffmpeg:process", payload.config.operation);
    try {
      const jobId = generateId();
      const job = await ffmpegService.processJob(payload.config, jobId);

      const wins = BrowserWindow.getAllWindows();
      for (const win of wins) {
        win.webContents.send(IPC_EVENTS.FFMPEG_PROGRESS, job);
      }

      return { success: true, data: job };
    } catch (error) {
      log.error("ffmpeg:process error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.GET_JOB_STATUS, async (_event, jobId: string): Promise<IpcResponse<FfmpegJob>> => {
    try {
      const job = ffmpegService.getJob(jobId);
      if (!job) return { success: false, error: `Job ${jobId} not found` };
      return { success: true, data: job };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.CANCEL_JOB, async (_event, jobId: string): Promise<IpcResponse> => {
    log.info("IPC: ffmpeg:cancel-job", jobId);
    try {
      ffmpegService.cancelJob(jobId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
