/**
 * RecordingClientService — browser-side MediaRecorder wrapper.
 *
 * Captures audio+video from the user's camera/mic and delivers chunks
 * to the main process via the IPC bridge for disk writing.
 *
 * Chunk interval: 3 seconds — balances disk write frequency and data safety.
 * On stop(), any remaining data is flushed before the Promise resolves.
 */

export type CaptureMode = "camera" | "screen" | "audio-only";

export interface CaptureOptions {
  mode: CaptureMode;
  videoEnabled: boolean;
  audioEnabled: boolean;
  chunkIntervalMs?: number;
}

type ChunkCallback = (chunk: ArrayBuffer) => void;
type StateChangeCallback = (state: MediaRecorder["state"]) => void;

export class RecordingClientService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private onChunk?: ChunkCallback;
  private onStateChange?: StateChangeCallback;
  private pendingStop?: () => void;

  async startCapture(
    options: CaptureOptions,
    onChunk: ChunkCallback,
    onStateChange?: StateChangeCallback
  ): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      throw new Error("A capture is already active");
    }

    this.onChunk = onChunk;
    this.onStateChange = onStateChange;

    const stream = await this.buildStream(options);
    this.stream = stream;

    const mimeType = this.getBestMimeType(options.videoEnabled);
    const recorderOptions: MediaRecorderOptions = {
      mimeType,
      audioBitsPerSecond: 128_000,
    };
    if (options.videoEnabled) {
      recorderOptions.videoBitsPerSecond = 2_500_000;
    }

    this.mediaRecorder = new MediaRecorder(stream, recorderOptions);

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        const buffer = await event.data.arrayBuffer();
        this.onChunk?.(buffer);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.onStateChange?.("inactive");
      this.pendingStop?.();
      this.pendingStop = undefined;
    };

    this.mediaRecorder.onpause = () => this.onStateChange?.("paused");
    this.mediaRecorder.onresume = () => this.onStateChange?.("recording");

    this.mediaRecorder.start(options.chunkIntervalMs ?? 3000);
    this.onStateChange?.("recording");
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        this.cleanup();
        resolve();
        return;
      }

      this.pendingStop = () => {
        this.cleanup();
        resolve();
      };

      // Request final data chunk before stopping
      this.mediaRecorder.requestData();
      this.mediaRecorder.stop();
    });
  }

  pause(): void {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.pause();
    }
  }

  resume(): void {
    if (this.mediaRecorder?.state === "paused") {
      this.mediaRecorder.resume();
    }
  }

  getState(): MediaRecorder["state"] {
    return this.mediaRecorder?.state ?? "inactive";
  }

  getMimeType(): string {
    return this.mediaRecorder?.mimeType ?? "";
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  private async buildStream(options: CaptureOptions): Promise<MediaStream> {
    if (options.mode === "audio-only") {
      return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    if (options.mode === "screen") {
      // Screen capture — Electron exposes this via desktopCapturer-style display-capture
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      if (options.audioEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const tracks = [...screenStream.getTracks(), ...micStream.getAudioTracks()];
          return new MediaStream(tracks);
        } catch {
          // Mic failed — return screen-only
          return screenStream;
        }
      }
      return screenStream;
    }

    // Camera mode (default)
    return navigator.mediaDevices.getUserMedia({
      video: options.videoEnabled
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
        : false,
      audio: options.audioEnabled,
    });
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
  }

  private getBestMimeType(videoEnabled: boolean): string {
    if (!videoEnabled) {
      const audioCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
      return audioCandidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/webm";
    }
    const videoCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    return videoCandidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
  }
}

export const recordingClientService = new RecordingClientService();
