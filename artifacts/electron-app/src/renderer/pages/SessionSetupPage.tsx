import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../stores/sessionStore";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { ROUTES } from "../App";
import type { SessionConfig } from "../../shared/types";
import styles from "./SessionSetupPage.module.css";

const DEFAULT_CONFIG: Omit<SessionConfig, "title" | "description"> = {
  maxParticipants: 2,
  recordingEnabled: true,
  transcriptionEnabled: true,
  autoUpload: false,
};

export function SessionSetupPage() {
  const navigate = useNavigate();
  const api = useElectronAPI();
  const { addSession, setActiveSession, setLoading, setError, isLoading, error } =
    useSessionStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loadingStep, setLoadingStep] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1. Create Daily.co room automatically
      setLoadingStep("Criando sala Daily.co…");
      const roomRes = await api.daily.createRoom({
        maxParticipants: config.maxParticipants,
        expiresInSeconds: 60 * 60 * 4, // 4 hours
        enableRecording: false,
      });

      if (!roomRes.success) {
        throw new Error(
          `Não foi possível criar a sala Daily.co: ${roomRes.error ?? "credenciais não configuradas"}.\n` +
          `Verifique DAILY_API_KEY e DAILY_DOMAIN no arquivo .env e reinicie o app.`
        );
      }

      const dailyRoomUrl = (roomRes.data as { url: string }).url;

      // 2. Create session metadata
      setLoadingStep("Criando sessão…");
      const result = await api.session.create({
        title,
        description: description || undefined,
        config: {
          ...config,
          dailyRoomUrl,
        },
      });
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to create session");
      }
      addSession(result.data);
      setActiveSession(result.data);

      // 3. Join session
      const joinRes = await api.session.join({
        sessionId: result.data.id,
        roomUrl: dailyRoomUrl,
        displayName: "You",
      });
      if (joinRes.success && joinRes.data) {
        setActiveSession(joinRes.data);
      }

      navigate(ROUTES.RECORDING.replace(":sessionId", result.data.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const toggleBool = (key: keyof typeof config) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(ROUTES.LOBBY)}>
          ← Back
        </button>
        <h1 className={styles.title}>New Session</h1>
      </header>

      <main className={styles.main}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Details */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Session Details</h2>

            <div className={styles.field}>
              <label htmlFor="title" className={styles.label}>
                Title <span className={styles.required}>*</span>
              </label>
              <input
                id="title"
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Product Interview #4"
                required
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="description" className={styles.label}>
                Description
              </label>
              <textarea
                id="description"
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </section>

          {/* Daily.co — automatic */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Videochamada Daily.co</h2>
            <p className={styles.sectionHint}>
              Uma sala privada será criada automaticamente via API ao iniciar a sessão.
              O link será incorporado na tela de gravação.
            </p>
          </section>

          {/* Options */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recording Options</h2>

            <div className={styles.toggleList}>
              <label className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Local Recording</span>
                  <span className={styles.toggleDesc}>Save audio+video to disk during the session</span>
                </div>
                <input type="checkbox" className={styles.toggleInput} checked={config.recordingEnabled} onChange={() => toggleBool("recordingEnabled")} />
                <div className={`${styles.toggle} ${config.recordingEnabled ? styles.toggleOn : ""}`} />
              </label>

              <label className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Transcription</span>
                  <span className={styles.toggleDesc}>Auto-transcribe local audio after recording</span>
                </div>
                <input type="checkbox" className={styles.toggleInput} checked={config.transcriptionEnabled} onChange={() => toggleBool("transcriptionEnabled")} />
                <div className={`${styles.toggle} ${config.transcriptionEnabled ? styles.toggleOn : ""}`} />
              </label>

              <label className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Auto Upload</span>
                  <span className={styles.toggleDesc}>Enqueue file for upload when recording stops</span>
                </div>
                <input type="checkbox" className={styles.toggleInput} checked={config.autoUpload} onChange={() => toggleBool("autoUpload")} />
                <div className={`${styles.toggle} ${config.autoUpload ? styles.toggleOn : ""}`} />
              </label>
            </div>
          </section>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={() => navigate(ROUTES.LOBBY)}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={isLoading || !title.trim()}>
              {isLoading ? (loadingStep || "Aguarde…") : "Iniciar Sessão"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
