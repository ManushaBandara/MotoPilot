import MotoPilotMediaModule, {
  MediaControllerInfo,
} from "../../../modules/motopilot-media/src/MotoPilotMediaModule";

export type MotoPilotPlaybackState =
  | "NONE"
  | "PLAYING"
  | "PAUSED"
  | "STOPPED"
  | "OTHER";

export type MotoPilotMediaInfo = {
  packageName: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  durationMs: number | null;
  positionMs: number;
  playbackState: MotoPilotPlaybackState;
};

function mapPlaybackState(
  state: number
): MotoPilotPlaybackState {
  switch (state) {
    case 0:
      return "NONE";

    case 1:
      return "STOPPED";

    case 2:
      return "PAUSED";

    case 3:
      return "PLAYING";

    default:
      return "OTHER";
  }
}

function mapMediaController(
  controller: MediaControllerInfo
): MotoPilotMediaInfo {
  return {
    packageName:
      controller.packageName,

    title:
      controller.title,

    artist:
      controller.artist,

    album:
      controller.album,

    durationMs:
      controller.durationMs,

    positionMs:
      controller.positionMs,

    playbackState:
      mapPlaybackState(
        controller.playbackState
      ),
  };
}

export function isMediaAccessEnabled(): boolean {
  return MotoPilotMediaModule
    .isMediaAccessEnabled();
}

export function openMediaAccessSettings(): void {
  MotoPilotMediaModule
    .openMediaAccessSettings();
}

export function getActiveMedia(): MotoPilotMediaInfo[] {
  return MotoPilotMediaModule
    .getActiveMedia()
    .map(mapMediaController);
}

export function playMedia(): void {
  MotoPilotMediaModule.play();
}

export function pauseMedia(): void {
  MotoPilotMediaModule.pause();
}

export function nextMedia(): void {
  MotoPilotMediaModule.next();
}

export function previousMedia(): void {
  MotoPilotMediaModule.previous();
}

export function seekForward(): void {
  MotoPilotMediaModule.seekForward();
}

export function seekBackward(): void {
  MotoPilotMediaModule.seekBackward();
}