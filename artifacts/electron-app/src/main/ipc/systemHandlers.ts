import { IpcMain, shell, dialog, app } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import type { IpcResponse } from "../../shared/types";
import log from "electron-log";

export function registerSystemHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_APP_VERSION, async (): Promise<IpcResponse<string>> => {
    return { success: true, data: app.getVersion() };
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_PLATFORM, async (): Promise<IpcResponse<string>> => {
    return { success: true, data: process.platform };
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_USER_DATA_PATH, async (): Promise<IpcResponse<string>> => {
    return { success: true, data: app.getPath("userData") };
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM.OPEN_EXTERNAL, async (_event, url: string): Promise<IpcResponse> => {
    try {
      const parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return { success: false, error: "Only http/https URLs are allowed" };
      }
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      log.error("system:open-external error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM.SHOW_SAVE_DIALOG, async (_event, options: Electron.SaveDialogOptions): Promise<IpcResponse<string | undefined>> => {
    try {
      const result = await dialog.showSaveDialog(options);
      if (result.canceled) return { success: true, data: undefined };
      return { success: true, data: result.filePath };
    } catch (error) {
      log.error("system:show-save-dialog error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM.SHOW_OPEN_DIALOG, async (_event, options: Electron.OpenDialogOptions): Promise<IpcResponse<string[]>> => {
    try {
      const result = await dialog.showOpenDialog(options);
      if (result.canceled) return { success: true, data: [] };
      return { success: true, data: result.filePaths };
    } catch (error) {
      log.error("system:show-open-dialog error", error);
      return { success: false, error: (error as Error).message };
    }
  });
}
