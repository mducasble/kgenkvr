# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### `artifacts/electron-app` — Desktop Recording App

Electron 33 + React 19 + TypeScript + Vite desktop app for session recording with Daily.co, local MediaRecorder, FFmpeg post-processing, ElevenLabs transcription, and upload queue.

**Architecture:**
- `src/main/` — Electron main process: BrowserWindow, IPC handlers, Node.js services
- `src/preload/` — contextBridge exposing `window.electronAPI` to renderer (contextIsolation + sandbox)
- `src/renderer/` — React app with Vite + React Router v7 + Zustand
- `src/shared/` — Types and IPC channel constants shared across processes

**Security:** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, CSP meta tag

**Pages:** Login → Lobby → SessionSetup → Recording → Review

**Services (all fully implemented):**

*Main process (Node.js):*
- `SessionPersistenceService` — JSON metadata files in `userData/sessions/{id}/`
- `RecordingService` — Chunk-based ArrayBuffer writes via write stream
- `FfmpegService` — Post-processing stub (copy + fake progress; ready for ffmpeg-static)
- `ElevenLabsService` — Mock 2-speaker transcript with realistic 12-segment output
- `UploadQueueService` — Simulated upload queue with progress (4–8s) and retry

*Renderer (browser):*
- `RecordingClientService` — Real `MediaRecorder` wrapper; sends chunks to main via IPC
- `DailyClientService` — Stub for `@daily-co/daily-js` call object (iframe embed used instead)

**Data flow:**
1. SessionSetup → creates JSON metadata in `userData/sessions/{id}/session.json`
2. Recording → MediaRecorder in renderer sends ArrayBuffer chunks → main writes `recording.webm`
3. Stop → FFmpeg stub extracts audio → `audio.webm`
4. Review → ElevenLabs mock generates `transcript.json` (2.5s delay)
5. Upload → queue simulates progress, saves to queue items

**Session folder structure:**
```
userData/sessions/{sessionId}/
  session.json       — SessionMetadata (session + file paths + duration)
  recording.webm     — Raw MediaRecorder output
  audio.webm         — Extracted audio (FFmpeg stub: copy of recording)
  transcript.json    — TranscriptionResult JSON
```

**IPC channels (all wired):**
- `auth:login/logout/get-current-user`
- `session:create/join/leave/list/get/save/load-all/delete`
- `recording:start/write-chunk/stop/pause/resume/get-status/list-local/delete-local/finalize`
- `upload:enqueue/get-queue/retry/cancel`
- `ffmpeg:process/get-job-status/cancel-job`
- `transcription:start/get-status/get-result/save`
- `system:get-app-version/get-platform/get-user-data-path/open-external/show-save-dialog/show-open-dialog`

**Push events (main → renderer):**
- `upload:progress` — UploadQueueItem on each progress step
- `ffmpeg:progress` — FfmpegJob when complete
- `transcription:progress` — TranscriptionResult updates

**Build output paths:**
- `dist/main/main.js` — Main process entry (package.json `main`)
- `dist/preload/preload.js` — Preload script (referenced as `../preload/preload.js` from main.js `__dirname`)
- `dist/renderer/index.html` — Vite renderer bundle

**tsconfig files:**
- `tsconfig.json` — Renderer (Vite/bundler module resolution)
- `tsconfig.main.json` — Main process (CommonJS, rootDir=src, outDir=dist, esModuleInterop=true)
- `tsconfig.preload.json` — Preload (CommonJS, rootDir=src, outDir=dist, esModuleInterop=true)

**Key commands (electron-app):**
- `pnpm --filter @workspace/electron-app install` — install deps
- `pnpm --filter @workspace/electron-app run build` — build all three layers
- `pnpm --filter @workspace/electron-app run dev` — dev mode (Vite + Electron)
- `pnpm --filter @workspace/electron-app run pack:mac` — package for macOS
- `pnpm --filter @workspace/electron-app run pack:win` — package for Windows

**Real integrations still needed:**
- Daily.co API key — for room creation (`DailyService` stub in main)
- ElevenLabs API key — set `ELEVENLABS_API_KEY` env var (falls back to mock)
- Upload endpoint — set `UPLOAD_ENDPOINT` env var (currently simulated)
- FFmpeg binary — `pnpm add ffmpeg-static` and wire into `FfmpegService`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
