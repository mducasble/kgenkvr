import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../stores/sessionStore";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { ROUTES } from "../App";
import type { SessionConfig } from "../../shared/types";
import styles from "./SessionSetupPage.module.css";

const DEFAULT_CONFIG: Omit<SessionConfig, "title" | "description"> = {
  maxParticipants: 8,
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.session.create({
        title,
        description: description || undefined,
        config,
      });
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to create session");
      }
      addSession(result.data);
      setActiveSession(result.data);
      navigate(ROUTES.RECORDING.replace(":sessionId", result.data.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleConfig = (key: keyof typeof config) => {
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
                placeholder="e.g. Product Review Session"
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
                placeholder="Optional notes about this session..."
                rows={3}
              />
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recording Options</h2>

            <div className={styles.toggleList}>
              <label className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Enable Recording</span>
                  <span className={styles.toggleDesc}>
                    Record audio and video locally
                  </span>
                </div>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={config.recordingEnabled}
                  onChange={() => toggleConfig("recordingEnabled")}
                />
                <div className={`${styles.toggle} ${config.recordingEnabled ? styles.toggleOn : ""}`} />
              </label>

              <label className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Transcription</span>
                  <span className={styles.toggleDesc}>
                    Auto-transcribe via ElevenLabs after recording
                  </span>
                </div>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={config.transcriptionEnabled}
                  onChange={() => toggleConfig("transcriptionEnabled")}
                />
                <div className={`${styles.toggle} ${config.transcriptionEnabled ? styles.toggleOn : ""}`} />
              </label>

              <label className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Auto Upload</span>
                  <span className={styles.toggleDesc}>
                    Upload recording automatically when finished
                  </span>
                </div>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={config.autoUpload}
                  onChange={() => toggleConfig("autoUpload")}
                />
                <div className={`${styles.toggle} ${config.autoUpload ? styles.toggleOn : ""}`} />
              </label>
            </div>
          </section>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => navigate(ROUTES.LOBBY)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || !title.trim()}
            >
              {isLoading ? "Creating..." : "Create & Join Session"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
