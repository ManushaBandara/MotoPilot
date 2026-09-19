import {
  NativeModule,
  requireNativeModule,
} from "expo";

export type MediaControllerInfo = {
  packageName: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  durationMs: number | null;
  playbackState: number;
  positionMs: number;
};

declare class MotoPilotMediaModule
  extends NativeModule<{}> {
  isMediaAccessEnabled(): boolean;

  openMediaAccessSettings(): void;

  getActiveMedia(): MediaControllerInfo[];

  play(): void;

  pause(): void;

  next(): void;

  previous(): void;

  seekForward(): void;

  seekBackward(): void;
}

export default requireNativeModule<MotoPilotMediaModule>(
  "MotoPilotMedia"
);