import { IpcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import type { IpcResponse, LocalRecording, RecordingStartPayload, RecordingStopResult } from "../../shared/types";
import { RecordingService } from "../services/RecordingService";
import { SessionPersistenceService } from "../services/SessionPersistenceService";
import log from "electron-log";

function generateId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const localRecordingIndex = new Map<string, LocalRecording>();

export function registerRecordingHandlers(
  ipcMain: IpcMain,
  recordingService: RecordingService,
  persistence: SessionPersistenceService
): void {
  ipcMain.handle(IPC_CHANNELS.RECORDING.START, async (_event, payload: RecordingStartPayload): Promise<IpcResponse<LocalRecording>> => {
    log.info("IPC: recording:start", payload.sessionId);
    try {
      const recordingId = generateId();
      const sessionId = payload.sessionId ?? recordingId;

      const recording = recordingService.startRecording(recordingId, sessionId, payload.config);
      localRecordingIndex.set(recordingId, recording);

      // Update session metadata to link recording
      const metadata = persistence.loadMetadata(sessionId);
      if (metadata) {
        metadata.session.recordingId = recordingId;
        metadata.session.status = "recording";
        metadata.session.startedAt = recording.startedAt;
        metadata.session.updatedAt = new Date().toISOString();
        metadata.recordingFilePath = recording.outputFilePath;
        persistence.saveMetadata(metadata);
      }

      return { success: true, data: recording };
    } catch (error) {
      log.error("recording:start error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.WRITE_CHUNK, async (_event, recordingId: string, chunk: ArrayBuffer): Promise<IpcResponse> => {
    try {
      recordingService.writeChunk(recordingId, chunk);
      return { success: true };
    } catch (error) {
      log.error("recording:write-chunk error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.STOP, async (_event, recordingId: string): Promise<IpcResponse<RecordingStopResult>> => {
    log.info("IPC: recording:stop", recordingId);
    try {
      const finished = await recordingService.stopRecording(recordingId);
      localRecordingIndex.set(recordingId, finished);

      // Persist updated recording info
      if (finished.sessionId) {
        persistence.updateRecordingInfo(finished.sessionId, {
          recordingFilePath: finished.outputFilePath,
          totalDurationSeconds: finished.totalDurationSeconds,
          fileSizeBytes: finished.totalFileSizeBytes,
        });
        persistence.updateSessionStatus(finished.sessionId, "ended");
      }

      return {
        success: true,
        data: {
          recordingId: finished.id,
          segments: finished.segments,
          outputFilePath: finished.outputFilePath ?? "",
        },
      };
    } catch (error) {
      log.error("recording:stop error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.PAUSE, async (_event, recordingId: string): Promise<IpcResponse> => {
    log.info("IPC: recording:pause", recordingId);
    try {
      recordingService.pauseRecording(recordingId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.RESUME, async (_event, recordingId: string): Promise<IpcResponse> => {
    log.info("IPC: recording:resume", recordingId);
    try {
      recordingService.resumeRecording(recordingId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.GET_STATUS, async (_event, recordingId: string): Promise<IpcResponse<LocalRecording>> => {
    try {
      // Check active first
      const active = recordingService.getRecording(recordingId);
      if (active) return { success: true, data: active };

      // Fall back to persisted index
      const persisted = localRecordingIndex.get(recordingId);
      if (persisted) return { success: true, data: persisted };

      // Try to reconstruct from session metadata
      const allMeta = persistence.loadAllMetadata();
      for (const meta of allMeta) {
        if (meta.session.recordingId === recordingId) {
          const reconstructed: LocalRecording = {
            id: recordingId,
            sessionId: meta.session.id,
            title: meta.session.title,
            status: "ready",
            config: {
              format: "webm" as const,
              videoEnabled: true,
              audioEnabled: true,
              screenCaptureEnabled: false,
              outputDirectory: meta.sessionFolderPath,
              filenameTemplate: "recording",
            },
            segments: [],
            totalDurationSeconds: meta.totalDurationSeconds,
            totalFileSizeBytes: meta.fileSizeBytes,
            outputFilePath: meta.recordingFilePath,
            audioFilePath: meta.audioFilePath,
            startedAt: meta.session.startedAt,
            endedAt: meta.session.endedAt,
            createdAt: meta.session.createdAt,
          };
          localRecordingIndex.set(recordingId, reconstructed);
          return { success: true, data: reconstructed };
        }
      }

      return { success: false, error: `Recording ${recordingId} not found` };
    } catch (error) {
      log.error("recording:get-status error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.LIST_LOCAL, async (): Promise<IpcResponse<LocalRecording[]>> => {
    try {
      const allMeta = persistence.loadAllMetadata();
      const recordings: LocalRecording[] = allMeta
        .filter((m) => m.session.recordingId)
        .map((m) => ({
          id: m.session.recordingId!,
          sessionId: m.session.id,
          title: m.session.title,
          status: "ready" as const,
          config: {
            format: "webm" as const,
            videoEnabled: true,
            audioEnabled: true,
            screenCaptureEnabled: false,
            outputDirectory: m.sessionFolderPath,
            filenameTemplate: "recording",
          },
          segments: [],
          totalDurationSeconds: m.totalDurationSeconds,
          totalFileSizeBytes: m.fileSizeBytes,
          outputFilePath: m.recordingFilePath,
          audioFilePath: m.audioFilePath,
          createdAt: m.session.createdAt,
        }));
      return { success: true, data: recordings };
    } catch (error) {
      log.error("recording:list-local error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.DELETE_LOCAL, async (_event, recordingId: string): Promise<IpcResponse> => {
    log.info("IPC: recording:delete-local", recordingId);
    try {
      localRecordingIndex.delete(recordingId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECORDING.FINALIZE, async (_event, recordingId: string): Promise<IpcResponse<LocalRecording>> => {
    log.info("IPC: recording:finalize", recordingId);
    try {
      const recording = localRecordingIndex.get(recordingId);
      if (!recording) return { success: false, error: "Recording not found" };
      return { success: true, data: recording };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
