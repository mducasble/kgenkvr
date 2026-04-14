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

    // TODO: Implement real Daily.co room creation
    // const response = await fetch(`${this.baseUrl}/rooms`, {
    //   method: "POST",
    //   headers: this.headers,
    //   body: JSON.stringify({
    //     name: options.name,
    //     privacy: options.privacy ?? "private",
    //     properties: {
    //       max_participants: options.maxParticipants,
    //       exp: options.expiresInSeconds
    //         ? Math.floor(Date.now() / 1000) + options.expiresInSeconds
    //         : undefined,
    //       enable_recording: options.enableRecording ? "local" : undefined,
    //     },
    //   }),
    // });
    // if (!response.ok) throw new Error(`Daily.co API error: ${response.statusText}`);
    // return response.json();

    throw new Error("DailyService.createRoom not implemented");
  }

  async deleteRoom(roomName: string): Promise<void> {
    log.info("DailyService.deleteRoom", roomName);

    // TODO: DELETE /rooms/:name
    throw new Error("DailyService.deleteRoom not implemented");
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

    // TODO: POST /meeting-tokens
    // const response = await fetch(`${this.baseUrl}/meeting-tokens`, {
    //   method: "POST",
    //   headers: this.headers,
    //   body: JSON.stringify({
    //     properties: {
    //       room_name: options.roomName,
    //       user_id: options.userId,
    //       user_name: options.displayName,
    //       is_owner: options.isOwner ?? false,
    //       exp: options.expiresInSeconds
    //         ? Math.floor(Date.now() / 1000) + options.expiresInSeconds
    //         : undefined,
    //     },
    //   }),
    // });
    // if (!response.ok) throw new Error(`Daily.co API error: ${response.statusText}`);
    // return response.json();

    throw new Error("DailyService.createMeetingToken not implemented");
  }

  getRoomUrl(roomName: string): string {
    return `https://${this.domain}.daily.co/${roomName}`;
  }
}
