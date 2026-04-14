import fs from "fs";
import log from "electron-log";
import type { TranscriptionResult, TranscriptionLanguage } from "../../shared/types";

/**
 * ElevenLabsService — wraps ElevenLabs Speech-to-Text API for transcription.
 *
 * TODO: Implement real ElevenLabs API calls.
 * ElevenLabs API docs: https://elevenlabs.io/docs/api-reference/speech-to-text
 *
 * Required env vars:
 *   ELEVENLABS_API_KEY — your ElevenLabs API key
 *
 * Notes:
 *   - Supported audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
 *   - Max file size: 1GB (or use chunked upload for large files)
 *   - Supports speaker diarization
 *   - Supports 29 languages
 */
export class ElevenLabsService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.elevenlabs.io/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(options: {
    recordingId: string;
    audioFilePath: string;
    language?: TranscriptionLanguage;
    diarizationEnabled?: boolean;
  }): Promise<TranscriptionResult> {
    log.info("ElevenLabsService.transcribe", {
      recordingId: options.recordingId,
      audioFilePath: options.audioFilePath,
    });

    if (!fs.existsSync(options.audioFilePath)) {
      throw new Error(`Audio file not found: ${options.audioFilePath}`);
    }

    // TODO: Implement real ElevenLabs transcription
    // const audioBuffer = fs.readFileSync(options.audioFilePath);
    // const formData = new FormData();
    // formData.append("file", new Blob([audioBuffer]), path.basename(options.audioFilePath));
    // formData.append("model_id", "scribe_v1");
    // if (options.language) formData.append("language_code", options.language);
    // if (options.diarizationEnabled) formData.append("diarize", "true");
    //
    // const response = await fetch(`${this.baseUrl}/speech-to-text`, {
    //   method: "POST",
    //   headers: { "xi-api-key": this.apiKey },
    //   body: formData,
    // });
    // if (!response.ok) throw new Error(`ElevenLabs API error: ${response.statusText}`);
    // const result = await response.json();
    //
    // Map ElevenLabs response to TranscriptionResult type

    throw new Error("ElevenLabsService.transcribe not implemented");
  }

  async getTranscriptionStatus(jobId: string): Promise<{ status: string; progress?: number }> {
    log.info("ElevenLabsService.getTranscriptionStatus", jobId);
    // TODO: Poll ElevenLabs API for async job status if using async endpoint
    throw new Error("ElevenLabsService.getTranscriptionStatus not implemented");
  }
}
