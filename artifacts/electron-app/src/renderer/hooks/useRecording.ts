import { useCallback, useEffect, useRef } from "react";
import { useRecordingStore } from "../stores/recordingStore";
import { useElectronAPI } from "./useElectronAPI";
import type { RecordingConfig } from "../../shared/types";

export function useRecording() {
  const store = useRecordingStore();
  const api = useElectronAPI();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      store.incrementElapsed();
    }, 1000);
  }, [store]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const startRecording = useCallback(
    async (config: RecordingConfig, sessionId?: string) => {
      store.setLoading(true);
      store.setError(null);
      store.setRecordingStatus("starting");
      try {
        const result = await api.recording.start({ config, sessionId });
        if (!result.success || !result.data) {
          throw new Error(result.error ?? "Failed to start recording");
        }
        store.setActiveRecording(result.data);
        store.setElapsedSeconds(0);
        startTimer();
      } catch (err) {
        store.setRecordingStatus("error");
        store.setError((err as Error).message);
        throw err;
      } finally {
        store.setLoading(false);
      }
    },
    [api, store, startTimer]
  );

  const stopRecording = useCallback(async () => {
    if (!store.activeRecording) return;
    store.setLoading(true);
    store.setRecordingStatus("stopping");
    stopTimer();
    try {
      const result = await api.recording.stop(store.activeRecording.id);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to stop recording");
      }
      store.setRecordingStatus("processing");
      return result.data;
    } catch (err) {
      store.setRecordingStatus("error");
      store.setError((err as Error).message);
      throw err;
    } finally {
      store.setLoading(false);
    }
  }, [api, store, stopTimer]);

  const pauseRecording = useCallback(async () => {
    if (!store.activeRecording) return;
    const result = await api.recording.pause(store.activeRecording.id);
    if (result.success) store.setRecordingStatus("paused");
    stopTimer();
  }, [api, store, stopTimer]);

  const resumeRecording = useCallback(async () => {
    if (!store.activeRecording) return;
    const result = await api.recording.resume(store.activeRecording.id);
    if (result.success) {
      store.setRecordingStatus("recording");
      startTimer();
    }
  }, [api, store, startTimer]);

  return {
    activeRecording: store.activeRecording,
    recordingStatus: store.recordingStatus,
    elapsedSeconds: store.elapsedSeconds,
    isLoading: store.isLoading,
    error: store.error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
