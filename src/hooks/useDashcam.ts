import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";

import {
  addClipToQueue,
  findNewestRollingClip,
  getRollingClips,
  removeClipFromQueue,
} from "../services/camera/dashcamQueue";

import {
  DashcamClip,
  DashcamSettings,
  DashcamStatus,
  DEFAULT_DASHCAM_SETTINGS,
} from "../services/camera/dashcamTypes";

import {
  getDashcamSettings,
} from "../services/camera/dashcamSettings";

import {
  copyClipToSavedStorage,
  createRollingClipFile,
  deleteFile,
  getAvailableStorageBytes,
  getFileSize,
  moveRecordingToRollingStorage,
} from "../services/camera/dashcamStorage";

import {
  recordDashcamClip,
  stopDashcamRecording,
} from "../services/camera/dashcamRecorder";

import type {
  NativeLocation,
} from "../../modules/motopilot-location/src/MotoPilotLocationModule";

import {
  deleteDashcamClip,
  getDashcamClips,
  saveDashcamClip,
  updateDashcamClipFile,
} from "../services/database";

const MINIMUM_FREE_STORAGE_BYTES =
  1 * 1024 * 1024 * 1024;

type UseDashcamOptions = {
  settings?: DashcamSettings;
  location?: NativeLocation | null;
};

function createClipId(): string {
  return `clip-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function useDashcam(
  options?: UseDashcamOptions
) {
  const location =
    options?.location ?? null;

  const cameraRef =
    useRef<CameraView | null>(null);

  const latestLocationRef =
    useRef<NativeLocation | null>(
      location
    );

  useEffect(() => {
    latestLocationRef.current =
      location;
  }, [location]);

  const [settings, setSettings] =
    useState<DashcamSettings>(
      options?.settings ??
        DEFAULT_DASHCAM_SETTINGS
    );

  const [permission, requestPermission] =
    useCameraPermissions();

  const [
    microphonePermission,
    requestMicrophonePermission,
  ] = useMicrophonePermissions();

  const [status, setStatus] =
    useState<DashcamStatus>("IDLE");

  const [clips, setClips] =
    useState<DashcamClip[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const [
    recordingDurationSeconds,
    setRecordingDurationSeconds,
  ] = useState(0);

  const [
    recordingFileSizeBytes,
    setRecordingFileSizeBytes,
  ] = useState(0);

  const recordingLoopRef =
    useRef(false);

  const stopRequestedRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  const recordingStartedAtRef =
    useRef<number | null>(null);

  /* ============================================================
     LOAD DASHCAM SETTINGS
     ============================================================ */

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const savedSettings =
          await getDashcamSettings();

        if (!mounted) {
          return;
        }

        setSettings(
          options?.settings ??
            savedSettings
        );
      } catch (err) {
        console.error(
          "Dashcam: failed to load settings:",
          err
        );

        if (!mounted) {
          return;
        }

        /*
         * Keep the current defaults if
         * settings cannot be loaded.
         */
        setSettings(
          options?.settings ??
            DEFAULT_DASHCAM_SETTINGS
        );
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [options?.settings]);

  /* ============================================================
     LOAD SAVED CLIPS
     ============================================================ */

  useEffect(() => {
    let mounted = true;

    async function loadDashcamClips() {
      try {
        const savedClips =
          await getDashcamClips();

        if (!mounted) {
          return;
        }

        setClips(savedClips);

        console.log(
          "Dashcam: loaded clips from database:",
          savedClips.length
        );
      } catch (err) {
        console.error(
          "Dashcam: failed to load clips from database:",
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashcam clips."
        );
      }
    }

    loadDashcamClips();

    return () => {
      mounted = false;
    };
  }, []);

  /* ============================================================
     LIFECYCLE
     ============================================================ */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      recordingLoopRef.current = false;
      stopRequestedRef.current = true;
      recordingStartedAtRef.current = null;
    };
  }, []);

  /* ============================================================
     RECORDING TIMER
     ============================================================ */

  useEffect(() => {
    if (
      status !== "RECORDING" &&
      status !== "STOPPING"
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        const startedAt =
          recordingStartedAtRef.current;

        if (!startedAt) {
          return;
        }

        const elapsedSeconds =
          (Date.now() - startedAt) /
          1000;

        if (!mountedRef.current) {
          return;
        }

        setRecordingDurationSeconds(
          elapsedSeconds
        );
      }, 250);

    return () => {
      clearInterval(interval);
    };
  }, [status]);

  /* ============================================================
     STORAGE
     ============================================================ */

  const hasEnoughStorage =
    useCallback(() => {
      return (
        getAvailableStorageBytes() >
        MINIMUM_FREE_STORAGE_BYTES
      );
    }, []);

  /* ============================================================
     FINALIZE CLIP
     ============================================================ */

  const finalizeClip =
    useCallback(
      (
        temporaryUri: string,
        startedAt: string,
        durationSeconds: number,
        startLocation: NativeLocation | null,
        endLocation: NativeLocation | null
      ): DashcamClip => {
        const clipId =
          createClipId();

        const destinationFile =
          moveRecordingToRollingStorage(
            temporaryUri,
            clipId
          );

        const actualFileSize =
          getFileSize(
            destinationFile
          );

        return {
          id: clipId,
          fileUri:
            destinationFile.uri,
          startedAt,
          endedAt:
            new Date().toISOString(),
          durationSeconds,
          fileSizeBytes:
            actualFileSize,
          status: "ROLLING",

          startLatitude:
            startLocation?.latitude ??
            null,

          startLongitude:
            startLocation?.longitude ??
            null,

          endLatitude:
            endLocation?.latitude ??
            null,

          endLongitude:
            endLocation?.longitude ??
            null,
        };
      },
      []
    );

  /* ============================================================
     ADD COMPLETED CLIP
     ============================================================ */

  const addCompletedClip =
    useCallback(
      async (
        clip: DashcamClip
      ): Promise<void> => {
        const result =
          addClipToQueue(
            clips,
            clip,
            settings.maxRollingClips,
            settings.maxStorageBytes
          );

        for (
          const clipToDelete of
          result.clipsToDelete
        ) {
          try {
            const oldFile =
              createRollingClipFile(
                clipToDelete.id
              );

            deleteFile(oldFile);

            await deleteDashcamClip(
              clipToDelete.id
            );

            console.log(
              "Dashcam: deleted old clip:",
              clipToDelete.id
            );
          } catch (deleteError) {
            console.error(
              "Dashcam: failed to delete old clip:",
              deleteError
            );

            throw (
              deleteError instanceof Error
                ? deleteError
                : new Error(
                    "Failed to delete an old dashcam clip."
                  )
            );
          }
        }

        await saveDashcamClip(
          clip
        );

        if (mountedRef.current) {
          setClips(
            result.clips
          );
        }

        if (
          result.storageLimitReached
        ) {
          console.warn(
            "Dashcam: rolling storage limit reached."
          );
        }
      },
      [
        clips,
        settings.maxRollingClips,
        settings.maxStorageBytes,
      ]
    );

  /* ============================================================
     RECORD ONE CLIP
     ============================================================ */

  const recordOneClip =
    useCallback(async () => {
      if (!cameraRef.current) {
        throw new Error(
          "Camera is not ready."
        );
      }

      const startLocation =
        latestLocationRef.current;

      const startedAt =
        new Date().toISOString();

      recordingStartedAtRef.current =
        Date.now();

      if (mountedRef.current) {
        setRecordingDurationSeconds(
          0
        );

        setRecordingFileSizeBytes(
          0
        );
      }

      const result =
        await recordDashcamClip({
          cameraRef,
          settings,
        });

      recordingStartedAtRef.current =
        null;

      if (!result) {
        return false;
      }

      if (!mountedRef.current) {
        return false;
      }

      const endLocation =
        latestLocationRef.current;

      setStatus(
        "FINALIZING"
      );

      const clip =
        finalizeClip(
          result.uri,
          startedAt,
          result.durationSeconds,
          startLocation,
          endLocation
        );

      setRecordingDurationSeconds(
        result.durationSeconds
      );

      setRecordingFileSizeBytes(
        clip.fileSizeBytes
      );

      await addCompletedClip(
        clip
      );

      const availableStorage =
        getAvailableStorageBytes();

      if (
        availableStorage <=
        MINIMUM_FREE_STORAGE_BYTES
      ) {
        throw new Error(
          "Free storage is too low. Dashcam recording was stopped."
        );
      }

      return true;
    }, [
      settings,
      finalizeClip,
      addCompletedClip,
    ]);

  /* ============================================================
     START RECORDING
     ============================================================ */

  const startRecording =
    useCallback(async () => {
      if (
        recordingLoopRef.current
      ) {
        return;
      }

      setError(null);

      if (!permission?.granted) {
        const result =
          await requestPermission();

        if (!result.granted) {
          setError(
            "Camera permission is required for dashcam recording."
          );

          setStatus("ERROR");

          return;
        }
      }

      if (!hasEnoughStorage()) {
        setError(
          "Not enough free storage to start dashcam recording."
        );

        setStatus("ERROR");

        return;
      }

      if (!cameraRef.current) {
        setError(
          "Camera is not ready yet."
        );

        setStatus("ERROR");

        return;
      }

      if (settings.audioEnabled) {
        if (
          !microphonePermission?.granted
        ) {
          const result =
            await requestMicrophonePermission();

          if (!result.granted) {
            setError(
              "Microphone permission is required when dashcam audio is enabled."
            );

            setStatus("ERROR");

            return;
          }
        }
      }

      recordingLoopRef.current =
        true;

      stopRequestedRef.current =
        false;

      setRecordingDurationSeconds(
        0
      );

      setRecordingFileSizeBytes(
        0
      );

      setStatus("STARTING");

      try {
        while (
          recordingLoopRef.current &&
          !stopRequestedRef.current
        ) {
          if (!hasEnoughStorage()) {
            throw new Error(
              "Free storage is too low. Dashcam recording was stopped."
            );
          }

          if (mountedRef.current) {
            setStatus(
              "RECORDING"
            );
          }

          const recorded =
            await recordOneClip();

          if (!recorded) {
            break;
          }

          if (
            !recordingLoopRef.current ||
            stopRequestedRef.current
          ) {
            break;
          }

          if (mountedRef.current) {
            setStatus(
              "ROTATING"
            );
          }
        }

        recordingStartedAtRef.current =
          null;

        if (mountedRef.current) {
          setStatus("IDLE");
        }
      } catch (err) {
        console.error(
          "Dashcam: recording failed:",
          err
        );

        recordingLoopRef.current =
          false;

        recordingStartedAtRef.current =
          null;

        if (mountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Dashcam recording failed."
          );

          setStatus("ERROR");
        }
      }
    }, [
      permission?.granted,
      requestPermission,
      microphonePermission?.granted,
      requestMicrophonePermission,
      hasEnoughStorage,
      recordOneClip,
      settings.audioEnabled,
    ]);

  /* ============================================================
     STOP RECORDING
     ============================================================ */

  const stopRecording =
    useCallback(() => {
      if (
        !recordingLoopRef.current
      ) {
        return;
      }

      stopRequestedRef.current =
        true;

      recordingLoopRef.current =
        false;

      if (mountedRef.current) {
        setStatus("STOPPING");
      }

      stopDashcamRecording(
        cameraRef
      );
    }, []);

  /* ============================================================
     QUICK SAVE
     ============================================================ */

  const quickSave =
    useCallback(async () => {
      const newest =
        findNewestRollingClip(
          clips
        );

      if (!newest) {
        return;
      }

      try {
        const availableStorage =
          getAvailableStorageBytes();

        if (
          availableStorage <=
          MINIMUM_FREE_STORAGE_BYTES
        ) {
          throw new Error(
            "Not enough free storage to save this clip."
          );
        }

        const savedFile =
          copyClipToSavedStorage(
            newest.fileUri,
            newest.id
          );

        console.log(
          "Dashcam: clip copied to saved storage:",
          savedFile.uri
        );

        await updateDashcamClipFile(
          newest.id,
          savedFile.uri,
          "SAVED"
        );

        const rollingFile =
          createRollingClipFile(
            newest.id
          );

        deleteFile(
          rollingFile
        );

        if (mountedRef.current) {
          setClips(
            (currentClips) =>
              removeClipFromQueue(
                currentClips,
                newest.id
              )
          );
        }

        console.log(
          "Dashcam: clip permanently saved:",
          newest.id
        );
      } catch (err) {
        console.error(
          "Dashcam: failed to save clip:",
          err
        );

        if (mountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to save dashcam clip."
          );
        }
      }
    }, [clips]);

  /* ============================================================
     CLEANUP
     ============================================================ */

  useEffect(() => {
    return () => {
      recordingLoopRef.current =
        false;

      stopRequestedRef.current =
        true;

      recordingStartedAtRef.current =
        null;

      try {
        stopDashcamRecording(
          cameraRef
        );
      } catch (err) {
        console.error(
          "Dashcam: cleanup failed:",
          err
        );
      }
    };
  }, []);

  /* ============================================================
     ROLLING CLIPS
     ============================================================ */

  const rollingClips =
    getRollingClips(clips);

  return {
    cameraRef,
    permission,
    requestPermission,

    settings,

    status,
    error,

    clips,
    rollingClips,

    recordingDurationSeconds,
    recordingFileSizeBytes,

    isRecording:
      status === "RECORDING",

    isStarting:
      status === "STARTING",

    isStopping:
      status === "STOPPING",

    startRecording,
    stopRecording,
    quickSave,
  };
}