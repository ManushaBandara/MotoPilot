import {
  Directory,
  File,
  Paths,
} from "expo-file-system";

const DASHCAM_DIRECTORY_NAME = "dashcam";
const ROLLING_DIRECTORY_NAME = "rolling";
const SAVED_DIRECTORY_NAME = "saved";

function getDashcamDirectory() {
  return new Directory(
    Paths.document,
    DASHCAM_DIRECTORY_NAME
  );
}

function getRollingDirectory() {
  return new Directory(
    getDashcamDirectory(),
    ROLLING_DIRECTORY_NAME
  );
}

function getSavedDirectory() {
  return new Directory(
    getDashcamDirectory(),
    SAVED_DIRECTORY_NAME
  );
}

export function ensureDashcamDirectories(): void {
  getDashcamDirectory().create({
    idempotent: true,
    intermediates: true,
  });

  getRollingDirectory().create({
    idempotent: true,
    intermediates: true,
  });

  getSavedDirectory().create({
    idempotent: true,
    intermediates: true,
  });
}

/**
 * Creates the permanent destination for a rolling clip.
 */
export function createRollingClipFile(
  clipId: string
): File {
  ensureDashcamDirectories();

  return new File(
    getRollingDirectory(),
    `${clipId}.mp4`
  );
}

/**
 * Creates the permanent destination for a saved clip.
 */
export function createSavedClipFile(
  clipId: string
): File {
  ensureDashcamDirectories();

  return new File(
    getSavedDirectory(),
    `${clipId}.mp4`
  );
}

/**
 * Moves a completed camera recording from
 * Expo Camera's temporary cache location into
 * MotoPilot's permanent rolling directory.
 */
export function moveRecordingToRollingStorage(
  temporaryUri: string,
  clipId: string
): File {
  ensureDashcamDirectories();

  const sourceFile = new File(
    temporaryUri
  );

  const destinationFile =
    createRollingClipFile(clipId);

  sourceFile.move(destinationFile);

  return destinationFile;
}

/**
 * Copies a protected clip into the saved directory.
 *
 * We copy instead of moving because the original
 * rolling clip remains part of the queue until the
 * queue manager decides what to do with it.
 */
export function copyClipToSavedStorage(
  sourceUri: string,
  clipId: string
): File {
  ensureDashcamDirectories();

  const sourceFile = new File(
    sourceUri
  );

  const destinationFile =
    createSavedClipFile(clipId);

  sourceFile.copy(destinationFile);

  return destinationFile;
}

export function fileExists(
  file: File
): boolean {
  return file.exists;
}

export function getFileSize(
  file: File
): number {
  if (!file.exists) {
    return 0;
  }

  return file.size;
}

export function deleteFile(
  file: File
): void {
  if (!file.exists) {
    return;
  }

  file.delete();
}

export function getAvailableStorageBytes(): number {
  return Paths.availableDiskSpace;
}

export function getTotalStorageBytes(): number {
  return Paths.totalDiskSpace;
}

export function getStorageInfo() {
  const availableBytes =
    getAvailableStorageBytes();

  const totalBytes =
    getTotalStorageBytes();

  const usedBytes =
    Math.max(
      totalBytes - availableBytes,
      0
    );

  return {
    availableBytes,
    totalBytes,
    usedBytes,
  };
}

export function formatStorageSize(
  bytes: number
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes =
    bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes =
    kilobytes / 1024;

  if (megabytes < 1024) {
    return `${megabytes.toFixed(1)} MB`;
  }

  const gigabytes =
    megabytes / 1024;

  return `${gigabytes.toFixed(2)} GB`;
}