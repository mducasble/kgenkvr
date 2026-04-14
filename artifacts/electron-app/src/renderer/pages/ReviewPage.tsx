import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { ROUTES } from "../App";
import type { Session, TranscriptionResult } from "../../shared/types";
import styles from "./ReviewPage.module.css";

function formatDuration(seconds?: number): string {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ds = Math.round((seconds % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ds}`;
}

const SPEAKER_COLORS: Record<string, string> = {
  "Speaker A": "#60a5fa",
  "Speaker B": "#4ade80",
  "Speaker C": "#f59e0b",
  "Speaker D": "#e879f9",
};

function getSpeakerColor(speaker?: string): string {
  return SPEAKER_COLORS[speaker ?? ""] ?? "#94a3b8";
}

export function ReviewPage() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const api = useElectronAPI();

  const [session, setSession] = useState<Session | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "starting" | "processing" | "completed" | "failed">("idle");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load recording + session metadata on mount
  useEffect(() => {
    if (!recordingId) return;

    api.recording.getStatus(recordingId).then(async (recRes) => {
      if (recRes.success && recRes.data?.sessionId) {
        const sessRes = await api.session.get(recRes.data.sessionId);
        if (sessRes.success && sessRes.data) setSession(sessRes.data);
      }
    });

    // Check for existing saved transcript
    api.transcription.getResult(recordingId).then((txRes) => {
      if (txRes.success && txRes.data?.status === "completed") {
        setTranscription(txRes.data);
        setTxStatus("completed");
      }
    });
  }, [api, recordingId]);

  // Listen for upload progress pushed from main process
  useEffect(() => {
    const handler = (item: { recordingId: string; progress: number }) => {
      if (item.recordingId === recordingId) setUploadProgress(item.progress);
    };
    window.electronAPI?.on("upload:progress", handler as (...args: unknown[]) => void);
    return () => window.electronAPI?.off("upload:progress", handler as (...args: unknown[]) => void);
  }, [recordingId]);

  const startTranscription = async () => {
    if (!recordingId) return;
    setTxStatus("starting");

    const recRes = await api.recording.getStatus(recordingId);
    if (!recRes.success || !recRes.data) {
      setTxStatus("failed");
      return;
    }

    const audioPath =
      recRes.data.audioFilePath ?? recRes.data.outputFilePath ?? "";

    const txRes = await api.transcription.start({
      recordingId,
      audioFilePath: audioPath,
      language: "en",
      diarizationEnabled: true,
    });

    if (!txRes.success || !txRes.data) {
      setTxStatus("failed");
      return;
    }

    const jobId = txRes.data.jobId;
    setTxStatus("processing");

    // Poll every second until done
    pollRef.current = setInterval(async () => {
      const statusRes = await api.transcription.getStatus(jobId);
      if (!statusRes.success || !statusRes.data) return;
      const { status } = statusRes.data;

      if (status === "completed") {
        setTranscription(statusRes.data);
        setTxStatus("completed");
        clearInterval(pollRef.current!);
        pollRef.current = null;
      } else if (status === "failed") {
        setTxStatus("failed");
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 1000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleUpload = async () => {
    if (!recordingId) return;
    const recRes = await api.recording.getStatus(recordingId);
    if (!recRes.success || !recRes.data?.outputFilePath) return;
    await api.upload.enqueue({ recordingId, filePath: recRes.data.outputFilePath });
    setUploadProgress(0);
  };

  const handleCopyText = () => {
    if (!transcription) return;
    const text = transcription.segments
      .map((s) => `[${formatTimecode(s.start)}] ${s.speaker ?? "Speaker"}: ${s.text}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    showToast();
  };

  const handleExport = async () => {
    if (!transcription) return;
    setIsExporting(true);
    try {
      await navigator.clipboard.writeText(JSON.stringify(transcription, null, 2));
      showToast();
    } finally {
      setIsExporting(false);
    }
  };

  const showToast = () => {
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const isPolling = txStatus === "processing" || txStatus === "starting";
  const segments = transcription?.segments ?? [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(ROUTES.LOBBY)}>
          ← Lobby
        </button>
        <div className={styles.headerTitle}>
          <h1 className={styles.title}>{session?.title ?? "Session Review"}</h1>
          {session?.endedAt && (
            <span className={styles.subtitle}>
              {new Date(session.endedAt).toLocaleString()}
            </span>
          )}
        </div>
        <div className={styles.headerActions}>
          {recordingId && (
            <span className={styles.recId} title={recordingId}>
              ID: {recordingId.slice(0, 18)}…
            </span>
          )}
        </div>
      </header>

      <div className={styles.body}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          {/* Recording info */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Recording</h2>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Duration</span>
              <span className={styles.statValue}>
                {formatDuration(transcription?.durationSeconds)}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Participants</span>
              <span className={styles.statValue}>
                {session?.participants?.length ?? 2}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Format</span>
              <span className={styles.statValue}>WebM</span>
            </div>
          </div>

          {/* Upload */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Upload</h2>
            {uploadProgress === null ? (
              <button className={styles.actionButton} onClick={handleUpload}>
                ↑ Enqueue Upload
              </button>
            ) : uploadProgress < 100 ? (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className={styles.progressLabel}>{uploadProgress}%</span>
              </div>
            ) : (
              <div className={styles.successRow}>
                <span className={styles.successIcon}>✓</span>
                <span>Uploaded</span>
              </div>
            )}
          </div>

          {/* Transcription */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Transcription</h2>
            {txStatus === "idle" && (
              <button className={styles.actionButton} onClick={startTranscription}>
                ✦ Transcribe Audio
              </button>
            )}
            {isPolling && (
              <div className={styles.pollingRow}>
                <div className={styles.spinnerSmall} />
                <span>Transcribing…</span>
              </div>
            )}
            {txStatus === "completed" && (
              <div className={styles.successRow}>
                <span className={styles.successIcon}>✓</span>
                <span>{segments.length} segments</span>
              </div>
            )}
            {txStatus === "failed" && (
              <div className={styles.errorRow}>
                <span>Failed.</span>
                <button className={styles.retryLink} onClick={startTranscription}>
                  Retry
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Transcript area ── */}
        <main className={styles.main}>
          {txStatus === "idle" && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎙</div>
              <p className={styles.emptyTitle}>No transcript yet</p>
              <p className={styles.emptyText}>
                Click "Transcribe Audio" to generate a speaker-separated transcript.
              </p>
              <button className={styles.startTxButton} onClick={startTranscription}>
                Transcribe Audio
              </button>
            </div>
          )}

          {isPolling && (
            <div className={styles.loadingState}>
              <div className={styles.spinnerLarge} />
              <p className={styles.loadingText}>Transcribing audio…</p>
              <p className={styles.loadingHint}>Takes ~2–3 seconds with demo data</p>
            </div>
          )}

          {txStatus === "completed" && transcription && (
            <>
              <div className={styles.transcriptHeader}>
                <div className={styles.transcriptMeta}>
                  <span>{segments.length} segments</span>
                  <span>·</span>
                  <span>{transcription.text.split(" ").length} words</span>
                  <span>·</span>
                  <span>{formatDuration(transcription.durationSeconds)}</span>
                </div>
                <div className={styles.transcriptActions}>
                  <button
                    className={styles.iconButton}
                    onClick={handleCopyText}
                    title="Copy as plain text"
                  >
                    📋 Copy
                  </button>
                  <button
                    className={styles.iconButton}
                    onClick={handleExport}
                    disabled={isExporting}
                    title="Copy as JSON"
                  >
                    ↓ Export JSON
                  </button>
                </div>
              </div>

              <div className={styles.transcriptList}>
                {segments.map((seg) => (
                  <div
                    key={seg.id}
                    className={`${styles.segment} ${expandedSegment === seg.id ? styles.segmentExpanded : ""}`}
                    onClick={() =>
                      setExpandedSegment((prev) => (prev === seg.id ? null : seg.id))
                    }
                  >
                    <div className={styles.segmentHeader}>
                      <div
                        className={styles.speakerChip}
                        style={{ borderColor: getSpeakerColor(seg.speaker) }}
                      >
                        <span
                          className={styles.speakerDot}
                          style={{ background: getSpeakerColor(seg.speaker) }}
                        />
                        <span className={styles.speakerName}>{seg.speaker ?? "Speaker"}</span>
                      </div>
                      <span className={styles.timecode}>{formatTimecode(seg.start)}</span>
                      <span className={styles.timecodeEnd}>→ {formatTimecode(seg.end)}</span>
                    </div>

                    <p className={styles.segmentText}>{seg.text}</p>

                    {expandedSegment === seg.id && seg.words && seg.words.length > 0 && (
                      <div className={styles.wordList}>
                        {seg.words.map((word, wi) => (
                          <span
                            key={wi}
                            className={styles.word}
                            style={{
                              opacity: Math.max(0.4, word.confidence ?? 1),
                            }}
                            title={`${((word.confidence ?? 1) * 100).toFixed(0)}% confidence`}
                          >
                            {word.word}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {txStatus === "failed" && (
            <div className={styles.errorState}>
              <p>Transcription failed. Please try again.</p>
              <button className={styles.startTxButton} onClick={startTranscription}>
                Retry
              </button>
            </div>
          )}
        </main>
      </div>

      {copyToast && <div className={styles.toast}>Copied to clipboard</div>}
    </div>
  );
}
