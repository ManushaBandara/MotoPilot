import { useEffect, useRef, useState } from "react";

import MotoPilotLocationModule, {
  NativeLocation,
} from "../../modules/motopilot-location/src/MotoPilotLocationModule";

import {
  createSpeedFilterState,
  filterSpeed,
} from "../services/speedFilter";

export function useLocation() {
  const [location, setLocation] =
    useState<NativeLocation | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [updateCount, setUpdateCount] =
    useState(0);

  const [speedKmh, setSpeedKmh] =
    useState(0);

  // Keeps the speed-filter state between GPS updates
  // without causing unnecessary React re-renders.
  const speedFilterStateRef =
    useRef(createSpeedFilterState());

  useEffect(() => {
    let mounted = true;

    console.log(
      "GPS: starting location setup..."
    );

    // Listen for location updates from the
    // native Android LocationManager module.
    const subscription =
      MotoPilotLocationModule.addListener(
        "onLocationUpdate",
        (newLocation) => {
          if (!mounted) return;

          console.log(
            "GPS: location update:",
            newLocation
          );

          // Store the latest complete GPS reading.
          setLocation(newLocation);

          // Useful while testing continuous GPS updates.
          setUpdateCount(
            (count) => count + 1
          );

          // Clear any previous GPS error once
          // valid location data is received.
          setError(null);

          // Pass the raw Android GPS speed into
          // our JavaScript filtering function.
          const filteredSpeed = filterSpeed(
  newLocation.speed,
  newLocation.accuracy,
  speedFilterStateRef.current
);

          // Store the cleaned speed that the
          // dashboard should display.
          setSpeedKmh(filteredSpeed);
        }
      );

    async function startGps() {
      try {
        console.log(
          "GPS: starting native GPS watcher..."
        );

        await MotoPilotLocationModule.startLocationUpdates();

        console.log(
          "GPS: native GPS watcher started."
        );
      } catch (err) {
        console.error(
          "GPS: failed to start:",
          err
        );

        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to start GPS."
        );
      }
    }

    startGps();

    return () => {
      mounted = false;

      console.log(
        "GPS: stopping native GPS watcher..."
      );

      // Stop receiving JavaScript events.
      subscription.remove();

      // Reset the speed filter so an old speed
      // cannot carry into the next GPS session.
      speedFilterStateRef.current =
        createSpeedFilterState();

      // Stop the native Android GPS watcher.
      MotoPilotLocationModule
        .stopLocationUpdates()
        .catch((err) => {
          console.error(
            "GPS: failed to stop watcher:",
            err
          );
        });
    };
  }, []);

  return {
    location,
    error,
    updateCount,
    speedKmh,
  };
}