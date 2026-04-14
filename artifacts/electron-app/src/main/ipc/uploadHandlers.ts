import { IpcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import type { IpcResponse, UploadQueueItem, EnqueueUploadPayload, UploadQueueState } from "../../shared/types";
import log from "electron-log";

export function registerUploadHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.UPLOAD.ENQUEUE, async (_event, payload: EnqueueUploadPayload): Promise<IpcResponse<UploadQueueItem>> => {
    log.info("IPC: upload:enqueue called", payload);
    try {
      // TODO: Implement upload enqueue
      // 1. Create a new UploadQueueItem
      // 2. Persist to electron-store
      // 3. Trigger UploadQueueService to process
      throw new Error("Not implemented");
    } catch (error) {
      log.error("upload:enqueue error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPLOAD.GET_QUEUE, async (_event): Promise<IpcResponse<UploadQueueState>> => {
    log.info("IPC: upload:get-queue called");
    try {
      // TODO: Return current upload queue state from UploadQueueService
      const emptyState: UploadQueueState = {
        items: [],
        isProcessing: false,
        totalPending: 0,
        totalCompleted: 0,
        totalFailed: 0,
      };
      return { success: true, data: emptyState };
    } catch (error) {
      log.error("upload:get-queue error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPLOAD.RETRY, async (_event, uploadId: string): Promise<IpcResponse> => {
    log.info("IPC: upload:retry called", uploadId);
    try {
      // TODO: Reset upload item status to pending and re-queue
      throw new Error("Not implemented");
    } catch (error) {
      log.error("upload:retry error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPLOAD.CANCEL, async (_event, uploadId: string): Promise<IpcResponse> => {
    log.info("IPC: upload:cancel called", uploadId);
    try {
      // TODO: Cancel active upload and remove from queue
      throw new Error("Not implemented");
    } catch (error) {
      log.error("upload:cancel error", error);
      return { success: false, error: (error as Error).message };
    }
  });
}
