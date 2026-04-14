import { create } from "zustand";
import type { LocalRecording, RecordingStatus } from "../../shared/types";

interface RecordingStore {
  activeRecording: LocalRecording | null;
  localRecordings: LocalRecording[];
  recordingStatus: RecordingStatus;
  elapsedSeconds: number;
  isLoading: boolean;
  error: string | null;

  setActiveRecording: (recording: LocalRecording | null) => void;
  updateActiveRecording: (updates: Partial<LocalRecording>) => void;
  setLocalRecordings: (recordings: LocalRecording[]) => void;
  addLocalRecording: (recording: LocalRecording) => void;
  updateLocalRecording: (id: string, updates: Partial<LocalRecording>) => void;
  removeLocalRecording: (id: string) => void;

  setRecordingStatus: (status: RecordingStatus) => void;
  setElapsedSeconds: (seconds: number) => void;
  incrementElapsed: () => void;

  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  activeRecording: null,
  localRecordings: [],
  recordingStatus: "idle",
  elapsedSeconds: 0,
  isLoading: false,
  error: null,

  setActiveRecording: (recording) =>
    set({ activeRecording: recording, recordingStatus: recording?.status ?? "idle" }),

  updateActiveRecording: (updates) =>
    set((state) => ({
      activeRecording: state.activeRecording
        ? { ...state.activeRecording, ...updates }
        : null,
    })),

  setLocalRecordings: (recordings) => set({ localRecordings: recordings }),

  addLocalRecording: (recording) =>
    set((state) => ({ localRecordings: [...state.localRecordings, recording] })),

  updateLocalRecording: (id, updates) =>
    set((state) => ({
      localRecordings: state.localRecordings.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  removeLocalRecording: (id) =>
    set((state) => ({
      localRecordings: state.localRecordings.filter((r) => r.id !== id),
    })),

  setRecordingStatus: (status) => set({ recordingStatus: status }),
  setElapsedSeconds: (seconds) => set({ elapsedSeconds: seconds }),
  incrementElapsed: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
