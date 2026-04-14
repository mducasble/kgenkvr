import { IpcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels";
import type { IpcResponse, User, AuthToken, LoginCredentials } from "../../shared/types";
import log from "electron-log";

// Prototype: in-memory session storage
// For real auth, use electron-store with encryption and your identity provider
let currentUser: User | null = null;
let currentToken: AuthToken | null = null;

export function registerAuthHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.AUTH.LOGIN, async (_event, credentials: LoginCredentials): Promise<IpcResponse<{ user: User; token: AuthToken }>> => {
    log.info("IPC: auth:login", credentials.email);
    try {
      // PROTOTYPE: Accept any non-empty email/password and return a mock user
      // TODO: Replace with real auth provider (Supabase, Firebase, custom JWT, etc.)
      if (!credentials.email || !credentials.password) {
        return { success: false, error: "Email and password are required" };
      }

      const user: User = {
        id: `user-${credentials.email.replace(/[^a-z0-9]/gi, "-")}`,
        email: credentials.email,
        displayName: credentials.email.split("@")[0],
        createdAt: new Date().toISOString(),
      };

      const token: AuthToken = {
        accessToken: `mock-token-${Date.now()}`,
        refreshToken: `mock-refresh-${Date.now()}`,
        expiresAt: Date.now() + 3600 * 1000 * 24,
      };

      currentUser = user;
      currentToken = token;

      return { success: true, data: { user, token } };
    } catch (error) {
      log.error("auth:login error", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH.LOGOUT, async (): Promise<IpcResponse> => {
    log.info("IPC: auth:logout");
    currentUser = null;
    currentToken = null;
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.AUTH.GET_CURRENT_USER, async (): Promise<IpcResponse<{ user: User; token: AuthToken } | null>> => {
    if (!currentUser || !currentToken) return { success: true, data: null };
    return { success: true, data: { user: currentUser, token: currentToken } };
  });
}
