import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useLocation } from "./useLocation";

import type {
  Destination,
  RouteInfo,
} from "../services/navigation/navigationTypes";

import {
  applyNavigationRoute,
  getNavigationSessionState,
  setNavigationSessionState,
  startNavigationSession,
  stopNavigationSession,
  subscribeToNavigationSession,
  updateNavigationSession,
  type NavigationSessionState,
} from "../services/navigation/navigationSession";

import {
  calculateRoute,
} from "../services/navigation/routesService";

export function useNavigationSession() {
  const {
    location,
    error,
    speedKmh,
  } = useLocation();

  const [
    session,
    setSession,
  ] = useState<NavigationSessionState>(
    getNavigationSessionState()
  );

  const [
    navigationError,
    setNavigationError,
  ] = useState<string | null>(null);

  const reroutingRef =
    useRef(false);

  /**
   * Subscribe to the persistent navigation
   * session store.
   *
   * The session itself is no longer owned by
   * this screen-level hook.
   */
  useEffect(() => {
    setSession(
      getNavigationSessionState()
    );

    return subscribeToNavigationSession(
      setSession
    );
  }, []);

  /**
   * Start a new navigation session.
   */
  const startNavigation = useCallback(
    (
      destination: Destination,
      route: RouteInfo
    ) => {
      if (!location) {
        setNavigationError(
          "Current GPS location is not available."
        );

        return false;
      }

      setNavigationError(null);

      const nextSession =
        startNavigationSession(
          destination,
          route,
          {
            latitude:
              location.latitude,
            longitude:
              location.longitude,
          }
        );

      setNavigationSessionState(
        nextSession
      );

      return true;
    },
    [location]
  );

  /**
   * Stop navigation completely.
   *
   * This should only happen when the user
   * explicitly chooses to stop navigation.
   */
  const stopNavigation =
    useCallback(() => {
      reroutingRef.current = false;

      setNavigationError(null);

      const nextSession =
        stopNavigationSession();

      setNavigationSessionState(
        nextSession
      );
    }, []);

  /**
   * Calculate a new route from the current
   * GPS position to the existing destination.
   */
  const reroute = useCallback(
    async (
      destination: Destination
    ) => {
      if (!location) {
        return;
      }

      if (reroutingRef.current) {
        return;
      }

      reroutingRef.current = true;

      setNavigationError(null);

      const currentSession =
        getNavigationSessionState();

      const reroutingSession: NavigationSessionState =
        {
          ...currentSession,

          status: "REROUTING",
        };

      setNavigationSessionState(
        reroutingSession
      );

      try {
        const route =
          await calculateRoute({
            origin: {
              latitude:
                location.latitude,
              longitude:
                location.longitude,
            },

            destination: {
              latitude:
                destination.latitude,
              longitude:
                destination.longitude,
            },
          });

        const latestSession =
          getNavigationSessionState();

        const nextSession =
          applyNavigationRoute(
            latestSession,
            route,
            {
              latitude:
                location.latitude,
              longitude:
                location.longitude,
            }
          );

        setNavigationSessionState(
          nextSession
        );
      } catch (err) {
        console.error(
          "Navigation reroute failed:",
          err
        );

        setNavigationError(
          err instanceof Error
            ? err.message
            : "Unable to reroute."
        );

        const current =
          getNavigationSessionState();

        setNavigationSessionState({
          ...current,

          status: "NAVIGATING",
        });
      } finally {
        reroutingRef.current = false;
      }
    },
    [location]
  );

  /**
   * Process every new GPS location while
   * navigation is active.
   *
   * IMPORTANT:
   *
   * This hook must eventually be mounted by
   * the persistent NavigationProvider.
   *
   * The navigation screen itself will only
   * subscribe to the resulting session.
   */
  useEffect(() => {
    if (!location) {
      return;
    }

    const currentSession =
      getNavigationSessionState();

    if (
      currentSession.status === "IDLE" ||
      currentSession.status === "ARRIVED"
    ) {
      return;
    }

    const result =
      updateNavigationSession(
        currentSession,
        {
          latitude:
            location.latitude,
          longitude:
            location.longitude,
        }
      );

    setNavigationSessionState(
      result.state
    );

    if (
      result.shouldReroute &&
      result.state.destination &&
      !reroutingRef.current
    ) {
      void reroute(
        result.state.destination
      );
    }
  }, [location, reroute]);

  return {
    location,

    gpsError: error,

    speedKmh,

    session,

    status:
      session.status,

    destination:
      session.destination,

    route:
      session.route,

    remainingDistanceMeters:
      session.remainingDistanceMeters,

    remainingDurationSeconds:
      session.remainingDurationSeconds,

    progressPercent:
      session.progressPercent,

    currentLocation:
      session.currentLocation,

    offRoute:
      session.offRoute,

    currentStep:
      session.currentStep,

    currentStepIndex:
      session.currentStepIndex,

    distanceToNextManeuverMeters:
      session.distanceToNextManeuverMeters,

    maneuverPhase:
      session.maneuverPhase,

    navigationError,

    startNavigation,

    stopNavigation,

    reroute,
  };
}