import fs from "fs";
import log from "electron-log";
import type { TranscriptionResult, TranscriptionLanguage } from "../../shared/types";

/**
 * ElevenLabsService — speech-to-text transcription.
 *
 * MOCK IMPLEMENTATION for prototype. Returns a realistic 2-speaker transcript
 * after a short simulated delay. All segments reference realistic timestamps.
 *
 * For real integration, un-comment the fetch() calls and provide ELEVENLABS_API_KEY.
 * API docs: https://elevenlabs.io/docs/api-reference/speech-to-text
 */
export class ElevenLabsService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.elevenlabs.io/v1";
  private jobs = new Map<string, TranscriptionResult>();

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? "";
    if (!this.apiKey) {
      log.warn("ElevenLabsService: ELEVENLABS_API_KEY not set — using mock mode");
    }
  }

  async transcribe(options: {
    recordingId: string;
    audioFilePath: string;
    language?: TranscriptionLanguage;
    diarizationEnabled?: boolean;
  }): Promise<string> {
    log.info("ElevenLabsService.transcribe", {
      recordingId: options.recordingId,
      mode: this.apiKey ? "real" : "mock",
    });

    if (!fs.existsSync(options.audioFilePath)) {
      throw new Error(`Audio file not found: ${options.audioFilePath}`);
    }

    const jobId = `tx-${options.recordingId}-${Date.now()}`;

    if (this.apiKey) {
      return this.transcribeReal(options, jobId);
    }
    return this.transcribeMock(options, jobId);
  }

  private async transcribeReal(
    options: { recordingId: string; audioFilePath: string; language?: TranscriptionLanguage; diarizationEnabled?: boolean },
    jobId: string
  ): Promise<string> {
    // TODO: Implement real ElevenLabs API call
    // const audioBuffer = fs.readFileSync(options.audioFilePath);
    // const fileName = path.basename(options.audioFilePath);
    // const formData = new FormData();
    // formData.append("file", new Blob([audioBuffer]), fileName);
    // formData.append("model_id", "scribe_v1");
    // if (options.language) formData.append("language_code", options.language);
    // if (options.diarizationEnabled) formData.append("diarize", "true");
    //
    // const response = await fetch(`${this.baseUrl}/speech-to-text`, {
    //   method: "POST",
    //   headers: { "xi-api-key": this.apiKey },
    //   body: formData,
    // });
    // if (!response.ok) throw new Error(`ElevenLabs: ${response.status} ${response.statusText}`);
    // const raw = await response.json();
    // const result = this.mapApiResponse(raw, options.recordingId);
    // this.jobs.set(jobId, result);
    // return jobId;
    throw new Error("ElevenLabsService.transcribeReal: not yet implemented");
  }

  private async transcribeMock(
    options: { recordingId: string; language?: TranscriptionLanguage; diarizationEnabled?: boolean },
    jobId: string
  ): Promise<string> {
    // Set to processing immediately
    const pending: TranscriptionResult = {
      id: jobId,
      recordingId: options.recordingId,
      status: "processing",
      language: options.language ?? "en",
      text: "",
      segments: [],
      durationSeconds: 0,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, pending);

    // Simulate processing delay (2.5s)
    setTimeout(() => {
      const result = this.generateMockTranscript(jobId, options.recordingId, options.language ?? "en");
      this.jobs.set(jobId, result);
      log.info("ElevenLabsService: mock transcript ready", jobId);
    }, 2500);

    return jobId;
  }

  getJobStatus(jobId: string): TranscriptionResult | null {
    return this.jobs.get(jobId) ?? null;
  }

  saveResult(result: TranscriptionResult): void {
    this.jobs.set(result.id, result);
  }

  private generateMockTranscript(
    jobId: string,
    recordingId: string,
    language: TranscriptionLanguage
  ): TranscriptionResult {
    const segments = [
      { id: "s1", text: "Alright, let's kick things off. Can you hear me okay?", start: 0.0, end: 3.2, speaker: "Speaker A" },
      { id: "s2", text: "Yes, loud and clear. Audio sounds great on my end.", start: 3.8, end: 6.4, speaker: "Speaker B" },
      { id: "s3", text: "Perfect. So today I wanted to walk through the prototype we've been building.", start: 7.0, end: 11.5, speaker: "Speaker A" },
      { id: "s4", text: "Sure. Which part are we focusing on first?", start: 12.0, end: 14.2, speaker: "Speaker B" },
      { id: "s5", text: "Let's start with the recording flow — the start, pause, and stop controls.", start: 14.8, end: 19.0, speaker: "Speaker A" },
      { id: "s6", text: "Got it. I noticed the chunk-based write approach. That should handle interruptions well.", start: 19.5, end: 24.0, speaker: "Speaker B" },
      { id: "s7", text: "Exactly. And after stopping, we run the FFmpeg post-processing step automatically.", start: 24.6, end: 29.2, speaker: "Speaker A" },
      { id: "s8", text: "How long does that take on a typical session?", start: 29.8, end: 31.9, speaker: "Speaker B" },
      { id: "s9", text: "For the prototype it's a stub, so it's near instant. The real encoder will take maybe ten to thirty seconds.", start: 32.5, end: 38.0, speaker: "Speaker A" },
      { id: "s10", text: "Makes sense. And the transcription is the last step after that, right?", start: 38.5, end: 41.8, speaker: "Speaker B" },
      { id: "s11", text: "Correct. We extract audio first, send it to ElevenLabs, and display the result on the review page.", start: 42.3, end: 47.5, speaker: "Speaker A" },
      { id: "s12", text: "This looks really solid. Great work.", start: 48.0, end: 50.2, speaker: "Speaker B" },
    ];

    const enriched = segments.map((s) => ({
      ...s,
      words: s.text.split(" ").map((word, i) => ({
        word,
        start: s.start + (i * (s.end - s.start)) / s.text.split(" ").length,
        end: s.start + ((i + 1) * (s.end - s.start)) / s.text.split(" ").length,
        confidence: 0.92 + Math.random() * 0.07,
      })),
    }));

    const fullText = segments.map((s) => `${s.speaker}: ${s.text}`).join("\n");

    return {
      id: jobId,
      recordingId,
      status: "completed",
      language,
      text: fullText,
      segments: enriched,
      durationSeconds: 50.2,
      processingTimeMs: 2500,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }
}
