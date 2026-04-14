import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useSessionStore } from "../stores/sessionStore";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../App";
import type { SessionMetadata } from "../../shared/types";
import styles from "./LobbyPage.module.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LobbyPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { setSessions } = useSessionStore();
  const api = useElectronAPI();
  const { logout } = useAuth();

  const [allMeta, setAllMeta] = useState<SessionMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const result = await api.session.loadAll();
      if (result.success && result.data) {
        setAllMeta(result.data);
        setSessions(result.data.map((m: SessionMetadata) => m.session));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleOpen = (meta: SessionMetadata) => {
    const { session } = meta;
    if (session.recordingId) {
      navigate(ROUTES.REVIEW.replace(":recordingId", session.recordingId));
    } else {
      navigate(ROUTES.RECORDING.replace(":sessionId", session.id));
    }
  };

  const handleRejoin = (sessionId: string) => {
    navigate(ROUTES.RECORDING.replace(":sessionId", sessionId));
  };

  const handleDelete = async (sessionId: string) => {
    await api.session.delete(sessionId);
    setDeleteConfirm(null);
    await loadSessions();
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const sessionsWithRecording = allMeta.filter((m: SessionMetadata) => m.session.recordingId);
  const sessionsWithoutRecording = allMeta.filter((m: SessionMetadata) => !m.session.recordingId && m.session.status !== "ended");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>●</span>
          <span className={styles.brandName}>RecordingApp</span>
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.displayName ?? user?.email}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        {/* ── New session CTA ── */}
        <div className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>Sessions</h1>
            <p className={styles.heroSubtitle}>
              {allMeta.length === 0
                ? "No sessions yet — start your first recording"
                : `${allMeta.length} session${allMeta.length === 1 ? "" : "s"} · ${sessionsWithRecording.length} with recordings`}
            </p>
          </div>
          <button
            className={styles.newButton}
            onClick={() => navigate(ROUTES.SESSION_SETUP)}
          >
            + New Session
          </button>
        </div>

        {isLoading ? (
          <div className={styles.loadingState}>Loading sessions...</div>
        ) : allMeta.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p className={styles.emptyTitle}>No sessions yet</p>
            <p className={styles.emptyText}>Create a session to start recording</p>
          </div>
        ) : (
          <>
            {/* ── Active / recent sessions (no recording yet) ── */}
            {sessionsWithoutRecording.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionHeading}>Open Sessions</h2>
                <div className={styles.list}>
                  {sessionsWithoutRecording.map((meta) => (
                    <div key={meta.session.id} className={styles.card}>
                      <div className={styles.cardLeft}>
                        <div className={styles.cardIcon}>🎙</div>
                        <div className={styles.cardInfo}>
                          <h3 className={styles.cardTitle}>{meta.session.title}</h3>
                          {meta.session.description && (
                            <p className={styles.cardDesc}>{meta.session.description}</p>
                          )}
                          <div className={styles.cardMeta}>
                            <span className={`${styles.badge} ${styles[`badge_${meta.session.status}`]}`}>
                              {meta.session.status}
                            </span>
                            <span className={styles.metaText}>{formatDate(meta.session.createdAt)}</span>
                            {meta.session.dailyRoomUrl && (
                              <span className={styles.metaText}>Daily.co</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.openButton}
                          onClick={() => handleRejoin(meta.session.id)}
                        >
                          Open
                        </button>
                        {deleteConfirm === meta.session.id ? (
                          <div className={styles.deleteConfirm}>
                            <span>Delete?</span>
                            <button
                              className={styles.deleteYes}
                              onClick={() => handleDelete(meta.session.id)}
                            >Yes</button>
                            <button
                              className={styles.deleteNo}
                              onClick={() => setDeleteConfirm(null)}
                            >No</button>
                          </div>
                        ) : (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => setDeleteConfirm(meta.session.id)}
                            title="Delete session"
                          >✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Past recordings ── */}
            {sessionsWithRecording.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionHeading}>Recordings</h2>
                <div className={styles.list}>
                  {sessionsWithRecording.map((meta) => (
                    <div key={meta.session.id} className={styles.card}>
                      <div className={styles.cardLeft}>
                        <div className={styles.cardIcon}>🎬</div>
                        <div className={styles.cardInfo}>
                          <h3 className={styles.cardTitle}>{meta.session.title}</h3>
                          <div className={styles.cardMeta}>
                            <span className={styles.metaText}>
                              {formatDuration(meta.totalDurationSeconds)}
                            </span>
                            <span className={styles.metaDot}>·</span>
                            <span className={styles.metaText}>
                              {meta.fileSizeBytes
                                ? `${(meta.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                                : "—"}
                            </span>
                            <span className={styles.metaDot}>·</span>
                            <span className={styles.metaText}>{formatDate(meta.session.createdAt)}</span>
                            {meta.transcriptionFilePath && (
                              <>
                                <span className={styles.metaDot}>·</span>
                                <span className={styles.transcribedBadge}>Transcribed</span>
                              </>
                            )}
                          </div>
                          {meta.recordingFilePath && (
                            <p className={styles.filePath}>{meta.recordingFilePath}</p>
                          )}
                        </div>
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.reviewButton}
                          onClick={() => handleOpen(meta)}
                        >
                          Review
                        </button>
                        {deleteConfirm === meta.session.id ? (
                          <div className={styles.deleteConfirm}>
                            <span>Delete?</span>
                            <button
                              className={styles.deleteYes}
                              onClick={() => handleDelete(meta.session.id)}
                            >Yes</button>
                            <button
                              className={styles.deleteNo}
                              onClick={() => setDeleteConfirm(null)}
                            >No</button>
                          </div>
                        ) : (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => setDeleteConfirm(meta.session.id)}
                            title="Delete session"
                          >✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
