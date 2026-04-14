import path from "path";
import { app } from "electron";
import log from "electron-log";
import type { LocalRecording, RecordingConfig, RecordingSegment } from "../../shared/types";

/**
 * RecordingService — manages local recording lifecycle using Node.js file system.
 *
 * TODO: Implement actual recording using one of:
 *   - Electron's desktopCapturer + MediaRecorder (renderer-side, via IPC)
 *   - ffmpeg-static for screen/audio capture
 *   - node-record-lpcm16 for audio-only
 *
 * Architecture note:
 *   The actual MediaStream capture runs in the renderer process (it needs browser APIs).
 *   The renderer should pipe recorded blobs back to main via IPC, and this service
 *   handles writing them to disk and tracking segments.
 */
export class RecordingService {
  private activeRecordings = new Map<string, LocalRecording>();
  private readonly recordingsDir: string;

  constructor() {
    this.recordingsDir = path.join(app.getPath("userData"), "recordings");
  }

  async startRecording(
    recordingId: string,
    config: RecordingConfig
  ): Promise<LocalRecording> {
    log.info("RecordingService.startRecording", recordingId);

    // TODO: Implement recording start
    // 1. Create output directory: path.join(this.recordingsDir, recordingId)
    // 2. Notify renderer to start MediaRecorder capture
    // 3. Set up IPC listener to receive recorded chunks
    // 4. Write chunks to disk as segments

    const recording: LocalRecording = {
      id: recordingId,
      title: `Recording ${new Date().toISOString()}`,
      status: "recording",
      config,
      segments: [],
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.activeRecordings.set(recordingId, recording);
    throw new Error("RecordingService.startRecording not implemented");
  }

  async stopRecording(recordingId: string): Promise<LocalRecording> {
    log.info("RecordingService.stopRecording", recordingId);

    const recording = this.activeRecordings.get(recordingId);
    if (!recording) throw new Error(`Recording ${recordingId} not found`);

    // TODO: Implement recording stop
    // 1. Signal renderer to stop MediaRecorder
    // 2. Flush remaining chunks to disk
    // 3. Update recording status to "processing"
    // 4. Trigger FFmpegService to concat segments

    throw new Error("RecordingService.stopRecording not implemented");
  }

  async pauseRecording(recordingId: string): Promise<void> {
    log.info("RecordingService.pauseRecording", recordingId);
    // TODO: Signal renderer to call MediaRecorder.pause()
    throw new Error("RecordingService.pauseRecording not implemented");
  }

  async resumeRecording(recordingId: string): Promise<void> {
    log.info("RecordingService.resumeRecording", recordingId);
    // TODO: Signal renderer to call MediaRecorder.resume()
    throw new Error("RecordingService.resumeRecording not implemented");
  }

  getRecording(recordingId: string): LocalRecording | undefined {
    return this.activeRecordings.get(recordingId);
  }

  addSegment(recordingId: string, segment: RecordingSegment): void {
    const recording = this.activeRecordings.get(recordingId);
    if (recording) {
      recording.segments.push(segment);
    }
  }

  getRecordingsDir(): string {
    return this.recordingsDir;
  }
}
