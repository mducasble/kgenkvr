import { IpcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import type { IpcResponse, FfmpegJob, FfmpegProcessPayload } from "../../shared/types";
import log from "electron-log";

export function registerFfmpegHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.FFMPEG.PROCESS, async (_event, payload: FfmpegProcessPayload): Promise<IpcResponse<FfmpegJob>> => {
    log.info("IPC: ffmpeg:process called", payload.config.operation);
    try {
      // TODO: Implement FFmpeg processing
      // 1. Create a FfmpegJob record
      // 2. Pass to FfmpegService to spawn ffmpeg subprocess
      // 3. Track progress and emit progress events to renderer
      // 4. Return job ID for status polling
      throw new Error("Not implemented");
    } catch (error) {
      log.error("ffmpeg:process error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.GET_JOB_STATUS, async (_event, jobId: string): Promise<IpcResponse<FfmpegJob>> => {
    log.info("IPC: ffmpeg:get-job-status called", jobId);
    try {
      // TODO: Look up job by ID from FfmpegService active jobs map
      throw new Error("Not implemented");
    } catch (error) {
      log.error("ffmpeg:get-job-status error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.CANCEL_JOB, async (_event, jobId: string): Promise<IpcResponse> => {
    log.info("IPC: ffmpeg:cancel-job called", jobId);
    try {
      // TODO: Kill the ffmpeg subprocess for this job
      throw new Error("Not implemented");
    } catch (error) {
      log.error("ffmpeg:cancel-job error", error);
      return { success: false, error: (error as Error).message };
    }
  });
}
