import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { useUploadStore } from "../stores/uploadStore";
import { ROUTES } from "../App";
import type { LocalRecording, TranscriptionResult } from "../../shared/types";
import styles from "./ReviewPage.module.css";

export function ReviewPage() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const api = useElectronAPI();
  const uploadStore = useUploadStore();

  const [recording, setRecording] = useState<LocalRecording | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [isLoadingRecording, setIsLoadingRecording] = useState(true);
  const [isLoadingTranscription, setIsLoadingTranscription] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecording = async () => {
      if (!recordingId) return;
      setIsLoadingRecording(true);
      try {
        const result = await api.recording.getStatus(recordingId);
        if (result.success && result.data) {
          setRecording(result.data);
        }
      } catch {
        setError("Failed to load recording");
      } finally {
        setIsLoadingRecording(false);
      }
    };

    const loadTranscription = async () => {
      if (!recordingId) return;
      setIsLoadingTranscription(true);
      try {
        const result = await api.transcription.getResult(recordingId);
        if (result.success && result.data) {
          setTranscription(result.data);
        }
      } catch {
        // Transcription may not exist yet — silent
      } finally {
        setIsLoadingTranscription(false);
      }
    };

    loadRecording();
    loadTranscription();
  }, [api, recordingId]);

  const handleStartTranscription = async () => {
    if (!recording?.outputFilePath || !recordingId) return;
    try {
      const result = await api.transcription.start({
        recordingId,
        audioFilePath: recording.outputFilePath,
        language: "en",
        diarizationEnabled: true,
      });
      if (!result.success) throw new Error(result.error ?? "Failed to start transcription");
      // TODO: Poll for completion
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUpload = async () => {
    if (!recording?.outputFilePath || !recordingId) return;
    setIsUploading(true);
    try {
      const result = await api.upload.enqueue({
        recordingId,
        filePath: recording.outputFilePath,
      });
      if (!result.success) throw new Error(result.error ?? "Failed to enqueue upload");
      const queueResult = await api.upload.getQueue();
      if (queueResult.success && queueResult.data) {
        uploadStore.setQueue(queueResult.data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "--";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(ROUTES.LOBBY)}>
          ← Back to Lobby
        </button>
        <h1 className={styles.title}>Review Recording</h1>
      </header>

      <main className={styles.main}>
        {error && <p className={styles.error}>{error}</p>}

        {isLoadingRecording ? (
          <div className={styles.loading}>Loading recording...</div>
        ) : !recording ? (
          <div className={styles.empty}>Recording not found</div>
        ) : (
          <>
            <section className={styles.section}>
              <div className={styles.recordingCard}>
                <div className={styles.recordingIcon}>🎬</div>
                <div className={styles.recordingInfo}>
                  <h2 className={styles.recordingTitle}>{recording.title}</h2>
                  <div className={styles.recordingMeta}>
                    <span>Duration: {formatDuration(recording.totalDurationSeconds)}</span>
                    <span>·</span>
                    <span>Size: {formatFileSize(recording.totalFileSizeBytes)}</span>
                    <span>·</span>
                    <span className={`${styles.statusBadge} ${styles[`status_${recording.status}`]}`}>
                      {recording.status}
                    </span>
                  </div>
                  {recording.outputFilePath && (
                    <p className={styles.filePath}>{recording.outputFilePath}</p>
                  )}
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  className={`${styles.actionButton} ${styles.uploadButton}`}
                  onClick={handleUpload}
                  disabled={isUploading || !recording.outputFilePath}
                >
                  {isUploading ? "Queuing upload..." : "↑ Upload"}
                </button>
                <button
                  className={`${styles.actionButton} ${styles.transcribeButton}`}
                  onClick={handleStartTranscription}
                  disabled={isLoadingTranscription || !recording.outputFilePath}
                >
                  {isLoadingTranscription ? "..." : "⌨ Transcribe"}
                </button>
                {/* TODO: Add FFmpeg processing options (trim, compress, etc.) */}
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Transcription</h3>
              {isLoadingTranscription ? (
                <p className={styles.muted}>Checking for transcription...</p>
              ) : transcription ? (
                <div className={styles.transcriptionContainer}>
                  <div className={styles.transcriptionHeader}>
                    <span className={`${styles.statusBadge} ${styles[`status_${transcription.status}`]}`}>
                      {transcription.status}
                    </span>
                    <span className={styles.muted}>
                      {transcription.segments.length} segments · {transcription.language}
                    </span>
                  </div>
                  <div className={styles.transcriptText}>
                    {transcription.status === "completed" ? (
                      transcription.segments.map((seg) => (
                        <div key={seg.id} className={styles.transcriptSegment}>
                          {seg.speaker && (
                            <span className={styles.speaker}>{seg.speaker}:</span>
                          )}
                          <span className={styles.segmentText}>{seg.text}</span>
                          <span className={styles.timestamp}>
                            {seg.start.toFixed(1)}s
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className={styles.muted}>Transcription in progress...</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.emptyTranscription}>
                  <p className={styles.muted}>
                    No transcription yet. Click "Transcribe" to start.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
