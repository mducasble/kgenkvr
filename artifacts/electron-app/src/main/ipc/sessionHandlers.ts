import { IpcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import type { IpcResponse, Session, CreateSessionPayload, JoinSessionPayload } from "../../shared/types";
import log from "electron-log";

export function registerSessionHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.SESSION.CREATE, async (_event, payload: CreateSessionPayload): Promise<IpcResponse<Session>> => {
    log.info("IPC: session:create called", payload);
    try {
      // TODO: Implement session creation
      // 1. Call your backend API to create a session record
      // 2. Call Daily.co API to create a room via DailyService
      // 3. Return the created session with Daily room URL
      throw new Error("Not implemented");
    } catch (error) {
      log.error("session:create error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.JOIN, async (_event, payload: JoinSessionPayload): Promise<IpcResponse<Session>> => {
    log.info("IPC: session:join called", payload);
    try {
      // TODO: Implement session join
      // 1. Retrieve session from backend
      // 2. Generate a Daily.co token for the participant
      // 3. Return session data with participant token
      throw new Error("Not implemented");
    } catch (error) {
      log.error("session:join error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.LEAVE, async (_event, sessionId: string): Promise<IpcResponse> => {
    log.info("IPC: session:leave called", sessionId);
    try {
      // TODO: Implement session leave
      // 1. Disconnect from Daily.co room
      // 2. Update session participant status on backend
      throw new Error("Not implemented");
    } catch (error) {
      log.error("session:leave error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.LIST, async (_event): Promise<IpcResponse<Session[]>> => {
    log.info("IPC: session:list called");
    try {
      // TODO: Implement session list
      // 1. Fetch sessions from backend API
      return { success: true, data: [] };
    } catch (error) {
      log.error("session:list error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION.GET, async (_event, sessionId: string): Promise<IpcResponse<Session>> => {
    log.info("IPC: session:get called", sessionId);
    try {
      // TODO: Implement session get
      throw new Error("Not implemented");
    } catch (error) {
      log.error("session:get error", error);
      return { success: false, error: (error as Error).message };
    }
  });
}
