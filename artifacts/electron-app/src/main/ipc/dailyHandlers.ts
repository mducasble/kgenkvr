import { IpcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import { DailyService } from "../services/DailyService";
import log from "electron-log";

export function registerDailyHandlers(
  ipcMain: IpcMain,
  dailyService: DailyService | null
): void {
  ipcMain.handle(IPC_CHANNELS.DAILY.CREATE_ROOM, async (_event, options: {
    name?: string;
    privacy?: "public" | "private";
    maxParticipants?: number;
    expiresInSeconds?: number;
    enableRecording?: boolean;
  }) => {
    if (!dailyService) {
      return {
        success: false,
        error: "Daily.co não configurado. Defina DAILY_API_KEY e DAILY_DOMAIN nas variáveis de ambiente.",
      };
    }
    try {
      const room = await dailyService.createRoom(options);
      return { success: true, data: room };
    } catch (err) {
      log.error("daily:create-room error", err);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DAILY.DELETE_ROOM, async (_event, roomName: string) => {
    if (!dailyService) return { success: false, error: "Daily.co não configurado." };
    try {
      await dailyService.deleteRoom(roomName);
      return { success: true };
    } catch (err) {
      log.error("daily:delete-room error", err);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DAILY.CREATE_TOKEN, async (_event, options: {
    roomName: string;
    userId: string;
    displayName: string;
    isOwner?: boolean;
    expiresInSeconds?: number;
  }) => {
    if (!dailyService) return { success: false, error: "Daily.co não configurado." };
    try {
      const token = await dailyService.createMeetingToken(options);
      return { success: true, data: token };
    } catch (err) {
      log.error("daily:create-token error", err);
      return { success: false, error: (err as Error).message };
    }
  });
}
