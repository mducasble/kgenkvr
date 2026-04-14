import fs from "fs";
import path from "path";
import { app } from "electron";
import log from "electron-log";
import type { Session, SessionMetadata } from "../../shared/types";

/**
 * SessionPersistenceService — manages session folders and metadata JSON files.
 *
 * Each session lives in: userData/sessions/{sessionId}/
 *   session.json      — full SessionMetadata
 *   recording.webm    — raw recording chunks (written by RecordingService)
 *   audio.webm        — extracted audio (for transcription)
 *   transcript.json   — transcription result
 */
export class SessionPersistenceService {
  private readonly sessionsDir: string;

  constructor() {
    this.sessionsDir = path.join(app.getPath("userData"), "sessions");
    this.ensureDir(this.sessionsDir);
    log.info("SessionPersistenceService: sessions dir =", this.sessionsDir);
  }

  getSessionDir(sessionId: string): string {
    return path.join(this.sessionsDir, sessionId);
  }

  getMetadataPath(sessionId: string): string {
    return path.join(this.getSessionDir(sessionId), "session.json");
  }

  getRecordingPath(sessionId: string): string {
    return path.join(this.getSessionDir(sessionId), "recording.webm");
  }

  getAudioPath(sessionId: string): string {
    return path.join(this.getSessionDir(sessionId), "audio.webm");
  }

  getTranscriptPath(sessionId: string): string {
    return path.join(this.getSessionDir(sessionId), "transcript.json");
  }

  ensureSessionDir(sessionId: string): string {
    const dir = this.getSessionDir(sessionId);
    this.ensureDir(dir);
    return dir;
  }

  saveMetadata(metadata: SessionMetadata): void {
    const dir = this.ensureSessionDir(metadata.session.id);
    const filePath = path.join(dir, "session.json");
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), "utf-8");
    log.info("SessionPersistenceService: saved metadata for", metadata.session.id);
  }

  loadMetadata(sessionId: string): SessionMetadata | null {
    const filePath = this.getMetadataPath(sessionId);
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as SessionMetadata;
    } catch (err) {
      log.error("SessionPersistenceService: failed to load metadata for", sessionId, err);
      return null;
    }
  }

  loadAllMetadata(): SessionMetadata[] {
    if (!fs.existsSync(this.sessionsDir)) return [];
    const entries = fs.readdirSync(this.sessionsDir, { withFileTypes: true });
    const results: SessionMetadata[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const metadata = this.loadMetadata(entry.name);
      if (metadata) results.push(metadata);
    }
    return results.sort(
      (a, b) =>
        new Date(b.session.createdAt).getTime() -
        new Date(a.session.createdAt).getTime()
    );
  }

  updateSessionStatus(sessionId: string, status: Session["status"]): void {
    const metadata = this.loadMetadata(sessionId);
    if (!metadata) return;
    metadata.session.status = status;
    metadata.session.updatedAt = new Date().toISOString();
    this.saveMetadata(metadata);
  }

  updateRecordingInfo(
    sessionId: string,
    updates: Partial<Pick<SessionMetadata, "recordingFilePath" | "audioFilePath" | "transcriptionFilePath" | "totalDurationSeconds" | "fileSizeBytes">>
  ): void {
    const metadata = this.loadMetadata(sessionId);
    if (!metadata) return;
    Object.assign(metadata, updates);
    this.saveMetadata(metadata);
  }

  deleteSession(sessionId: string): void {
    const dir = this.getSessionDir(sessionId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      log.info("SessionPersistenceService: deleted session", sessionId);
    }
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
