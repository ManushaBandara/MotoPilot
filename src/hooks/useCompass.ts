import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CompassReading,
  startCompass,
} from "../services/compass";

type UseCompassOptions = {
  enabled?: boolean;
  gpsHeading?: number | null;
  speedKmh?: number;
};

type CompassController =
  ReturnType<typeof startCompass>;

export function useCompass({
  enabled = true,
  gpsHeading = null,
  speedKmh = 0,
}: UseCompassOptions = {}) {
  const [reading, setReading] =
    useState<CompassReading | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const controllerRef =
    useRef<CompassController | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let mounted = true;

    const start = async () => {
      try {
        const controller =
          startCompass((newReading) => {
            if (!mounted) {
              return;
            }

            setReading(newReading);
            setError(null);
          });

        if (!mounted) {
          controller.stop();
          return;
        }

        controllerRef.current = controller;

        controller.updateGpsData(
          gpsHeading,
          speedKmh
        );
      } catch (err) {
        console.error(
          "Compass: failed to start:",
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to start compass."
        );
      }
    };

    void start();

    return () => {
      mounted = false;

      controllerRef.current?.stop();

      controllerRef.current = null;
    };
  }, [enabled, gpsHeading, speedKmh]);

  return {
    heading:
      reading?.heading ?? null,

    magneticHeading:
      reading?.magneticHeading ?? null,

    gpsHeading:
      reading?.gpsHeading ?? null,

    usingGpsHeading:
      reading?.usingGpsHeading ?? false,

    accuracy:
      reading?.accuracy ?? null,

    error,
  };
}