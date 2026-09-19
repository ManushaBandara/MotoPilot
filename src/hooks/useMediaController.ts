import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getActiveMedia,
  isMediaAccessEnabled,
  nextMedia,
  pauseMedia,
  playMedia,
  previousMedia,
  seekBackward,
  seekForward,
  openMediaAccessSettings,
  type MotoPilotMediaInfo,
} from "../services/media/mediaService";

const POLL_INTERVAL_MS = 1000;

export function useMediaController() {
  const [mediaAccessEnabled, setMediaAccessEnabled] =
    useState(false);

  const [activeMedia, setActiveMedia] =
    useState<MotoPilotMediaInfo[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refreshMedia = useCallback(() => {
    try {
      const enabled =
        isMediaAccessEnabled();

      setMediaAccessEnabled(enabled);

      if (!enabled) {
        setActiveMedia([]);
        setError(null);
        return;
      }

      const media =
        getActiveMedia();

      setActiveMedia(media);
      setError(null);
    } catch (err) {
      console.error(
        "Media: failed to read active media:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to read active media."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMedia();

    const interval =
      setInterval(
        refreshMedia,
        POLL_INTERVAL_MS
      );

    return () => {
      clearInterval(interval);
    };
  }, [refreshMedia]);

  const runMediaAction = useCallback(
    (
      action: () => void
    ) => {
      try {
        action();

        refreshMedia();
      } catch (err) {
        console.error(
          "Media: action failed:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Media action failed."
        );
      }
    },
    [refreshMedia]
  );

  const play = useCallback(() => {
    runMediaAction(playMedia);
  }, [runMediaAction]);

  const pause = useCallback(() => {
    runMediaAction(pauseMedia);
  }, [runMediaAction]);

  const next = useCallback(() => {
    runMediaAction(nextMedia);
  }, [runMediaAction]);

  const previous = useCallback(() => {
    runMediaAction(previousMedia);
  }, [runMediaAction]);

  const forward = useCallback(() => {
    runMediaAction(seekForward);
  }, [runMediaAction]);

  const backward = useCallback(() => {
    runMediaAction(seekBackward);
  }, [runMediaAction]);

  const openAccessSettings = useCallback(() => {
    try {
      openMediaAccessSettings();
    } catch (err) {
      console.error(
        "Media: failed to open access settings:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to open media access settings."
      );
    }
  }, []);

  const primaryMedia =
    activeMedia[0] ?? null;

  return {
    mediaAccessEnabled,
    activeMedia,
    primaryMedia,
    loading,
    error,

    refreshMedia,

    play,
    pause,
    next,
    previous,
    forward,
    backward,

    openAccessSettings,
  };
}