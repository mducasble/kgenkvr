import fs from "fs";
import path from "path";
import log from "electron-log";
import type { LocalRecording, RecordingConfig, RecordingSegment } from "../../shared/types";
import { SessionPersistenceService } from "./SessionPersistenceService";

interface ActiveRecordingState {
  recording: LocalRecording;
  writeStream: fs.WriteStream;
  chunkCount: number;
  totalBytes: number;
  startedAt: number;
}

/**
 * RecordingService — receives audio/video chunks from the renderer process
 * and writes them to disk in the session folder.
 *
 * Flow:
 *   1. Renderer calls recording:start → creates session folder, opens write stream
 *   2. Renderer sends recording:write-chunk with ArrayBuffer data
 *   3. Renderer calls recording:stop → closes stream, updates metadata
 *   4. Main can then trigger FFmpeg processing on the output file
 */
export class RecordingService {
  private activeRecordings = new Map<string, ActiveRecordingState>();
  private persistence: SessionPersistenceService;

  constructor(persistence: SessionPersistenceService) {
    this.persistence = persistence;
  }

  startRecording(recordingId: string, sessionId: string, config: RecordingConfig): LocalRecording {
    log.info("RecordingService.startRecording", { recordingId, sessionId });

    const sessionDir = this.persistence.ensureSessionDir(sessionId);
    const outputPath = path.join(sessionDir, "recording.webm");

    const writeStream = fs.createWriteStream(outputPath, { flags: "w" });

    writeStream.on("error", (err: Error) => {
      log.error("RecordingService: write stream error", err);
    });

    const recording: LocalRecording = {
      id: recordingId,
      sessionId,
      title: `Recording ${new Date().toLocaleString()}`,
      status: "recording",
      config: { ...config, outputDirectory: sessionDir },
      segments: [],
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      outputFilePath: outputPath,
    };

    this.activeRecordings.set(recordingId, {
      recording,
      writeStream,
      chunkCount: 0,
      totalBytes: 0,
      startedAt: Date.now(),
    });

    return recording;
  }

  writeChunk(recordingId: string, chunk: ArrayBuffer): void {
    const state = this.activeRecordings.get(recordingId);
    if (!state) {
      log.warn("RecordingService.writeChunk: no active recording", recordingId);
      return;
    }
    const buffer = Buffer.from(chunk);
    state.writeStream.write(buffer);
    state.chunkCount++;
    state.totalBytes += buffer.byteLength;
  }

  stopRecording(recordingId: string): Promise<LocalRecording> {
    return new Promise((resolve, reject) => {
      const state = this.activeRecordings.get(recordingId);
      if (!state) {
        reject(new Error(`No active recording: ${recordingId}`));
        return;
      }

      state.writeStream.end(() => {
        const elapsed = Math.round((Date.now() - state.startedAt) / 1000);

        const outputPath = state.recording.outputFilePath!;
        let fileSize = 0;
        try {
          fileSize = fs.statSync(outputPath).size;
        } catch {
          // file may be empty if no chunks were received
        }

        const segment: RecordingSegment = {
          id: `seg-${state.chunkCount}`,
          filePath: outputPath,
          startedAt: state.recording.startedAt!,
          endedAt: new Date().toISOString(),
          durationSeconds: elapsed,
          fileSizeBytes: fileSize,
        };

        const finished: LocalRecording = {
          ...state.recording,
          status: "ready",
          segments: [segment],
          totalDurationSeconds: elapsed,
          totalFileSizeBytes: fileSize,
          endedAt: new Date().toISOString(),
        };

        this.activeRecordings.delete(recordingId);
        log.info("RecordingService: stopped", {
          recordingId,
          durationSeconds: elapsed,
          fileSizeBytes: fileSize,
          chunks: state.chunkCount,
        });

        resolve(finished);
      });
    });
  }

  pauseRecording(recordingId: string): void {
    const state = this.activeRecordings.get(recordingId);
    if (state) state.recording.status = "paused" as LocalRecording["status"];
  }

  resumeRecording(recordingId: string): void {
    const state = this.activeRecordings.get(recordingId);
    if (state) state.recording.status = "recording";
  }

  getRecording(recordingId: string): LocalRecording | null {
    return this.activeRecordings.get(recordingId)?.recording ?? null;
  }

  isActive(recordingId: string): boolean {
    return this.activeRecordings.has(recordingId);
  }
}
