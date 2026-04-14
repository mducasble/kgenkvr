import { useCallback, useEffect, useRef } from "react";
import { useRecordingStore } from "../stores/recordingStore";
import { useElectronAPI } from "./useElectronAPI";
import { recordingClientService } from "../services/RecordingClientService";
import type { RecordingConfig } from "../../shared/types";

export function useRecording() {
  const store = useRecordingStore();
  const api = useElectronAPI();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingIdRef = useRef<string | null>(null);

  const startTimer = useCallback(() => {
    store.setElapsedSeconds(0);
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
        // 1. Tell main process to prepare a recording slot
        const initResult = await api.recording.start({
          config,
          sessionId,
        });
        if (!initResult.success || !initResult.data) {
          throw new Error(initResult.error ?? "Failed to initialize recording");
        }

        const recordingId = initResult.data.id;
        recordingIdRef.current = recordingId;
        store.setActiveRecording(initResult.data);

        // 2. Start browser-side MediaRecorder
        await recordingClientService.startCapture(
          {
            mode: "camera",
            videoEnabled: config.videoEnabled,
            audioEnabled: config.audioEnabled,
          },
          async (chunk: ArrayBuffer) => {
            // Send each chunk to main process to write to disk
            await api.recording.writeChunk(recordingId, chunk);
          },
          (state) => {
            if (state === "recording") store.setRecordingStatus("recording");
            else if (state === "paused") store.setRecordingStatus("paused");
          }
        );

        store.setRecordingStatus("recording");
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
    const recordingId = recordingIdRef.current;
    if (!recordingId) return;

    store.setLoading(true);
    store.setRecordingStatus("stopping");
    stopTimer();

    try {
      // 1. Stop MediaRecorder (flushes final chunk)
      await recordingClientService.stop();

      // 2. Tell main to close the file stream
      const result = await api.recording.stop(recordingId);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to stop recording");
      }

      store.setRecordingStatus("processing");
      recordingIdRef.current = null;
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
    const recordingId = recordingIdRef.current;
    if (!recordingId) return;

    recordingClientService.pause();
    const result = await api.recording.pause(recordingId);
    if (result.success) {
      store.setRecordingStatus("paused");
      stopTimer();
    }
  }, [api, store, stopTimer]);

  const resumeRecording = useCallback(async () => {
    const recordingId = recordingIdRef.current;
    if (!recordingId) return;

    recordingClientService.resume();
    const result = await api.recording.resume(recordingId);
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
    localStream: recordingClientService.getStream(),
  };
}
