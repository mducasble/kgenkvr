import { IpcMain, BrowserWindow } from "electron";
import { IPC_CHANNELS, IPC_EVENTS } from "../../shared/ipc/channels";
import type { IpcResponse, UploadQueueItem, EnqueueUploadPayload, UploadQueueState } from "../../shared/types";
import { UploadQueueService } from "../services/UploadQueueService";
import log from "electron-log";

export function registerUploadHandlers(ipcMain: IpcMain, uploadService: UploadQueueService): void {
  uploadService.onProgress((item) => {
    const wins = BrowserWindow.getAllWindows();
    for (const win of wins) {
      win.webContents.send(IPC_EVENTS.UPLOAD_PROGRESS, item);
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPLOAD.ENQUEUE, async (_event, payload: EnqueueUploadPayload): Promise<IpcResponse<UploadQueueItem>> => {
    log.info("IPC: upload:enqueue", payload.recordingId);
    try {
      const item = uploadService.enqueue(payload);
      return { success: true, data: item };
    } catch (error) {
      log.error("upload:enqueue error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPLOAD.GET_QUEUE, async (): Promise<IpcResponse<UploadQueueState>> => {
    try {
      return { success: true, data: uploadService.getState() };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPLOAD.RETRY, async (_event, uploadId: string): Promise<IpcResponse> => {
    log.info("IPC: upload:retry", uploadId);
    try {
      uploadService.retry(uploadId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPLOAD.CANCEL, async (_event, uploadId: string): Promise<IpcResponse> => {
    log.info("IPC: upload:cancel", uploadId);
    try {
      uploadService.cancel(uploadId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
