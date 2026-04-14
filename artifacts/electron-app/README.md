# RecordingApp — Electron Desktop App

Desktop application for session recording, transcription, and upload. Built with **Electron + React + TypeScript + Vite**.

---

## Architecture

```
src/
├── main/                     # Electron main process (Node.js)
│   ├── main.ts               # App entry point, BrowserWindow, security config
│   ├── ipc/                  # IPC handlers (one file per domain)
│   │   ├── authHandlers.ts
│   │   ├── sessionHandlers.ts
│   │   ├── recordingHandlers.ts
│   │   ├── uploadHandlers.ts
│   │   ├── ffmpegHandlers.ts
│   │   ├── transcriptionHandlers.ts
│   │   └── systemHandlers.ts
│   └── services/             # Main-process services (Node.js / file system)
│       ├── DailyService.ts         → Daily.co REST API
│       ├── RecordingService.ts     → Recording lifecycle
│       ├── FfmpegService.ts        → FFmpeg post-processing
│       ├── ElevenLabsService.ts    → Transcription via ElevenLabs
│       └── UploadQueueService.ts   → Upload queue with retry
│
├── preload/
│   └── preload.ts            # contextBridge → window.electronAPI
│
├── renderer/                 # React app (Chromium / browser context)
│   ├── main.tsx              # React entry
│   ├── App.tsx               # Router + route definitions
│   ├── index.css             # Global CSS variables + reset
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── LobbyPage.tsx
│   │   ├── SessionSetupPage.tsx
│   │   ├── RecordingPage.tsx
│   │   └── ReviewPage.tsx
│   ├── stores/               # Zustand state management
│   │   ├── authStore.ts
│   │   ├── sessionStore.ts
│   │   ├── recordingStore.ts
│   │   └── uploadStore.ts
│   ├── hooks/
│   │   ├── useElectronAPI.ts       → Typed access to preload API
│   │   ├── useAuth.ts              → Login/logout actions
│   │   └── useRecording.ts         → Recording controls + timer
│   ├── components/
│   │   └── ProtectedRoute.tsx
│   └── services/             # Renderer-side browser services
│       ├── DailyClientService.ts   → Daily.co call object
│       └── RecordingClientService.ts → MediaRecorder wrapper
│
└── shared/                   # Shared between all processes
    ├── ipc/
    │   └── channels.ts       # IPC channel name constants
    └── types/                # TypeScript types
        ├── auth.ts
        ├── session.ts
        ├── recording.ts
        ├── upload.ts
        ├── ffmpeg.ts
        ├── transcription.ts
        └── index.ts
```

---

## Security Architecture

- **contextIsolation: true** — renderer cannot access Node.js APIs
- **nodeIntegration: false** — no `require` in renderer
- **sandbox: true** — renderer is OS-sandboxed
- **contextBridge** — only explicitly whitelisted APIs are exposed via `window.electronAPI`
- **IPC allowlist** — `on()` listener only accepts known event channels
- **URL validation** — `openExternal` restricts to http/https
- **Single instance** lock
- **webSecurity: true** — enforces CORS and CSP
- **CSP header** in renderer HTML restricts script/connect sources

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- (macOS packaging) Xcode command line tools
- (optional) `ffmpeg` in PATH for development; production uses `ffmpeg-static`

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

This starts the Vite renderer dev server on port 5173, then launches Electron pointing at it.

### Build

```bash
pnpm build
```

### Package for macOS

```bash
pnpm pack:mac
```

### Package for Windows

```bash
pnpm pack:win
```

### Package for all platforms

```bash
pnpm pack:all
```

Output is in the `release/` directory.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DAILY_API_KEY` | Yes | Daily.co REST API key |
| `DAILY_DOMAIN` | Yes | Daily.co subdomain |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key |
| `UPLOAD_ENDPOINT` | No | Upload destination URL |
| `API_BASE_URL` | No | Backend API base URL |
| `RECORDINGS_DIR` | No | Override recordings output dir |

---

## What Needs to Be Implemented

Search for `TODO:` comments in the codebase — each one describes exactly what to implement.

| Service | File | Status |
|---|---|---|
| Auth (login/logout) | `main/ipc/authHandlers.ts` | Placeholder |
| Daily.co room creation | `main/services/DailyService.ts` | Placeholder |
| Daily.co client join | `renderer/services/DailyClientService.ts` | Placeholder |
| Local recording | `main/services/RecordingService.ts` | Placeholder |
| MediaRecorder capture | `renderer/services/RecordingClientService.ts` | Placeholder |
| FFmpeg post-processing | `main/services/FfmpegService.ts` | Placeholder (arg builder) |
| ElevenLabs transcription | `main/services/ElevenLabsService.ts` | Placeholder |
| Upload queue | `main/services/UploadQueueService.ts` | Placeholder |
| Session management | `main/ipc/sessionHandlers.ts` | Placeholder |

---

## Pages

| Route | Component | Purpose |
|---|---|---|
| `/login` | `LoginPage` | Email + password login |
| `/lobby` | `LobbyPage` | List sessions, create new |
| `/session/setup` | `SessionSetupPage` | Configure new session |
| `/session/:sessionId/recording` | `RecordingPage` | Active call + recording controls |
| `/review/:recordingId` | `ReviewPage` | Playback, transcription, upload |

---

## IPC Channels

All IPC channels are typed in `src/shared/ipc/channels.ts`. The preload script exposes them as structured methods on `window.electronAPI`.

Domains: `auth`, `session`, `recording`, `upload`, `ffmpeg`, `transcription`, `system`
