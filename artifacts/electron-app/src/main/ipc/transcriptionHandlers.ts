import { IpcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import type { IpcResponse, TranscriptionResult, StartTranscriptionPayload } from "../../shared/types";
import log from "electron-log";

export function registerTranscriptionHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION.START, async (_event, payload: StartTranscriptionPayload): Promise<IpcResponse<{ jobId: string }>> => {
    log.info("IPC: transcription:start called", payload.recordingId);
    try {
      // TODO: Implement transcription start
      // 1. Read audio file from filePath
      // 2. Call ElevenLabsService.transcribe() with the audio
      // 3. Store job ID for status polling
      // 4. Return jobId immediately (async processing)
      throw new Error("Not implemented");
    } catch (error) {
      log.error("transcription:start error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION.GET_STATUS, async (_event, jobId: string): Promise<IpcResponse<TranscriptionResult>> => {
    log.info("IPC: transcription:get-status called", jobId);
    try {
      // TODO: Poll ElevenLabsService for job status
      throw new Error("Not implemented");
    } catch (error) {
      log.error("transcription:get-status error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION.GET_RESULT, async (_event, recordingId: string): Promise<IpcResponse<TranscriptionResult>> => {
    log.info("IPC: transcription:get-result called", recordingId);
    try {
      // TODO: Retrieve stored transcription result for recording
      throw new Error("Not implemented");
    } catch (error) {
      log.error("transcription:get-result error", error);
      return { success: false, error: (error as Error).message };
    }
  });
}
