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
  createNavigationSessionState,
  startNavigationSession,
  stopNavigationSession,
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

  const [session, setSession] =
    useState<NavigationSessionState>(
      createNavigationSessionState()
    );

  const [navigationError, setNavigationError] =
    useState<string | null>(null);

  const sessionRef =
    useRef<NavigationSessionState>(session);

  const reroutingRef =
    useRef(false);

  /**
   * Keep a synchronous reference to the
   * latest navigation session.
   */
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  /**
   * Start a navigation session using an
   * already calculated route.
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

      sessionRef.current =
        nextSession;

      setSession(nextSession);

      return true;
    },
    [location]
  );

  /**
   * Stop navigation completely.
   */
  const stopNavigation =
    useCallback(() => {
      reroutingRef.current = false;

      setNavigationError(null);

      const nextSession =
        stopNavigationSession();

      sessionRef.current =
        nextSession;

      setSession(nextSession);
    }, []);

  /**
   * Calculate a fresh route from the
   * current GPS position.
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

      setSession((current) => {
        const next = {
          ...current,

          status: "REROUTING" as const,
        };

        sessionRef.current = next;

        return next;
      });

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

        const currentSession =
          sessionRef.current;

        const nextSession =
          applyNavigationRoute(
            currentSession,
            route,
            {
              latitude:
                location.latitude,

              longitude:
                location.longitude,
            }
          );

        sessionRef.current =
          nextSession;

        setSession(nextSession);
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

        setSession((current) => {
          const next = {
            ...current,

            status: "NAVIGATING" as const,
          };

          sessionRef.current =
            next;

          return next;
        });
      } finally {
        reroutingRef.current = false;
      }
    },
    [location]
  );

  /**
   * Process each new GPS location while
   * navigation is active.
   */
  useEffect(() => {
    if (!location) {
      return;
    }

    const currentSession =
      sessionRef.current;

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

    sessionRef.current =
      result.state;

    setSession(result.state);

    if (
      result.shouldReroute &&
      result.state.destination &&
      !reroutingRef.current
    ) {
      reroute(
        result.state.destination
      );
    }
  }, [location, reroute]);

  return {
    /**
     * Raw native GPS location.
     *
     * This is always the latest GPS position,
     * even when navigation has not started.
     */
    location,

    /**
     * GPS error from the native location module.
     */
    gpsError: error,

    /**
     * Filtered current speed.
     */
    speedKmh,

    /**
     * Navigation session state.
     */
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

    /**
     * Current route instruction.
     */
    currentStep:
      session.currentStep,

    /**
     * Index of the current route instruction.
     */
    currentStepIndex:
      session.currentStepIndex,

    /**
     * Distance from the rider's current
     * position to the end of the current
     * navigation step.
     */
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