import {
  getSetting,
  setSetting,
} from "../database";

import {
  DashcamSettings,
  DEFAULT_DASHCAM_SETTINGS,
} from "./dashcamTypes";

/* ============================================================
   SETTING KEYS
   ============================================================ */

const SETTING_KEYS = {
  maxRollingClips:
    "dashcam.maxRollingClips",

  clipDurationSeconds:
    "dashcam.clipDurationSeconds",

  maxStorageBytes:
    "dashcam.maxStorageBytes",

  audioEnabled:
    "dashcam.audioEnabled",
} as const;

/* ============================================================
   VALIDATION
   ============================================================ */

function parsePositiveNumber(
  value: string | null,
  fallback: number
): number {
  if (value == null) {
    return fallback;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(
  value: string | null,
  fallback: boolean
): boolean {
  if (value == null) {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

/* ============================================================
   GET SETTINGS
   ============================================================ */

export async function getDashcamSettings(): Promise<DashcamSettings> {
  const [
    maxRollingClips,
    clipDurationSeconds,
    maxStorageBytes,
    audioEnabled,
  ] = await Promise.all([
    getSetting(
      SETTING_KEYS.maxRollingClips
    ),

    getSetting(
      SETTING_KEYS.clipDurationSeconds
    ),

    getSetting(
      SETTING_KEYS.maxStorageBytes
    ),

    getSetting(
      SETTING_KEYS.audioEnabled
    ),
  ]);

  return {
    maxRollingClips:
      Math.floor(
        parsePositiveNumber(
          maxRollingClips,
          DEFAULT_DASHCAM_SETTINGS.maxRollingClips
        )
      ),

    clipDurationSeconds:
      Math.floor(
        parsePositiveNumber(
          clipDurationSeconds,
          DEFAULT_DASHCAM_SETTINGS.clipDurationSeconds
        )
      ),

    maxStorageBytes:
      Math.floor(
        parsePositiveNumber(
          maxStorageBytes,
          DEFAULT_DASHCAM_SETTINGS.maxStorageBytes
        )
      ),

    audioEnabled:
      parseBoolean(
        audioEnabled,
        DEFAULT_DASHCAM_SETTINGS.audioEnabled
      ),
  };
}

/* ============================================================
   SAVE SETTINGS
   ============================================================ */

export async function saveDashcamSettings(
  settings: DashcamSettings
): Promise<void> {
  if (
    !Number.isInteger(
      settings.maxRollingClips
    ) ||
    settings.maxRollingClips <= 0
  ) {
    throw new Error(
      "Maximum rolling clips must be a positive whole number."
    );
  }

  if (
    !Number.isInteger(
      settings.clipDurationSeconds
    ) ||
    settings.clipDurationSeconds <= 0
  ) {
    throw new Error(
      "Clip duration must be a positive whole number."
    );
  }

  if (
    !Number.isInteger(
      settings.maxStorageBytes
    ) ||
    settings.maxStorageBytes <= 0
  ) {
    throw new Error(
      "Maximum dashcam storage must be greater than zero."
    );
  }

  await Promise.all([
    setSetting(
      SETTING_KEYS.maxRollingClips,
      settings.maxRollingClips.toString()
    ),

    setSetting(
      SETTING_KEYS.clipDurationSeconds,
      settings.clipDurationSeconds.toString()
    ),

    setSetting(
      SETTING_KEYS.maxStorageBytes,
      settings.maxStorageBytes.toString()
    ),

    setSetting(
      SETTING_KEYS.audioEnabled,
      settings.audioEnabled.toString()
    ),
  ]);
}