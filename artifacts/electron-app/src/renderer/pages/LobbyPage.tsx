import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useSessionStore } from "../stores/sessionStore";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { ROUTES } from "../App";
import styles from "./LobbyPage.module.css";

export function LobbyPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { sessions, setSessions, isLoading } = useSessionStore();
  const api = useElectronAPI();

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const result = await api.session.list();
        if (result.success && result.data) {
          setSessions(result.data);
        }
      } catch {
        // TODO: Handle error
      }
    };
    loadSessions();
  }, [api, setSessions]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>●</span>
          <span className={styles.brandName}>RecordingApp</span>
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.displayName ?? user?.email}</span>
          {/* TODO: Add user menu / logout */}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Your Sessions</h1>
          <p className={styles.heroSubtitle}>
            Create a new session or join an existing one to start recording
          </p>
          <button
            className={styles.primaryButton}
            onClick={() => navigate(ROUTES.SESSION_SETUP)}
          >
            + New Session
          </button>
        </div>

        <section className={styles.sessionList}>
          {isLoading ? (
            <div className={styles.emptyState}>
              <p>Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <p className={styles.emptyTitle}>No sessions yet</p>
              <p className={styles.emptyText}>
                Create your first session to get started
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className={styles.sessionCard}>
                <div className={styles.sessionInfo}>
                  <h3 className={styles.sessionTitle}>{session.title}</h3>
                  {session.description && (
                    <p className={styles.sessionDesc}>{session.description}</p>
                  )}
                  <div className={styles.sessionMeta}>
                    <span className={`${styles.statusBadge} ${styles[`status_${session.status}`]}`}>
                      {session.status}
                    </span>
                    <span className={styles.sessionDate}>
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  className={styles.joinButton}
                  onClick={() =>
                    navigate(ROUTES.RECORDING.replace(":sessionId", session.id))
                  }
                >
                  Join
                </button>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
