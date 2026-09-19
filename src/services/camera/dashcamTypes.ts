export type DashcamClipStatus =
  | "ROLLING"
  | "PROTECTED"
  | "SAVED";

export type DashcamClip = {
  id: string;
  fileUri: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  fileSizeBytes: number;
  status: DashcamClipStatus;
  startLatitude: number | null;
  startLongitude: number | null;
  endLatitude: number | null;
  endLongitude: number | null;
};

export type DashcamStatus =
  | "IDLE"
  | "STARTING"
  | "RECORDING"
  | "FINALIZING"
  | "ROTATING"
  | "STOPPING"
  | "ERROR";

export type DashcamSettings = {
  maxRollingClips: number;
  clipDurationSeconds: number;
  maxStorageBytes: number;
  audioEnabled: boolean;
};

export const DEFAULT_DASHCAM_SETTINGS: DashcamSettings = {
  maxRollingClips: 5,
  clipDurationSeconds: 5 * 60,
  maxStorageBytes:
    2 * 1024 * 1024 * 1024,
  audioEnabled: true,
};