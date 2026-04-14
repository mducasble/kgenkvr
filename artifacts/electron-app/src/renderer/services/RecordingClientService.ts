/**
 * RecordingClientService — manages browser-side MediaRecorder.
 *
 * Runs in the renderer process where browser media APIs are available.
 * Captured chunks are sent to main process via IPC for disk writes.
 *
 * TODO: Wire up chunk delivery to main process via window.electronAPI
 *
 * MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
 */

export type MediaRecorderState = "inactive" | "recording" | "paused";

export interface RecordingClientConfig {
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenCaptureEnabled: boolean;
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  chunkIntervalMs?: number;
}

export class RecordingClientService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private onChunk?: (chunk: Blob) => void;

  async startCapture(
    config: RecordingClientConfig,
    onChunk?: (chunk: Blob) => void
  ): Promise<void> {
    this.onChunk = onChunk;

    // TODO: Request permissions and build composite MediaStream
    // const streams: MediaStream[] = [];
    //
    // if (config.screenCaptureEnabled) {
    //   const screenStream = await navigator.mediaDevices.getDisplayMedia({
    //     video: true,
    //     audio: true,
    //   });
    //   streams.push(screenStream);
    // }
    //
    // if (config.videoEnabled || config.audioEnabled) {
    //   const cameraStream = await navigator.mediaDevices.getUserMedia({
    //     video: config.videoEnabled,
    //     audio: config.audioEnabled,
    //   });
    //   streams.push(cameraStream);
    // }
    //
    // this.stream = mergeStreams(streams); // Use AudioContext + canvas for composite
    //
    // const mimeType = config.mimeType ?? this.getBestMimeType();
    // this.mediaRecorder = new MediaRecorder(this.stream, {
    //   mimeType,
    //   videoBitsPerSecond: config.videoBitsPerSecond ?? 2_500_000,
    //   audioBitsPerSecond: config.audioBitsPerSecond ?? 128_000,
    // });
    //
    // this.mediaRecorder.ondataavailable = (event) => {
    //   if (event.data.size > 0) {
    //     this.chunks.push(event.data);
    //     this.onChunk?.(event.data);
    //   }
    // };
    //
    // this.mediaRecorder.start(config.chunkIntervalMs ?? 5000);

    throw new Error("RecordingClientService.startCapture not implemented");
  }

  stop(): Blob {
    if (!this.mediaRecorder) throw new Error("No active recording");

    this.mediaRecorder.stop();
    this.stream?.getTracks().forEach((track) => track.stop());

    const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
    this.chunks = [];
    this.mediaRecorder = null;
    this.stream = null;
    return blob;
  }

  pause(): void {
    this.mediaRecorder?.pause();
  }

  resume(): void {
    this.mediaRecorder?.resume();
  }

  getState(): MediaRecorderState {
    return (this.mediaRecorder?.state ?? "inactive") as MediaRecorderState;
  }

  private getBestMimeType(): string {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    return (
      candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm"
    );
  }
}

export const recordingClientService = new RecordingClientService();
