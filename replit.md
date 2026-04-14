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
Electron + React + TypeScript + Vite desktop application scaffold.

**Architecture:**
- `src/main/` — Electron main process: BrowserWindow, IPC handlers, Node.js services
- `src/preload/` — contextBridge exposing `window.electronAPI` to renderer
- `src/renderer/` — React app with Vite, React Router, Zustand
- `src/shared/` — Types and IPC channel constants shared across processes

**Pages:** LoginPage → LobbyPage → SessionSetupPage → RecordingPage → ReviewPage

**Services (placeholder, needs implementation):**
- `DailyService` — Daily.co room creation REST API (main process)
- `DailyClientService` — Daily.co call object/iframe (renderer)
- `RecordingService` — Recording lifecycle coordinator (main process)
- `RecordingClientService` — MediaRecorder wrapper (renderer)
- `FfmpegService` — FFmpeg post-processing subprocess (main process)
- `ElevenLabsService` — Speech-to-text via ElevenLabs API (main process)
- `UploadQueueService` — Persistent upload queue with retry (main process)

**Key commands (electron-app):**
- `pnpm --filter @workspace/electron-app run dev` — dev mode (Vite + Electron)
- `pnpm --filter @workspace/electron-app run build` — build all
- `pnpm --filter @workspace/electron-app run pack:mac` — package for macOS
- `pnpm --filter @workspace/electron-app run pack:win` — package for Windows

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
