import { create } from "zustand";
import type { Session, SessionParticipant } from "../../shared/types";

interface SessionStore {
  sessions: Session[];
  activeSession: Session | null;
  isLoading: boolean;
  error: string | null;

  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  removeSession: (sessionId: string) => void;

  setActiveSession: (session: Session | null) => void;
  updateActiveSession: (updates: Partial<Session>) => void;

  addParticipant: (participant: SessionParticipant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<SessionParticipant>) => void;

  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSessionStore = create<SessionStore>((set, _get) => ({
  sessions: [],
  activeSession: null,
  isLoading: false,
  error: null,

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({ sessions: [...state.sessions, session] })),

  updateSession: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
    })),

  removeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
    })),

  setActiveSession: (session) => set({ activeSession: session }),

  updateActiveSession: (updates) =>
    set((state) => ({
      activeSession: state.activeSession
        ? { ...state.activeSession, ...updates }
        : null,
    })),

  addParticipant: (participant) =>
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          participants: [...state.activeSession.participants, participant],
        },
      };
    }),

  removeParticipant: (participantId) =>
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          participants: state.activeSession.participants.filter(
            (p) => p.id !== participantId
          ),
        },
      };
    }),

  updateParticipant: (participantId, updates) =>
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          participants: state.activeSession.participants.map((p) =>
            p.id === participantId ? { ...p, ...updates } : p
          ),
        },
      };
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
