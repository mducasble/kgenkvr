import { IpcMain } from "electron";
import fs from "fs";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import type { IpcResponse, TranscriptionResult, StartTranscriptionPayload } from "../../shared/types";
import { ElevenLabsService } from "../services/ElevenLabsService";
import { SessionPersistenceService } from "../services/SessionPersistenceService";
import log from "electron-log";

// In-memory job registry: jobId → TranscriptionResult
const jobRegistry = new Map<string, TranscriptionResult>();

export function registerTranscriptionHandlers(
  ipcMain: IpcMain,
  elevenLabsService: ElevenLabsService,
  persistence: SessionPersistenceService
): void {
  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION.START, async (_event, payload: StartTranscriptionPayload): Promise<IpcResponse<{ jobId: string }>> => {
    log.info("IPC: transcription:start", payload.recordingId);
    try {
      const jobId = await elevenLabsService.transcribe({
        recordingId: payload.recordingId,
        audioFilePath: payload.audioFilePath,
        language: payload.language,
        diarizationEnabled: payload.diarizationEnabled,
      });

      // Poll internally to persist result when it's done
      const pollInterval = setInterval(() => {
        const result = elevenLabsService.getJobStatus(jobId);
        if (!result) return;

        // Cache in registry
        jobRegistry.set(jobId, result);
        jobRegistry.set(payload.recordingId, result); // also index by recordingId

        if (result.status === "completed" || result.status === "failed") {
          clearInterval(pollInterval);

          // Persist transcript JSON to session folder
          const allMeta = persistence.loadAllMetadata();
          const meta = allMeta.find((m) => m.session.recordingId === payload.recordingId);
          if (meta) {
            const transcriptPath = persistence.getTranscriptPath(meta.session.id);
            fs.writeFileSync(transcriptPath, JSON.stringify(result, null, 2), "utf-8");
            persistence.updateRecordingInfo(meta.session.id, {
              transcriptionFilePath: transcriptPath,
            });
            log.info("Transcription saved to", transcriptPath);
          }
        }
      }, 500);

      return { success: true, data: { jobId } };
    } catch (error) {
      log.error("transcription:start error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION.GET_STATUS, async (_event, jobId: string): Promise<IpcResponse<TranscriptionResult>> => {
    try {
      const fromService = elevenLabsService.getJobStatus(jobId);
      if (fromService) return { success: true, data: fromService };
      const fromRegistry = jobRegistry.get(jobId);
      if (fromRegistry) return { success: true, data: fromRegistry };
      return { success: false, error: `Job ${jobId} not found` };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION.GET_RESULT, async (_event, recordingId: string): Promise<IpcResponse<TranscriptionResult>> => {
    log.info("IPC: transcription:get-result", recordingId);
    try {
      // 1. Check in-memory registry
      const inMemory = jobRegistry.get(recordingId);
      if (inMemory) return { success: true, data: inMemory };

      // 2. Look for saved transcript.json in session folder
      const allMeta = persistence.loadAllMetadata();
      const meta = allMeta.find((m) => m.session.recordingId === recordingId);
      if (meta?.transcriptionFilePath && fs.existsSync(meta.transcriptionFilePath)) {
        const raw = fs.readFileSync(meta.transcriptionFilePath, "utf-8");
        const result = JSON.parse(raw) as TranscriptionResult;
        jobRegistry.set(recordingId, result);
        return { success: true, data: result };
      }

      return { success: true, data: undefined as unknown as TranscriptionResult };
    } catch (error) {
      log.error("transcription:get-result error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION.SAVE, async (_event, result: TranscriptionResult): Promise<IpcResponse> => {
    log.info("IPC: transcription:save", result.recordingId);
    try {
      jobRegistry.set(result.id, result);
      jobRegistry.set(result.recordingId, result);
      elevenLabsService.saveResult(result);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
