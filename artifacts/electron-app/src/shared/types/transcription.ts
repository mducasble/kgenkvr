export type TranscriptionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type TranscriptionLanguage = "en" | "es" | "fr" | "de" | "pt" | "it" | "ja" | "zh";

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
  words: TranscriptionWord[];
}

export interface TranscriptionResult {
  id: string;
  recordingId: string;
  status: TranscriptionStatus;
  language: TranscriptionLanguage;
  text: string;
  segments: TranscriptionSegment[];
  durationSeconds: number;
  processingTimeMs?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface StartTranscriptionPayload {
  recordingId: string;
  audioFilePath: string;
  language?: TranscriptionLanguage;
  diarizationEnabled?: boolean;
}
