import { IpcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import type { IpcResponse, LocalRecording, RecordingStartPayload, RecordingStopResult } from "../../shared/types";
import log from "electron-log";

export function registerRecordingHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.RECORDING.START, async (_event, payload: RecordingStartPayload): Promise<IpcResponse<LocalRecording>> => {
    log.info("IPC: recording:start called", payload);
    try {
      // TODO: Implement recording start
      // 1. Request screen/audio permissions if not granted
      // 2. Initialize MediaRecorder via RecordingService
      // 3. Create local recording entry with unique ID
      // 4. Start writing segments to configured output directory
      throw new Error("Not implemented");
    } catch (error) {
      log.error("recording:start error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.STOP, async (_event, recordingId: string): Promise<IpcResponse<RecordingStopResult>> => {
    log.info("IPC: recording:stop called", recordingId);
    try {
      // TODO: Implement recording stop
      // 1. Stop the active MediaRecorder
      // 2. Finalize all segments
      // 3. Trigger FFmpeg post-processing (concatenate segments)
      // 4. Return output file path
      throw new Error("Not implemented");
    } catch (error) {
      log.error("recording:stop error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.PAUSE, async (_event, recordingId: string): Promise<IpcResponse> => {
    log.info("IPC: recording:pause called", recordingId);
    try {
      // TODO: Pause the active MediaRecorder
      throw new Error("Not implemented");
    } catch (error) {
      log.error("recording:pause error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.RESUME, async (_event, recordingId: string): Promise<IpcResponse> => {
    log.info("IPC: recording:resume called", recordingId);
    try {
      // TODO: Resume the paused MediaRecorder
      throw new Error("Not implemented");
    } catch (error) {
      log.error("recording:resume error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.GET_STATUS, async (_event, recordingId: string): Promise<IpcResponse<LocalRecording>> => {
    log.info("IPC: recording:get-status called", recordingId);
    try {
      // TODO: Return current status for the recording
      throw new Error("Not implemented");
    } catch (error) {
      log.error("recording:get-status error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.LIST_LOCAL, async (_event): Promise<IpcResponse<LocalRecording[]>> => {
    log.info("IPC: recording:list-local called");
    try {
      // TODO: Read local recordings index from electron-store or disk
      return { success: true, data: [] };
    } catch (error) {
      log.error("recording:list-local error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.DELETE_LOCAL, async (_event, recordingId: string): Promise<IpcResponse> => {
    log.info("IPC: recording:delete-local called", recordingId);
    try {
      // TODO: Delete recording files from disk and update local index
      throw new Error("Not implemented");
    } catch (error) {
      log.error("recording:delete-local error", error);
      return { success: false, error: (error as Error).message };
    }
  });
}
