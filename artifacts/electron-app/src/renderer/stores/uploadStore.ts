import { create } from "zustand";
import type { UploadQueueState, UploadQueueItem } from "../../shared/types";

interface UploadStore extends UploadQueueState {
  setQueue: (state: UploadQueueState) => void;
  updateItem: (id: string, updates: Partial<UploadQueueItem>) => void;
  removeItem: (id: string) => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  items: [],
  isProcessing: false,
  totalPending: 0,
  totalCompleted: 0,
  totalFailed: 0,

  setQueue: (queueState) => set(queueState),

  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}));
