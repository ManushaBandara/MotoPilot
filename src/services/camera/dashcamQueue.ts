import { DashcamClip } from "./dashcamTypes";

export type DashcamQueueResult = {
  clips: DashcamClip[];
  clipsToDelete: DashcamClip[];
  storageLimitReached: boolean;
};

export function getRollingClips(
  clips: DashcamClip[]
): DashcamClip[] {
  return clips
    .filter((clip) => clip.status === "ROLLING")
    .sort(
      (a, b) =>
        new Date(a.startedAt).getTime() -
        new Date(b.startedAt).getTime()
    );
}

export function findOldestRollingClip(
  clips: DashcamClip[]
): DashcamClip | null {
  const rollingClips = getRollingClips(clips);

  return rollingClips[0] ?? null;
}

export function findNewestRollingClip(
  clips: DashcamClip[]
): DashcamClip | null {
  const rollingClips = getRollingClips(clips);

  return (
    rollingClips[rollingClips.length - 1] ??
    null
  );
}

function getRollingStorageBytes(
  clips: DashcamClip[]
): number {
  return getRollingClips(clips).reduce(
    (total, clip) =>
      total + clip.fileSizeBytes,
    0
  );
}

function removeClipIds(
  clips: DashcamClip[],
  clipIds: Set<string>
): DashcamClip[] {
  return clips.filter(
    (clip) => !clipIds.has(clip.id)
  );
}

/**
 * Adds a new rolling clip and determines
 * which old rolling clips need to be deleted.
 *
 * Only clips with status "ROLLING" can be
 * automatically deleted.
 *
 * Protected and saved clips are never
 * automatically selected for deletion.
 */
export function addClipToQueue(
  clips: DashcamClip[],
  newClip: DashcamClip,
  maxRollingClips: number,
  maxStorageBytes: number
): DashcamQueueResult {
  const updatedClips = [
    ...clips,
    newClip,
  ];

  const clipsToDelete: DashcamClip[] = [];

  let workingClips = [
    ...updatedClips,
  ];

  /*
   * First enforce the maximum number
   * of rolling clips.
   */
  let rollingClips =
    getRollingClips(workingClips);

  while (
    rollingClips.length >
    maxRollingClips
  ) {
    const oldestClip =
      rollingClips[0];

    if (!oldestClip) {
      break;
    }

    clipsToDelete.push(oldestClip);

    workingClips =
      removeClipIds(
        workingClips,
        new Set([oldestClip.id])
      );

    rollingClips =
      getRollingClips(workingClips);
  }

  /*
   * Next enforce the maximum amount
   * of storage allowed for rolling clips.
   */
  let rollingStorageBytes =
    getRollingStorageBytes(
      workingClips
    );

  while (
    rollingStorageBytes >
      maxStorageBytes &&
    rollingClips.length > 0
  ) {
    const oldestClip =
      rollingClips[0];

    if (!oldestClip) {
      break;
    }

    clipsToDelete.push(oldestClip);

    workingClips =
      removeClipIds(
        workingClips,
        new Set([oldestClip.id])
      );

    rollingClips =
      getRollingClips(workingClips);

    rollingStorageBytes =
      getRollingStorageBytes(
        workingClips
      );
  }

  const finalRollingStorageBytes =
    getRollingStorageBytes(
      workingClips
    );

  const storageLimitReached =
    finalRollingStorageBytes >
    maxStorageBytes;

  return {
    clips: workingClips,
    clipsToDelete,
    storageLimitReached,
  };
}

export function removeClipFromQueue(
  clips: DashcamClip[],
  clipId: string
): DashcamClip[] {
  return clips.filter(
    (clip) => clip.id !== clipId
  );
}

export function protectClip(
  clips: DashcamClip[],
  clipId: string
): DashcamClip[] {
  return clips.map((clip) => {
    if (clip.id !== clipId) {
      return clip;
    }

    return {
      ...clip,
      status: "PROTECTED",
    };
  });
}

export function markClipAsSaved(
  clips: DashcamClip[],
  clipId: string
): DashcamClip[] {
  return clips.map((clip) => {
    if (clip.id !== clipId) {
      return clip;
    }

    return {
      ...clip,
      status: "SAVED",
    };
  });
}