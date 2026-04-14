/**
 * DailyClientService — renderer-side Daily.co integration.
 *
 * Runs in the renderer process where browser APIs (MediaStream, getUserMedia, etc.)
 * are available. The main process DailyService handles the REST API.
 *
 * TODO: Install @daily-co/daily-js
 *   pnpm add @daily-co/daily-js
 *
 * Integration approach options:
 *   1. Prebuilt UI: Embed a Daily.co room in an <iframe> with the room URL + token
 *      → Simplest, minimal code, full Daily UI out of the box
 *   2. Custom call object: Use DailyIframe.createCallObject() for headless control
 *      → Full control over video tiles, participant state, and recording
 *   3. React SDK: Use @daily-co/daily-react for component-based integration
 *      → Recommended for custom UI with React
 *
 * See: https://docs.daily.co/reference/daily-js
 */

export type DailyCallState =
  | "idle"
  | "joining"
  | "joined"
  | "leaving"
  | "error";

export interface DailyParticipantUpdate {
  participantId: string;
  userName?: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isSpeaking?: boolean;
}

export class DailyClientService {
  private callState: DailyCallState = "idle";

  // TODO: Replace with @daily-co/daily-js DailyCall instance
  // private callObject: DailyCall | null = null;

  async joinRoom(_roomUrl: string, _token?: string): Promise<void> {
    if (this.callState !== "idle") {
      throw new Error(`Cannot join room in state: ${this.callState}`);
    }
    this.callState = "joining";

    // TODO: Implement Daily.co room join
    // Option A — iframe embed (recommended for first build):
    //   const frame = DailyIframe.createFrame(containerEl, { showLeaveButton: true });
    //   await frame.join({ url: roomUrl, token });
    //
    // Option B — custom call object:
    //   this.callObject = DailyIframe.createCallObject();
    //   this.callObject.on("participant-joined", this.onParticipantJoined);
    //   this.callObject.on("participant-left", this.onParticipantLeft);
    //   this.callObject.on("track-started", this.onTrackStarted);
    //   await this.callObject.join({ url: roomUrl, token });

    throw new Error("DailyClientService.joinRoom not implemented");
  }

  async leaveRoom(): Promise<void> {
    if (this.callState !== "joined") return;
    this.callState = "leaving";

    // TODO: this.callObject?.leave()
    this.callState = "idle";
  }

  async setAudioEnabled(_enabled: boolean): Promise<void> {
    // TODO: this.callObject?.setLocalAudio(enabled)
    throw new Error("DailyClientService.setAudioEnabled not implemented");
  }

  async setVideoEnabled(_enabled: boolean): Promise<void> {
    // TODO: this.callObject?.setLocalVideo(enabled)
    throw new Error("DailyClientService.setVideoEnabled not implemented");
  }

  getCallState(): DailyCallState {
    return this.callState;
  }
}

export const dailyClientService = new DailyClientService();
