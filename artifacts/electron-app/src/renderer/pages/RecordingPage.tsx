import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecording } from "../hooks/useRecording";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { ROUTES } from "../App";
import type { Session, SessionMetadata } from "../../shared/types";
import styles from "./RecordingPage.module.css";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const RECORDING_CONFIG = {
  format: "webm" as const,
  videoEnabled: true,
  audioEnabled: true,
  screenCaptureEnabled: false,
  outputDirectory: "",
  filenameTemplate: "recording",
};

export function RecordingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const api = useElectronAPI();

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

  const [session, setSession] = useState<Session | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [postProcessing, setPostProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Load session metadata — auto-join Daily.co room if one exists
  useEffect(() => {
    if (!sessionId) return;
    api.session.get(sessionId).then((res) => {
      if (res.success && res.data) {
        setSession(res.data);
        // Auto-join: no manual button click needed when room URL is already set
        if (res.data.dailyRoomUrl) {
          setHasJoined(true);
        }
      }
    });
  }, [api, sessionId]);

  // Attach local camera preview (not the recording stream — just preview)
  useEffect(() => {
    let previewStream: MediaStream | null = null;
    const el = localVideoRef.current;
    if (!el) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        previewStream = stream;
        el.srcObject = stream;
      })
      .catch(() => {
        // Camera not available — ignore
      });

    return () => {
      previewStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Toggle local camera preview mute/off
  useEffect(() => {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    stream?.getVideoTracks().forEach((t) => (t.enabled = !isCameraOff));
  }, [isCameraOff]);

  const handleJoin = async () => {
    if (!sessionId) return;
    setIsJoining(true);
    try {
      const res = await api.session.join({ sessionId, displayName: "You" });
      if (res.success && res.data) {
        setSession(res.data);
        setHasJoined(true);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartRecording = async () => {
    await startRecording(RECORDING_CONFIG, sessionId);
  };

  const handleStopRecording = async () => {
    setPostProcessing(true);

    try {
      const stopResult = await stopRecording();
      if (!stopResult) return;

      // Run FFmpeg post-processing (stub) to finalize file
      const ffmpegRes = await api.ffmpeg.process({
        config: {
          operation: "extract-audio",
          inputPaths: [stopResult.outputFilePath],
          outputPath: stopResult.outputFilePath.replace(/\.[^.]+$/, "-audio.webm"),
        },
      });

      if (ffmpegRes.success && ffmpegRes.data) {
        // Persist audio path in session metadata
        if (sessionId) {
          const allRes = await api.session.loadAll();
          if (allRes.success && allRes.data) {
            const meta = allRes.data.find((m: SessionMetadata) => m.session.id === sessionId);
            if (meta) {
              meta.audioFilePath = ffmpegRes.data.outputPath ?? undefined;
              await api.session.save(meta);
            }
          }
        }
      }

      // Leave session
      if (sessionId) await api.session.leave(sessionId);

      navigate(ROUTES.REVIEW.replace(":recordingId", stopResult.recordingId));
    } finally {
      setPostProcessing(false);
    }
  };

  const handleLeave = async () => {
    if (sessionId) await api.session.leave(sessionId);
    navigate(ROUTES.LOBBY);
  };

  const isRecording = recordingStatus === "recording";
  const isPaused = recordingStatus === "paused";
  const isIdle = recordingStatus === "idle";
  const isStopping = recordingStatus === "stopping" || recordingStatus === "processing" || postProcessing;
  const dailyRoomUrl = session?.dailyRoomUrl;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={handleLeave}
            disabled={isRecording || isPaused || isStopping}
          >
            ← Lobby
          </button>
          <div className={styles.sessionTitle}>
            <span className={styles.sessionLabel}>Session</span>
            <span className={styles.sessionName}>{session?.title ?? sessionId}</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          {(isRecording || isPaused) && (
            <div className={styles.recBadge}>
              <span className={`${styles.recDot} ${isPaused ? styles.recDotPaused : ""}`} />
              {formatTime(elapsedSeconds)}
            </div>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {/* ── Video area ── */}
        <div className={styles.videoArea}>
          {dailyRoomUrl && hasJoined ? (
            <div className={styles.dailyWrapper}>
              <iframe
                className={styles.dailyFrame}
                src={`${dailyRoomUrl}?embed=1&showLeaveButton=0`}
                allow="camera; microphone; autoplay; display-capture; fullscreen"
                allowFullScreen
                title="Daily.co room"
              />
              {/* Local self-view overlay */}
              <div className={styles.selfView}>
                <video
                  ref={localVideoRef}
                  className={`${styles.localVideo} ${isCameraOff ? styles.localVideoOff : ""}`}
                  autoPlay
                  muted
                  playsInline
                />
              </div>
            </div>
          ) : (
            <div className={styles.localOnlyView}>
              {/* 16:9 constrained box */}
              <div className={styles.videoBox16x9}>
                <video
                  ref={localVideoRef}
                  className={`${styles.localVideoFull} ${isCameraOff ? styles.localVideoOff : ""}`}
                  autoPlay
                  muted
                  playsInline
                />
                {isCameraOff && (
                  <div className={styles.cameraOffOverlay}>
                    <span>Camera desligada</span>
                  </div>
                )}
              </div>
              {!dailyRoomUrl && (
                <div className={styles.noRoomHint}>
                  <span>Sem sala Daily.co — gravação local apenas</span>
                </div>
              )}
              {dailyRoomUrl && !hasJoined && (
                <div className={styles.joinOverlay}>
                  <p className={styles.joinRoomTitle}>{session?.title}</p>
                  <p className={styles.joinRoomUrl}>{dailyRoomUrl}</p>
                  <button
                    className={styles.joinRoomButton}
                    onClick={handleJoin}
                    disabled={isJoining}
                  >
                    {isJoining ? "Entrando..." : "Entrar na Chamada"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Controls bar ── */}
        <div className={styles.controls}>
          {/* Media toggles */}
          <div className={styles.mediaToggles}>
            <button
              className={`${styles.toggleBtn} ${isMuted ? styles.toggleActive : ""}`}
              onClick={() => setIsMuted((m) => !m)}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? "🔇" : "🎤"}
            </button>
            <button
              className={`${styles.toggleBtn} ${isCameraOff ? styles.toggleActive : ""}`}
              onClick={() => setIsCameraOff((c) => !c)}
              title={isCameraOff ? "Turn camera on" : "Turn camera off"}
            >
              {isCameraOff ? "📷" : "📹"}
            </button>
          </div>

          {/* Recording controls */}
          <div className={styles.recControls}>
            {error && <p className={styles.error}>{error}</p>}

            {isStopping ? (
              <div className={styles.processingRow}>
                <div className={styles.spinner} />
                <span>Post-processing recording...</span>
              </div>
            ) : isIdle ? (
              <button
                className={`${styles.recButton} ${styles.recButtonStart}`}
                onClick={handleStartRecording}
                disabled={isLoading}
              >
                <span className={styles.recButtonDot} />
                Start Recording
              </button>
            ) : isRecording ? (
              <div className={styles.activeControls}>
                <button
                  className={`${styles.recButton} ${styles.recButtonPause}`}
                  onClick={pauseRecording}
                  disabled={isLoading}
                >
                  ⏸ Pause
                </button>
                <button
                  className={`${styles.recButton} ${styles.recButtonStop}`}
                  onClick={handleStopRecording}
                  disabled={isLoading}
                >
                  ■ Stop
                </button>
              </div>
            ) : isPaused ? (
              <div className={styles.activeControls}>
                <button
                  className={`${styles.recButton} ${styles.recButtonResume}`}
                  onClick={resumeRecording}
                  disabled={isLoading}
                >
                  ▶ Resume
                </button>
                <button
                  className={`${styles.recButton} ${styles.recButtonStop}`}
                  onClick={handleStopRecording}
                  disabled={isLoading}
                >
                  ■ Stop
                </button>
              </div>
            ) : null}
          </div>

          {/* Leave */}
          <div className={styles.endControls}>
            <button
              className={styles.leaveButton}
              onClick={handleLeave}
              disabled={isRecording || isPaused || isStopping}
            >
              Leave
            </button>
          </div>
        </div>
      </main>

      {activeRecording && (
        <div className={styles.debugBar}>
          <span>Recording ID: {activeRecording.id}</span>
          {activeRecording.outputFilePath && (
            <span>→ {activeRecording.outputFilePath}</span>
          )}
        </div>
      )}
    </div>
  );
}
