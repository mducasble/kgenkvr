/**
 * Browser-mode mock for window.electronAPI.
 * Injected when running outside of Electron (e.g. Vite dev server in browser preview).
 * Provides a complete in-memory implementation so every page is fully navigable.
 */

import type {
  SessionMetadata,
  Session,
  LocalRecording,
  UploadQueueItem,
  UploadQueueState,
  FfmpegJob,
  TranscriptionResult,
} from "@shared/types/index";

// ── Helpers ───────────────────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── In-memory event bus ───────────────────────────────────────────────────────

const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

function emit(channel: string, ...args: unknown[]) {
  (listeners[channel] ?? []).forEach((cb) => cb(...args));
}

// ── State ─────────────────────────────────────────────────────────────────────

let currentUser: { id: string; email: string; displayName: string } | null = null;

const sessionsMap: Map<string, SessionMetadata> = new Map();
const recordingsMap: Map<string, LocalRecording> = new Map();
const uploadQueue: Map<string, UploadQueueItem> = new Map();
const ffmpegJobs: Map<string, FfmpegJob> = new Map();
const transcriptionJobs: Map<string, TranscriptionResult & { startedAt: number }> = new Map();
const transcriptsByRecording: Map<string, TranscriptionResult> = new Map();

// ── Seed data ─────────────────────────────────────────────────────────────────

function seedSessions() {
  const makeSession = (
    id: string,
    title: string,
    status: Session["status"],
    daysAgo: number,
    withRecording: boolean
  ): SessionMetadata => {
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    return {
      session: {
        id,
        title,
        description: "Demo session for preview",
        status,
        config: {
          title,
          maxParticipants: 2,
          recordingEnabled: true,
          transcriptionEnabled: true,
          autoUpload: false,
        },
        participants: [
          {
            id: uuid(),
            userId: "user-1",
            displayName: "Alice",
            isLocal: true,
            isMuted: false,
            isCameraOff: false,
            joinedAt: createdAt,
          },
          {
            id: uuid(),
            userId: "user-2",
            displayName: "Bob",
            isLocal: false,
            isMuted: false,
            isCameraOff: false,
            joinedAt: createdAt,
          },
        ],
        hostId: "user-1",
        createdAt,
        updatedAt: createdAt,
        startedAt: createdAt,
        endedAt: status === "ended" ? new Date(Date.now() - (daysAgo - 1) * 86_400_000 - 3600_000).toISOString() : undefined,
      },
      sessionFolderPath: `/mock/sessions/${id}`,
      recordingFilePath: withRecording ? `/mock/sessions/${id}/recording.webm` : undefined,
      audioFilePath: withRecording ? `/mock/sessions/${id}/audio.webm` : undefined,
      transcriptionFilePath: withRecording ? `/mock/sessions/${id}/transcript.json` : undefined,
      totalDurationSeconds: withRecording ? 2847 : undefined,
      fileSizeBytes: withRecording ? 187_432_100 : undefined,
    };
  };

  const s1 = makeSession("seed-1", "Prototype Session A", "ended", 3, true);
  const s2 = makeSession("seed-2", "User Research Interview", "ended", 7, true);
  const s3 = makeSession("seed-3", "Design Review", "idle", 1, false);

  sessionsMap.set(s1.session.id, s1);
  sessionsMap.set(s2.session.id, s2);
  sessionsMap.set(s3.session.id, s3);

  // Seed a recording for s1
  const rec1: LocalRecording = {
    id: "rec-seed-1",
    sessionId: "seed-1",
    title: "Prototype Session A",
    status: "ready",
    config: {
      format: "webm",
      videoEnabled: true,
      audioEnabled: true,
      screenCaptureEnabled: false,
      outputDirectory: "/mock/sessions/seed-1",
      filenameTemplate: "recording",
    },
    segments: [],
    totalDurationSeconds: 2847,
    totalFileSizeBytes: 187_432_100,
    outputFilePath: "/mock/sessions/seed-1/recording.webm",
    audioFilePath: "/mock/sessions/seed-1/audio.webm",
    startedAt: s1.session.startedAt,
    endedAt: s1.session.endedAt,
    createdAt: s1.session.createdAt,
  };
  recordingsMap.set(rec1.id, rec1);

  // Seed transcript for seed-1
  const transcript1 = buildMockTranscript("rec-seed-1", 2847);
  transcriptsByRecording.set("rec-seed-1", transcript1);
}

seedSessions();

// ── Transcript builder ────────────────────────────────────────────────────────

function buildMockTranscript(recordingId: string, durationSeconds = 120): TranscriptionResult {
  const lines = [
    { speaker: "speaker_0", text: "Alright, let's get started with the prototype review.", t: 0.5 },
    { speaker: "speaker_1", text: "Sounds good. I had a chance to go through the latest build.", t: 7.2 },
    { speaker: "speaker_0", text: "Great. What were your first impressions of the onboarding flow?", t: 13.8 },
    { speaker: "speaker_1", text: "Honestly it felt intuitive. The step indicator at the top really helps.", t: 20.4 },
    { speaker: "speaker_0", text: "We iterated on that three times. Glad it landed.", t: 28.1 },
    { speaker: "speaker_1", text: "One thing I noticed — the back button behavior was a bit unexpected on step two.", t: 34.9 },
    { speaker: "speaker_0", text: "Can you describe what happened?", t: 43.2 },
    { speaker: "speaker_1", text: "I clicked back and it took me all the way to step one instead of staying on the previous sub-section.", t: 47.6 },
    { speaker: "speaker_0", text: "Ah yeah, that's a known issue. We need to persist sub-step state in the router.", t: 58.3 },
    { speaker: "speaker_1", text: "Makes sense. Other than that the core flow felt very clean.", t: 66.7 },
    { speaker: "speaker_0", text: "Awesome. Let's move on to the recording page. Did you manage to test that?", t: 73.5 },
    { speaker: "speaker_1", text: "Yes! The camera preview is super snappy. I was impressed with the latency.", t: 80.9 },
  ];

  const segments = lines.map((line, i) => {
    const segEnd = lines[i + 1]?.t ?? durationSeconds;
    const words = line.text.split(" ").map((w, wi) => {
      const wordStart = line.t + wi * ((segEnd - line.t) / line.text.split(" ").length);
      return {
        word: w,
        start: Math.round(wordStart * 1000) / 1000,
        end: Math.round((wordStart + 0.4) * 1000) / 1000,
        confidence: 0.85 + Math.random() * 0.14,
        speaker: line.speaker,
      };
    });
    return {
      id: `seg-${i}`,
      text: line.text,
      start: line.t,
      end: segEnd,
      speaker: line.speaker,
      words,
    };
  });

  return {
    id: uuid(),
    recordingId,
    status: "completed",
    language: "en",
    text: lines.map((l) => l.text).join(" "),
    segments,
    durationSeconds,
    processingTimeMs: 2500,
    createdAt: now(),
    completedAt: now(),
  };
}

// ── Mock implementation ───────────────────────────────────────────────────────

export const browserMockAPI = {
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      await delay(600);
      currentUser = {
        id: uuid(),
        email: credentials.email,
        displayName: credentials.email.split("@")[0],
      };
      return { success: true, data: currentUser };
    },
    logout: async () => {
      await delay(200);
      currentUser = null;
      return { success: true };
    },
    getCurrentUser: async () => {
      return { success: true, data: currentUser };
    },
  },

  session: {
    create: async (payload: { title: string; description?: string; config: unknown }) => {
      await delay(300);
      const id = uuid();
      const cfg = payload.config as {
        maxParticipants: number;
        recordingEnabled: boolean;
        transcriptionEnabled: boolean;
        autoUpload: boolean;
        dailyRoomUrl?: string;
      };
      const session: Session = {
        id,
        title: payload.title,
        description: payload.description,
        status: "idle",
        config: {
          title: payload.title,
          description: payload.description,
          maxParticipants: cfg.maxParticipants ?? 2,
          recordingEnabled: cfg.recordingEnabled ?? true,
          transcriptionEnabled: cfg.transcriptionEnabled ?? true,
          autoUpload: cfg.autoUpload ?? false,
          dailyRoomUrl: cfg.dailyRoomUrl,
        },
        participants: [],
        hostId: currentUser?.id ?? "unknown",
        createdAt: now(),
        updatedAt: now(),
      };
      const meta: SessionMetadata = {
        session,
        sessionFolderPath: `/mock/sessions/${id}`,
      };
      sessionsMap.set(id, meta);
      return { success: true, data: meta };
    },

    join: async (payload: { sessionId: string }) => {
      await delay(200);
      const meta = sessionsMap.get(payload.sessionId);
      if (!meta) return { success: false, error: "Session not found" };
      meta.session.status = "active";
      return { success: true, data: meta };
    },

    leave: async (sessionId: string) => {
      await delay(200);
      const meta = sessionsMap.get(sessionId);
      if (meta) meta.session.status = "ended";
      return { success: true };
    },

    list: async () => {
      return { success: true, data: Array.from(sessionsMap.values()).map((m) => m.session) };
    },

    get: async (sessionId: string) => {
      const meta = sessionsMap.get(sessionId);
      return meta ? { success: true, data: meta.session } : { success: false, error: "Not found" };
    },

    save: async (metadata: SessionMetadata) => {
      sessionsMap.set(metadata.session.id, metadata);
      return { success: true };
    },

    loadAll: async () => {
      await delay(200);
      return { success: true, data: Array.from(sessionsMap.values()) };
    },

    delete: async (sessionId: string) => {
      await delay(300);
      sessionsMap.delete(sessionId);
      return { success: true };
    },
  },

  recording: {
    start: async (payload: { sessionId?: string; config: unknown }) => {
      await delay(300);
      const id = uuid();
      const rec: LocalRecording = {
        id,
        sessionId: payload.sessionId,
        title: "Recording " + new Date().toLocaleTimeString(),
        status: "recording",
        config: payload.config as LocalRecording["config"],
        segments: [],
        startedAt: now(),
        createdAt: now(),
      };
      recordingsMap.set(id, rec);
      return { success: true, data: rec };
    },

    stop: async (recordingId: string) => {
      await delay(400);
      const rec = recordingsMap.get(recordingId);
      if (!rec) return { success: false, error: "Not found" };
      rec.status = "processing";
      rec.endedAt = now();
      return {
        success: true,
        data: {
          recordingId,
          segments: rec.segments,
          outputFilePath: `/mock/sessions/${rec.sessionId}/recording.webm`,
        },
      };
    },

    pause: async (recordingId: string) => {
      const rec = recordingsMap.get(recordingId);
      if (rec) rec.status = "paused";
      return { success: true };
    },

    resume: async (recordingId: string) => {
      const rec = recordingsMap.get(recordingId);
      if (rec) rec.status = "recording";
      return { success: true };
    },

    getStatus: async (recordingId: string) => {
      const rec = recordingsMap.get(recordingId);
      return rec ? { success: true, data: rec } : { success: false, error: "Not found" };
    },

    listLocal: async () => {
      return { success: true, data: Array.from(recordingsMap.values()) };
    },

    deleteLocal: async (recordingId: string) => {
      recordingsMap.delete(recordingId);
      return { success: true };
    },

    writeChunk: async (_recordingId: string, _chunk: ArrayBuffer) => {
      return { success: true };
    },

    finalize: async (recordingId: string) => {
      await delay(200);
      const rec = recordingsMap.get(recordingId);
      if (rec) {
        rec.status = "ready";
        rec.outputFilePath = `/mock/sessions/${rec.sessionId}/recording.webm`;
        rec.audioFilePath = `/mock/sessions/${rec.sessionId}/audio.webm`;
      }
      return { success: true };
    },
  },

  upload: {
    enqueue: async (payload: { recordingId: string; filePath: string; destinationUrl?: string }) => {
      await delay(100);
      const item: UploadQueueItem = {
        id: uuid(),
        recordingId: payload.recordingId,
        filePath: payload.filePath,
        fileName: payload.filePath.split("/").pop() ?? "recording.webm",
        fileSizeBytes: 50_000_000,
        status: "pending",
        progress: 0,
        uploadedBytes: 0,
        destinationUrl: payload.destinationUrl ?? "https://upload.example.com/sessions",
        retryCount: 0,
        maxRetries: 3,
        enqueuedAt: now(),
      };
      uploadQueue.set(item.id, item);
      simulateUpload(item);
      return { success: true, data: item };
    },

    getQueue: async (): Promise<{ success: boolean; data: UploadQueueState }> => {
      const items = Array.from(uploadQueue.values());
      return {
        success: true,
        data: {
          items,
          isProcessing: items.some((i) => i.status === "uploading"),
          totalPending: items.filter((i) => i.status === "pending").length,
          totalCompleted: items.filter((i) => i.status === "completed").length,
          totalFailed: items.filter((i) => i.status === "failed").length,
        },
      };
    },

    retry: async (uploadId: string) => {
      const item = uploadQueue.get(uploadId);
      if (item) {
        item.status = "pending";
        item.progress = 0;
        item.uploadedBytes = 0;
        simulateUpload(item);
      }
      return { success: true };
    },

    cancel: async (uploadId: string) => {
      const item = uploadQueue.get(uploadId);
      if (item) item.status = "cancelled";
      return { success: true };
    },
  },

  ffmpeg: {
    process: async (payload: { recordingId?: string; config: unknown }) => {
      await delay(100);
      const id = uuid();
      const job: FfmpegJob = {
        id,
        recordingId: payload.recordingId,
        config: payload.config as FfmpegJob["config"],
        status: "running",
        progress: 0,
        createdAt: now(),
        startedAt: now(),
      };
      ffmpegJobs.set(id, job);
      simulateFfmpeg(job);
      return { success: true, data: job };
    },

    getJobStatus: async (jobId: string) => {
      const job = ffmpegJobs.get(jobId);
      return job ? { success: true, data: job } : { success: false, error: "Not found" };
    },

    cancelJob: async (jobId: string) => {
      const job = ffmpegJobs.get(jobId);
      if (job) job.status = "cancelled";
      return { success: true };
    },
  },

  transcription: {
    start: async (payload: { recordingId: string; audioFilePath: string }) => {
      await delay(200);
      const id = uuid();
      const job: TranscriptionResult & { startedAt: number } = {
        id,
        recordingId: payload.recordingId,
        status: "processing",
        language: "en",
        text: "",
        segments: [],
        durationSeconds: 0,
        createdAt: now(),
        startedAt: Date.now(),
      };
      transcriptionJobs.set(id, job);
      scheduleTranscriptionComplete(id, payload.recordingId);
      return { success: true, data: { jobId: id } };
    },

    getStatus: async (jobId: string) => {
      const job = transcriptionJobs.get(jobId);
      if (!job) return { success: false, error: "Job not found" };
      const elapsed = Date.now() - job.startedAt;
      if (elapsed >= 3000 && job.status === "processing") {
        const result = buildMockTranscript(job.recordingId);
        Object.assign(job, result, { startedAt: job.startedAt });
        transcriptsByRecording.set(job.recordingId, result);
      }
      return { success: true, data: { status: job.status, result: job.status === "completed" ? job : undefined } };
    },

    getResult: async (recordingId: string) => {
      const result = transcriptsByRecording.get(recordingId);
      return result ? { success: true, data: result } : { success: false, error: "No transcript found" };
    },

    save: async (result: TranscriptionResult) => {
      transcriptsByRecording.set(result.recordingId, result);
      return { success: true };
    },
  },

  daily: {
    createRoom: async (options?: { name?: string; maxParticipants?: number; expiresInSeconds?: number; enableRecording?: boolean }) => {
      const roomName = options?.name ?? `mock-room-${Date.now()}`;
      return {
        success: true,
        data: {
          id: `room_${roomName}`,
          name: roomName,
          url: `https://preview.daily.co/${roomName}`,
          privacy: "private",
          config: { max_participants: options?.maxParticipants ?? 2 },
          created_at: new Date().toISOString(),
        },
      };
    },
    deleteRoom: async (_roomName: string) => ({ success: true }),
    createToken: async (_options: unknown) => ({
      success: true,
      data: { token: "mock-meeting-token" },
    }),
  },

  system: {
    getAppVersion: async () => ({ success: true, data: "1.0.0-browser-preview" }),
    getPlatform: async () => ({ success: true, data: "browser" }),
    getUserDataPath: async () => ({ success: true, data: "/mock/userData" }),
    openExternal: async (url: string) => { window.open(url, "_blank"); return { success: true }; },
    showSaveDialog: async () => ({ success: true, data: { canceled: true } }),
    showOpenDialog: async () => ({ success: true, data: { canceled: true, filePaths: [] } }),
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (!listeners[channel]) listeners[channel] = [];
    listeners[channel].push(callback);
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    if (listeners[channel]) {
      listeners[channel] = listeners[channel].filter((cb) => cb !== callback);
    }
  },
};

// ── Background simulators ─────────────────────────────────────────────────────

function simulateUpload(item: UploadQueueItem) {
  const totalMs = 5000 + Math.random() * 3000;
  const stepMs = 400;
  let elapsed = 0;
  item.status = "uploading";
  item.startedAt = now();

  const tick = setInterval(() => {
    const current = uploadQueue.get(item.id);
    if (!current || current.status === "cancelled") {
      clearInterval(tick);
      return;
    }
    elapsed += stepMs;
    current.progress = Math.min(100, Math.round((elapsed / totalMs) * 100));
    current.uploadedBytes = Math.round((current.progress / 100) * current.fileSizeBytes);
    emit("upload:progress", { ...current });
    if (current.progress >= 100) {
      current.status = "completed";
      current.completedAt = now();
      clearInterval(tick);
      emit("upload:progress", { ...current });
    }
  }, stepMs);
}

function simulateFfmpeg(job: FfmpegJob) {
  const totalMs = 1500;
  const stepMs = 300;
  let elapsed = 0;
  const tick = setInterval(() => {
    elapsed += stepMs;
    job.progress = Math.min(100, Math.round((elapsed / totalMs) * 100));
    if (job.progress >= 100) {
      job.status = "completed";
      job.outputPath = "/mock/sessions/output.webm";
      job.completedAt = now();
      clearInterval(tick);
      emit("ffmpeg:progress", { ...job });
    }
  }, stepMs);
}

function scheduleTranscriptionComplete(jobId: string, recordingId: string) {
  setTimeout(() => {
    const job = transcriptionJobs.get(jobId);
    if (!job || job.status !== "processing") return;
    const result = buildMockTranscript(recordingId);
    Object.assign(job, result, { startedAt: job.startedAt });
    transcriptsByRecording.set(recordingId, result);
    emit("transcription:progress", { ...job });
  }, 3000);
}
