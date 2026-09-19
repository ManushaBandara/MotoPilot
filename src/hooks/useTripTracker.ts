import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  calculateAverageSpeed,
  createRideCalculationState,
  processRideLocation,
  RideLocation,
} from "../services/rideCalculator";

import {
  completeRide,
} from "../services/rideCompletionService";

import {
  RideRoutePoint,
} from "../services/database";

type UseTripTrackerOptions = {
  location: RideLocation | null;
  speedKmh: number;
};

function formatDuration(
  totalSeconds: number
) {
  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  if (hours > 0) {
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");
  }

  return [
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

export function useTripTracker({
  location,
  speedKmh,
}: UseTripTrackerOptions) {
  const [
    isTracking,
    setIsTracking,
  ] = useState(false);

  const [
    distanceMeters,
    setDistanceMeters,
  ] = useState(0);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const [
    maxSpeedKmh,
    setMaxSpeedKmh,
  ] = useState(0);

  const [
    averageSpeedKmh,
    setAverageSpeedKmh,
  ] = useState(0);

  const [
    saveError,
    setSaveError,
  ] = useState<string | null>(null);

  const [
    routePointCount,
    setRoutePointCount,
  ] = useState(0);

  const calculationStateRef =
    useRef(
      createRideCalculationState()
    );

  const startTimeRef =
    useRef<number | null>(null);

  const startedAtRef =
    useRef<string | null>(null);

  const routeRef =
    useRef<RideRoutePoint[]>([]);

  const lastRoutePointRef =
    useRef<RideRoutePoint | null>(null);

  const startTrip =
    useCallback(() => {
      calculationStateRef.current =
        createRideCalculationState();

      const now = new Date();

      startTimeRef.current =
        now.getTime();

      startedAtRef.current =
        now.toISOString();

      routeRef.current = [];

      lastRoutePointRef.current =
        null;

      setRoutePointCount(0);
      setDistanceMeters(0);
      setElapsedSeconds(0);
      setMaxSpeedKmh(0);
      setAverageSpeedKmh(0);
      setSaveError(null);
      setIsTracking(true);
    }, []);

  const stopTrip =
    useCallback(async () => {
      const state =
        calculationStateRef.current;

      const startedAt =
        startedAtRef.current;

      const finalDurationSeconds =
        startTimeRef.current
          ? Math.floor(
              (Date.now() -
                startTimeRef.current) /
                1000
            )
          : elapsedSeconds;

      const finalDistanceKm =
        state.distanceMeters / 1000;

      const finalAverageSpeedKmh =
        calculateAverageSpeed(state);

      const finalMaxSpeedKmh =
        state.maxSpeedKmh;

      const finalRoute =
        [...routeRef.current];

      /*
       * Stop collecting new ride data
       * immediately.
       */
      setIsTracking(false);

      if (startedAt) {
        try {
          const result =
            await completeRide({
              startedAt,
              durationSeconds:
                finalDurationSeconds,
              distanceKm:
                finalDistanceKm,
              averageSpeedKmh:
                finalAverageSpeedKmh,
              maxSpeedKmh:
                finalMaxSpeedKmh,
              route: finalRoute,
            });

          setSaveError(null);

          console.log(
            "Ride completed successfully:",
            {
              startedAt,
              durationSeconds:
                finalDurationSeconds,
              distanceKm:
                finalDistanceKm,
              averageSpeedKmh:
                finalAverageSpeedKmh,
              maxSpeedKmh:
                finalMaxSpeedKmh,
              routePoints:
                finalRoute.length,
              fuel:
                result.fuel,
            }
          );
        } catch (error) {
          console.error(
            "Ride: failed to complete ride:",
            error
          );

          setSaveError(
            error instanceof Error
              ? error.message
              : "Unable to save ride."
          );
        }
      }

      calculationStateRef.current =
        createRideCalculationState();

      startTimeRef.current = null;

      startedAtRef.current = null;

      routeRef.current = [];

      lastRoutePointRef.current =
        null;

      setRoutePointCount(0);
    }, [elapsedSeconds]);

  useEffect(() => {
    if (!isTracking) {
      return;
    }

    const interval =
      setInterval(() => {
        const startTime =
          startTimeRef.current;

        if (!startTime) {
          return;
        }

        const elapsed =
          Math.floor(
            (Date.now() -
              startTime) /
              1000
          );

        setElapsedSeconds(
          elapsed
        );
      }, 1000);

    return () =>
      clearInterval(interval);
  }, [isTracking]);

  useEffect(() => {
    if (
      !isTracking ||
      !location
    ) {
      return;
    }

    const state =
      calculationStateRef.current;

    processRideLocation(
      state,
      location,
      speedKmh
    );

    const routePoint:
      RideRoutePoint = {
      latitude:
        location.latitude,

      longitude:
        location.longitude,

      timestamp:
        new Date().toISOString(),
    };

    const previousPoint =
      lastRoutePointRef.current;

    if (previousPoint) {
      const latitudeDifference =
        location.latitude -
        previousPoint.latitude;

      const longitudeDifference =
        location.longitude -
        previousPoint.longitude;

      const approximateDistance =
        Math.sqrt(
          latitudeDifference *
            latitudeDifference +
            longitudeDifference *
              longitudeDifference
        );

      const minimumCoordinateDifference =
        0.00003;

      if (
        approximateDistance <
        minimumCoordinateDifference
      ) {
        return;
      }
    }

    routeRef.current.push(
      routePoint
    );

    lastRoutePointRef.current =
      routePoint;

    setRoutePointCount(
      routeRef.current.length
    );

    setDistanceMeters(
      state.distanceMeters
    );

    setMaxSpeedKmh(
      state.maxSpeedKmh
    );

    setAverageSpeedKmh(
      calculateAverageSpeed(state)
    );
  }, [
    isTracking,
    location,
    speedKmh,
  ]);

  return {
    isTracking,

    distanceMeters,

    distanceKm:
      distanceMeters / 1000,

    elapsedSeconds,

    duration:
      formatDuration(
        elapsedSeconds
      ),

    maxSpeedKmh,

    averageSpeedKmh,

    saveError,

    routePointCount,

    startTrip,

    stopTrip,
  };
}