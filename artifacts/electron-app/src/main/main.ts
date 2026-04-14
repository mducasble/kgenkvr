import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { registerAuthHandlers } from "./ipc/authHandlers";
import { registerSessionHandlers } from "./ipc/sessionHandlers";
import { registerRecordingHandlers } from "./ipc/recordingHandlers";
import { registerUploadHandlers } from "./ipc/uploadHandlers";
import { registerFfmpegHandlers } from "./ipc/ffmpegHandlers";
import { registerTranscriptionHandlers } from "./ipc/transcriptionHandlers";
import { registerSystemHandlers } from "./ipc/systemHandlers";
import { IPC_CHANNELS } from "../shared/ipc/channels";
import log from "electron-log";

const isDev = process.env.NODE_ENV === "development";

log.transports.file.level = "debug";
log.transports.console.level = isDev ? "debug" : "info";

let mainWindow: BrowserWindow | null = null;

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

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    log.info("Main window shown");
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
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
  registerSessionHandlers(ipcMain);
  registerRecordingHandlers(ipcMain);
  registerUploadHandlers(ipcMain);
  registerFfmpegHandlers(ipcMain);
  registerTranscriptionHandlers(ipcMain);
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
  contents.on("will-navigate", (event, _navigationUrl) => {
    event.preventDefault();
  });
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
});

export { mainWindow };
