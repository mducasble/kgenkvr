import { useParams, useNavigate } from "react-router-dom";
import { useRecording } from "../hooks/useRecording";
import { ROUTES } from "../App";
import styles from "./RecordingPage.module.css";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const DEFAULT_RECORDING_CONFIG = {
  format: "mp4" as const,
  videoEnabled: true,
  audioEnabled: true,
  screenCaptureEnabled: false,
  outputDirectory: "",
  filenameTemplate: "recording-{date}-{time}",
};

export function RecordingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    activeRecording,
    recordingStatus,
    elapsedSeconds,
    isLoading,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useRecording();

  const handleStart = async () => {
    await startRecording(DEFAULT_RECORDING_CONFIG, sessionId);
  };

  const handleStop = async () => {
    const result = await stopRecording();
    if (result) {
      navigate(ROUTES.REVIEW.replace(":recordingId", result.recordingId));
    }
  };

  const isRecording = recordingStatus === "recording";
  const isPaused = recordingStatus === "paused";
  const isIdle = recordingStatus === "idle";
  const isProcessing = recordingStatus === "processing" || recordingStatus === "stopping";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate(ROUTES.LOBBY)}
          disabled={isRecording || isPaused}
        >
          ← Back to Lobby
        </button>
        <div className={styles.sessionId}>
          Session: <span>{sessionId}</span>
        </div>
      </header>

      <main className={styles.main}>
        {/* Daily.co video area placeholder */}
        <div className={styles.videoArea}>
          <div className={styles.videoPlaceholder}>
            {/* TODO: Integrate Daily.co React SDK or embed room URL */}
            <span className={styles.videoPlaceholderIcon}>🎥</span>
            <p className={styles.videoPlaceholderText}>
              Daily.co video call will appear here
            </p>
            <p className={styles.videoPlaceholderHint}>
              TODO: Embed Daily.co room URL from session config
            </p>
          </div>
        </div>

        {/* Recording controls */}
        <div className={styles.controls}>
          <div className={styles.statusRow}>
            <div className={`${styles.statusIndicator} ${styles[`indicator_${recordingStatus}`]}`} />
            <span className={styles.statusLabel}>
              {isIdle && "Ready to record"}
              {recordingStatus === "starting" && "Starting..."}
              {isRecording && "Recording"}
              {isPaused && "Paused"}
              {isProcessing && "Processing..."}
              {recordingStatus === "error" && "Error"}
            </span>
            {(isRecording || isPaused) && (
              <span className={styles.timer}>{formatTime(elapsedSeconds)}</span>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.buttons}>
            {isIdle && (
              <button
                className={`${styles.button} ${styles.recordButton}`}
                onClick={handleStart}
                disabled={isLoading}
              >
                ● Start Recording
              </button>
            )}

            {isRecording && (
              <>
                <button
                  className={`${styles.button} ${styles.pauseButton}`}
                  onClick={pauseRecording}
                  disabled={isLoading}
                >
                  ⏸ Pause
                </button>
                <button
                  className={`${styles.button} ${styles.stopButton}`}
                  onClick={handleStop}
                  disabled={isLoading}
                >
                  ■ Stop Recording
                </button>
              </>
            )}

            {isPaused && (
              <>
                <button
                  className={`${styles.button} ${styles.resumeButton}`}
                  onClick={resumeRecording}
                  disabled={isLoading}
                >
                  ▶ Resume
                </button>
                <button
                  className={`${styles.button} ${styles.stopButton}`}
                  onClick={handleStop}
                  disabled={isLoading}
                >
                  ■ Stop Recording
                </button>
              </>
            )}

            {isProcessing && (
              <div className={styles.processingState}>
                <span>Processing recording...</span>
              </div>
            )}
          </div>

          {activeRecording && (
            <div className={styles.recordingInfo}>
              <span className={styles.infoLabel}>ID:</span>
              <span className={styles.infoValue}>{activeRecording.id}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
