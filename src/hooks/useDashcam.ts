import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

import {
  addClipToQueue,
  findNewestRollingClip,
  getRollingClips,
  protectClip,
} from "../services/camera/dashcamQueue";

import {
  DashcamClip,
  DashcamSettings,
  DashcamStatus,
  DEFAULT_DASHCAM_SETTINGS,
} from "../services/camera/dashcamTypes";

import {
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

const MINIMUM_FREE_STORAGE_BYTES =
  1 * 1024 * 1024 * 1024;

type UseDashcamOptions = {
  settings?: DashcamSettings;
};

function createClipId(): string {
  return `clip-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function useDashcam(
  options?: UseDashcamOptions
) {
  const settings =
    options?.settings ??
    DEFAULT_DASHCAM_SETTINGS;

  const cameraRef =
    useRef<CameraView | null>(null);

  const [permission, requestPermission] =
    useCameraPermissions();

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

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      recordingLoopRef.current = false;
      stopRequestedRef.current = true;
      recordingStartedAtRef.current = null;
    };
  }, []);

  /*
   * Live recording timer.
   *
   * Expo Camera does not provide a recording
   * progress callback in this SDK version,
   * so elapsed time is calculated locally.
   */
  useEffect(() => {
    if (
      status !== "RECORDING" &&
      status !== "STOPPING"
    ) {
      return;
    }

    const interval = setInterval(() => {
      const startedAt =
        recordingStartedAtRef.current;

      if (!startedAt) {
        return;
      }

      const elapsedSeconds =
        (Date.now() - startedAt) / 1000;

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

  const hasEnoughStorage =
    useCallback(() => {
      return (
        getAvailableStorageBytes() >
        MINIMUM_FREE_STORAGE_BYTES
      );
    }, []);

  /*
   * Move the temporary Camera recording
   * into permanent dashcam storage.
   */
  const finalizeClip =
    useCallback(
      (
        temporaryUri: string,
        startedAt: string,
        durationSeconds: number
      ): DashcamClip => {
        const clipId =
          createClipId();

        const destinationFile =
          moveRecordingToRollingStorage(
            temporaryUri,
            clipId
          );

        const actualFileSize =
          getFileSize(destinationFile);

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

          startLatitude: null,
          startLongitude: null,

          endLatitude: null,
          endLongitude: null,
        };
      },
      []
    );

  /*
   * Add the completed clip to the queue.
   *
   * The queue determines which old rolling
   * clips are safe to remove.
   */
  const addCompletedClip =
    useCallback(
      (clip: DashcamClip) => {
        let queueError: Error | null = null;

        setClips((currentClips) => {
          const result =
            addClipToQueue(
              currentClips,
              clip,
              settings.maxRollingClips,
              settings.maxStorageBytes
            );

          /*
           * Physically delete the files selected
           * by the queue.
           */
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
            } catch (deleteError) {
              console.error(
                "Dashcam: failed to delete old clip:",
                deleteError
              );

              queueError =
                deleteError instanceof Error
                  ? deleteError
                  : new Error(
                      "Failed to delete an old dashcam clip."
                    );
            }
          }

          /*
           * If deleting an old file failed,
           * do not pretend the queue is safe.
           */
          if (queueError) {
            return currentClips;
          }

          /*
           * If the rolling storage is still
           * above the configured limit, every
           * remaining rolling clip is effectively
           * protected from automatic deletion.
           *
           * Stop the rolling process rather than
           * allowing unlimited storage growth.
           */
          if (
            result.storageLimitReached
          ) {
            console.warn(
              "Dashcam: rolling storage limit reached."
            );
          }

          return result.clips;
        });

        return queueError;
      },
      [
        settings.maxRollingClips,
        settings.maxStorageBytes,
      ]
    );

  /*
   * Record one dashcam segment.
   */
  const recordOneClip =
    useCallback(async () => {
      if (!cameraRef.current) {
        throw new Error(
          "Camera is not ready."
        );
      }

      const startedAt =
        new Date().toISOString();

      recordingStartedAtRef.current =
        Date.now();

      if (mountedRef.current) {
        setRecordingDurationSeconds(0);
        setRecordingFileSizeBytes(0);
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

      setStatus("FINALIZING");

      const clip =
        finalizeClip(
          result.uri,
          startedAt,
          result.durationSeconds
        );

      setRecordingDurationSeconds(
        result.durationSeconds
      );

      setRecordingFileSizeBytes(
        clip.fileSizeBytes
      );

      const queueError =
        addCompletedClip(clip);

      if (queueError) {
        throw queueError;
      }

      /*
       * If the newly recorded clip itself
       * pushed storage above the configured
       * limit and there were no deletable
       * rolling clips, stop safely.
       */
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

  /*
   * Start continuous rolling recording.
   */
  const startRecording =
    useCallback(async () => {
      if (recordingLoopRef.current) {
        return;
      }

      setError(null);

      /*
       * Request camera permission.
       */
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

      /*
       * Check free device storage.
       */
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

      recordingLoopRef.current = true;
      stopRequestedRef.current = false;

      setRecordingDurationSeconds(0);
      setRecordingFileSizeBytes(0);

      setStatus("STARTING");

      try {
        while (
          recordingLoopRef.current &&
          !stopRequestedRef.current
        ) {
          /*
           * Check device storage before
           * starting every new segment.
           */
          if (!hasEnoughStorage()) {
            throw new Error(
              "Free storage is too low. Dashcam recording was stopped."
            );
          }

          if (mountedRef.current) {
            setStatus("RECORDING");
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
            setStatus("ROTATING");
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

        recordingLoopRef.current = false;
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
      hasEnoughStorage,
      recordOneClip,
    ]);

  /*
   * Stop the current recording.
   */
  const stopRecording =
    useCallback(() => {
      if (
        !recordingLoopRef.current
      ) {
        return;
      }

      stopRequestedRef.current = true;
      recordingLoopRef.current = false;

      if (mountedRef.current) {
        setStatus("STOPPING");
      }

      stopDashcamRecording(
        cameraRef
      );
    }, []);

  /*
   * Protect the newest rolling clip.
   *
   * Protected clips will never be selected
   * for automatic rolling-buffer deletion.
   */
  const quickSave =
    useCallback(() => {
      setClips((currentClips) => {
        const newest =
          findNewestRollingClip(
            currentClips
          );

        if (!newest) {
          return currentClips;
        }

        return protectClip(
          currentClips,
          newest.id
        );
      });
    }, []);

  /*
   * Cleanup camera recording on unmount.
   */
  useEffect(() => {
    return () => {
      recordingLoopRef.current = false;
      stopRequestedRef.current = true;
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

  const rollingClips =
    getRollingClips(clips);

  return {
    cameraRef,

    permission,
    requestPermission,

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