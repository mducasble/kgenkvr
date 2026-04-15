import log from "electron-log";

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  privacy: "public" | "private";
  config: DailyRoomConfig;
  created_at: string;
}

interface DailyRoomConfig {
  max_participants?: number;
  enable_recording?: string;
  exp?: number;
}

interface DailyMeetingToken {
  token: string;
}

/**
 * DailyService — wrapper around the Daily.co REST API.
 *
 * TODO: Replace placeholder implementations with real Daily.co API calls.
 * Daily.co API docs: https://docs.daily.co/reference/rest-api
 *
 * Required env vars:
 *   DAILY_API_KEY — your Daily.co API key
 *   DAILY_DOMAIN  — your Daily.co domain (e.g. mycompany.daily.co)
 */
export class DailyService {
  private readonly apiKey: string;
  private readonly domain: string;
  private readonly baseUrl = "https://api.daily.co/v1";

  constructor(apiKey: string, domain: string) {
    this.apiKey = apiKey;
    this.domain = domain;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async createRoom(options: {
    name?: string;
    privacy?: "public" | "private";
    maxParticipants?: number;
    expiresInSeconds?: number;
    enableRecording?: boolean;
  }): Promise<DailyRoom> {
    log.info("DailyService.createRoom", options);

    const properties: Record<string, unknown> = {
      max_participants: options.maxParticipants ?? 2,
      enable_chat: true,
      enable_screenshare: false,
      start_video_off: false,
      start_audio_off: false,
    };
    if (options.expiresInSeconds) {
      properties.exp = Math.floor(Date.now() / 1000) + options.expiresInSeconds;
    }
    if (options.enableRecording) {
      properties.enable_recording = "local";
    }

    const body: Record<string, unknown> = {
      privacy: options.privacy ?? "private",
      properties,
    };
    if (options.name) body.name = options.name;

    const response = await fetch(`${this.baseUrl}/rooms`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Daily.co API error (${response.status}): ${text}`);
    }

    const room = await response.json() as DailyRoom;
    log.info("DailyService.createRoom success", { name: room.name, url: room.url });
    return room;
  }

  async deleteRoom(roomName: string): Promise<void> {
    log.info("DailyService.deleteRoom", roomName);

    const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
      method: "DELETE",
      headers: this.headers,
    });

    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      throw new Error(`Daily.co API error (${response.status}): ${text}`);
    }
  }

  async createMeetingToken(options: {
    roomName: string;
    userId: string;
    displayName: string;
    isOwner?: boolean;
    expiresInSeconds?: number;
  }): Promise<DailyMeetingToken> {
    log.info("DailyService.createMeetingToken", {
      roomName: options.roomName,
      userId: options.userId,
    });

    const properties: Record<string, unknown> = {
      room_name: options.roomName,
      user_id: options.userId,
      user_name: options.displayName,
      is_owner: options.isOwner ?? false,
    };
    if (options.expiresInSeconds) {
      properties.exp = Math.floor(Date.now() / 1000) + options.expiresInSeconds;
    }

    const response = await fetch(`${this.baseUrl}/meeting-tokens`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Daily.co API error (${response.status}): ${text}`);
    }

    return response.json() as Promise<DailyMeetingToken>;
  }

  getRoomUrl(roomName: string): string {
    return `https://${this.domain}.daily.co/${roomName}`;
  }
}
