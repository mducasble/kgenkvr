export type SessionStatus =
  | "idle"
  | "joining"
  | "active"
  | "recording"
  | "ended"
  | "error";

export interface SessionParticipant {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  isLocal: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  joinedAt: string;
  leftAt?: string;
}

export interface SessionConfig {
  title: string;
  description?: string;
  maxParticipants: number;
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  autoUpload: boolean;
  dailyRoomName?: string;
  dailyRoomUrl?: string;
  scheduledAt?: string;
}

export interface Session {
  id: string;
  title: string;
  description?: string;
  status: SessionStatus;
  config: SessionConfig;
  participants: SessionParticipant[];
  hostId: string;
  dailyRoomUrl?: string;
  recordingId?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMetadata {
  session: Session;
  recordingFilePath?: string;
  audioFilePath?: string;
  transcriptionFilePath?: string;
  sessionFolderPath: string;
  totalDurationSeconds?: number;
  fileSizeBytes?: number;
}

export interface CreateSessionPayload {
  title: string;
  description?: string;
  config: Omit<SessionConfig, "title" | "description">;
}

export interface JoinSessionPayload {
  sessionId: string;
  roomUrl?: string;
  displayName?: string;
}
