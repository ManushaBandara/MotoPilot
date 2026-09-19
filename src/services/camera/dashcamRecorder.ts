import type { RefObject } from "react";
import { CameraView } from "expo-camera";

import { DashcamSettings } from "./dashcamTypes";

export type DashcamRecorderOptions = {
  cameraRef: RefObject<CameraView | null>;
  settings: DashcamSettings;
};

export type DashcamRecordingResult = {
  uri: string;
  durationSeconds: number;
};

export async function recordDashcamClip({
  cameraRef,
  settings,
}: DashcamRecorderOptions): Promise<
  DashcamRecordingResult | null
> {
  const camera = cameraRef.current;

  if (!camera) {
    throw new Error(
      "Camera is not ready."
    );
  }

  const startedAt = Date.now();

  const result =
    await camera.recordAsync({
      maxDuration:
        settings.clipDurationSeconds,
    });

  if (!result?.uri) {
    return null;
  }

  const elapsedMilliseconds =
    Date.now() - startedAt;

  return {
    uri: result.uri,
    durationSeconds:
      elapsedMilliseconds / 1000,
  };
}

export function stopDashcamRecording(
  cameraRef: RefObject<CameraView | null>
): void {
  const camera = cameraRef.current;

  if (!camera) {
    return;
  }

  camera.stopRecording();
}