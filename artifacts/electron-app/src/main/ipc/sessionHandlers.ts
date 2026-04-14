import { IpcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import type { IpcResponse, Session, SessionMetadata, CreateSessionPayload, JoinSessionPayload } from "../../shared/types";
import { SessionPersistenceService } from "../services/SessionPersistenceService";
import log from "electron-log";

let persistence: SessionPersistenceService;

function generateId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function registerSessionHandlers(ipcMain: IpcMain, persistenceService: SessionPersistenceService): void {
  persistence = persistenceService;

  ipcMain.handle(IPC_CHANNELS.SESSION.CREATE, async (_event, payload: CreateSessionPayload): Promise<IpcResponse<Session>> => {
    log.info("IPC: session:create", payload.title);
    try {
      const now = new Date().toISOString();
      const sessionId = generateId();

      const session: Session = {
        id: sessionId,
        title: payload.title,
        description: payload.description,
        status: "idle",
        config: {
          ...payload.config,
          title: payload.title,
          description: payload.description,
        },
        participants: [],
        hostId: "local-user",
        dailyRoomUrl: payload.config.dailyRoomUrl,
        createdAt: now,
        updatedAt: now,
      };

      const metadata: SessionMetadata = {
        session,
        sessionFolderPath: persistence.ensureSessionDir(sessionId),
      };
      persistence.saveMetadata(metadata);

      return { success: true, data: session };
    } catch (error) {
      log.error("session:create error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.JOIN, async (_event, payload: JoinSessionPayload): Promise<IpcResponse<Session>> => {
    log.info("IPC: session:join", payload.sessionId);
    try {
      const metadata = persistence.loadMetadata(payload.sessionId);
      if (!metadata) throw new Error(`Session not found: ${payload.sessionId}`);

      metadata.session.status = "active";
      metadata.session.updatedAt = new Date().toISOString();

      // If a room URL was provided at join time, update it
      if (payload.roomUrl) {
        metadata.session.dailyRoomUrl = payload.roomUrl;
        metadata.session.config.dailyRoomUrl = payload.roomUrl;
      }

      // Add local participant if not present
      const localExists = metadata.session.participants.some((p) => p.isLocal);
      if (!localExists) {
        metadata.session.participants.push({
          id: `p-local-${Date.now()}`,
          userId: "local-user",
          displayName: payload.displayName ?? "You",
          isLocal: true,
          isMuted: false,
          isCameraOff: false,
          joinedAt: new Date().toISOString(),
        });
      }

      persistence.saveMetadata(metadata);
      return { success: true, data: metadata.session };
    } catch (error) {
      log.error("session:join error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.LEAVE, async (_event, sessionId: string): Promise<IpcResponse> => {
    log.info("IPC: session:leave", sessionId);
    try {
      const metadata = persistence.loadMetadata(sessionId);
      if (!metadata) return { success: true };

      const participant = metadata.session.participants.find((p) => p.isLocal);
      if (participant) participant.leftAt = new Date().toISOString();

      const allLeft = metadata.session.participants.every((p) => p.leftAt);
      if (allLeft) {
        metadata.session.status = "ended";
        metadata.session.endedAt = new Date().toISOString();
      }
      metadata.session.updatedAt = new Date().toISOString();
      persistence.saveMetadata(metadata);

      return { success: true };
    } catch (error) {
      log.error("session:leave error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.LIST, async (): Promise<IpcResponse<Session[]>> => {
    log.info("IPC: session:list");
    try {
      const all = persistence.loadAllMetadata();
      const sessions = all.map((m) => m.session);
      return { success: true, data: sessions };
    } catch (error) {
      log.error("session:list error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.GET, async (_event, sessionId: string): Promise<IpcResponse<Session>> => {
    log.info("IPC: session:get", sessionId);
    try {
      const metadata = persistence.loadMetadata(sessionId);
      if (!metadata) throw new Error(`Session not found: ${sessionId}`);
      return { success: true, data: metadata.session };
    } catch (error) {
      log.error("session:get error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.SAVE, async (_event, metadata: SessionMetadata): Promise<IpcResponse> => {
    log.info("IPC: session:save", metadata.session.id);
    try {
      persistence.saveMetadata(metadata);
      return { success: true };
    } catch (error) {
      log.error("session:save error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.LOAD_ALL, async (): Promise<IpcResponse<SessionMetadata[]>> => {
    log.info("IPC: session:load-all");
    try {
      const all = persistence.loadAllMetadata();
      return { success: true, data: all };
    } catch (error) {
      log.error("session:load-all error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.DELETE, async (_event, sessionId: string): Promise<IpcResponse> => {
    log.info("IPC: session:delete", sessionId);
    try {
      persistence.deleteSession(sessionId);
      return { success: true };
    } catch (error) {
      log.error("session:delete error", error);
      return { success: false, error: (error as Error).message };
    }
  });
}
