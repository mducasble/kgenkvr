// Load .env using app.getAppPath() — always points to the folder containing package.json
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _appPath: string = require("electron").app.getAppPath();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _dotenvResult = require("dotenv").config({
  path: require("path").resolve(_appPath, ".env"),
});
(global as Record<string, unknown>).__dotenvPath =
  _dotenvResult.error ? null : require("path").resolve(_appPath, ".env");
(global as Record<string, unknown>).__dotenvError =
  _dotenvResult.error?.message ?? null;

import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { registerAuthHandlers } from "./ipc/authHandlers";
import { registerSessionHandlers } from "./ipc/sessionHandlers";
import { registerRecordingHandlers } from "./ipc/recordingHandlers";
import { registerUploadHandlers } from "./ipc/uploadHandlers";
import { registerFfmpegHandlers } from "./ipc/ffmpegHandlers";
import { registerTranscriptionHandlers } from "./ipc/transcriptionHandlers";
import { registerSystemHandlers } from "./ipc/systemHandlers";
import { registerDailyHandlers } from "./ipc/dailyHandlers";
import { SessionPersistenceService } from "./services/SessionPersistenceService";
import { RecordingService } from "./services/RecordingService";
import { FfmpegService } from "./services/FfmpegService";
import { ElevenLabsService } from "./services/ElevenLabsService";
import { UploadQueueService } from "./services/UploadQueueService";
import { DailyService } from "./services/DailyService";
import log from "electron-log";

const isDev = process.env.NODE_ENV === "development";

log.transports.file.level = "debug";
log.transports.console.level = isDev ? "debug" : "info";

// Report dotenv status now that logger is ready
const _dotenvPathUsed = (global as Record<string, unknown>).__dotenvPath as string | null;
const _dotenvErr = (global as Record<string, unknown>).__dotenvError as string | null;
if (_dotenvPathUsed) {
  log.info(`[dotenv] loaded from: ${_dotenvPathUsed}`);
} else {
  log.warn(`[dotenv] .env NOT loaded (app root: ${_appPath})`);
  if (_dotenvErr) log.warn(`[dotenv] reason: ${_dotenvErr}`);
  log.warn(`[dotenv] expected .env at: ${path.resolve(_appPath, ".env")}`);
}
log.info(`[env] DAILY_API_KEY=${process.env.DAILY_API_KEY ? "✓set" : "MISSING"} | DAILY_DOMAIN=${process.env.DAILY_DOMAIN ?? "MISSING"} | AWS_S3_BUCKET=${process.env.AWS_S3_BUCKET ?? "MISSING"}`);

let mainWindow: BrowserWindow | null = null;

// Instantiate services once at app startup
const persistence = new SessionPersistenceService();
const recordingService = new RecordingService(persistence);
const ffmpegService = new FfmpegService();
const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
const uploadService = new UploadQueueService();
const dailyService =
  process.env.DAILY_API_KEY && process.env.DAILY_DOMAIN
    ? new DailyService(process.env.DAILY_API_KEY, process.env.DAILY_DOMAIN)
    : null;
if (!dailyService) {
  log.warn("Daily.co não configurado — defina DAILY_API_KEY e DAILY_DOMAIN para criar salas automaticamente.");
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#0f0f0f",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Allow camera, microphone, and screen capture permissions
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const allowed = ["media", "mediaKeySystem", "geolocation", "display-capture"];
      callback(allowed.includes(permission));
    }
  );

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    log.info("Main window shown");
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Daily.co URLs to open (needed for iframe permissions)
    if (url.includes("daily.co")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  log.info(`App started in ${isDev ? "development" : "production"} mode`);
}

app.whenReady().then(() => {
  createWindow();

  registerAuthHandlers(ipcMain);
  registerSessionHandlers(ipcMain, persistence);
  registerRecordingHandlers(ipcMain, recordingService, persistence);
  registerUploadHandlers(ipcMain, uploadService);
  registerFfmpegHandlers(ipcMain, ffmpegService);
  registerTranscriptionHandlers(ipcMain, elevenLabsService, persistence);
  registerDailyHandlers(ipcMain, dailyService);
  registerSystemHandlers(ipcMain);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    // Allow navigation within Daily.co iframe
    if (navigationUrl.includes("daily.co")) return;
    event.preventDefault();
  });
  // Allow Daily.co to open in its own frame
  contents.setWindowOpenHandler(({ url }) => {
    if (url.includes("daily.co")) return { action: "allow" };
    return { action: "deny" };
  });
});

export { mainWindow };
