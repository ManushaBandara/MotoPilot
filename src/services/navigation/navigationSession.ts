import {
  calculateDistanceMeters,
  type Coordinates,
} from "../distance";

import type {
  Destination,
  ManeuverPhase,
  NavigationStep,
  RouteInfo,
} from "./navigationTypes";

export type NavigationStatus =
  | "IDLE"
  | "NAVIGATING"
  | "REROUTING"
  | "ARRIVED";

export type NavigationSessionState = {
  status: NavigationStatus;

  destination: Destination | null;

  route: RouteInfo | null;

  remainingDistanceMeters: number;

  remainingDurationSeconds: number;

  progressPercent: number;

  currentLocation: Coordinates | null;

  routeOrigin: Coordinates | null;

  offRoute: boolean;

  currentStepIndex: number;

  currentStep: NavigationStep | null;

  distanceToNextManeuverMeters: number;

  maneuverPhase: ManeuverPhase;
};

export type NavigationUpdateResult = {
  state: NavigationSessionState;

  shouldReroute: boolean;

  arrived: boolean;
};

const ARRIVAL_RADIUS_METERS = 30;

const OFF_ROUTE_DISTANCE_METERS = 60;

const REROUTE_DISTANCE_METERS = 100;

/**
 * Normal radius used when deciding whether
 * the rider has reached a step endpoint.
 */
const STEP_COMPLETION_RADIUS_METERS = 25;

/**
 * Additional tolerance used when comparing
 * the rider's route progress with the route
 * position of a maneuver.
 */
const STEP_ROUTE_PROGRESS_TOLERANCE_METERS = 25;

/**
 * Maneuver guidance thresholds.
 *
 * More than 150m:
 * FAR
 *
 * 50m - 150m:
 * APPROACHING
 *
 * 0m - 50m:
 * IMMINENT
 */
const MANEUVER_APPROACHING_DISTANCE_METERS = 150;

const MANEUVER_IMMINENT_DISTANCE_METERS = 50;

export function createNavigationSessionState(): NavigationSessionState {
  return {
    status: "IDLE",

    destination: null,

    route: null,

    remainingDistanceMeters: 0,

    remainingDurationSeconds: 0,

    progressPercent: 0,

    currentLocation: null,

    routeOrigin: null,

    offRoute: false,

    currentStepIndex: -1,

    currentStep: null,

    distanceToNextManeuverMeters: 0,

    maneuverPhase: "FAR",
  };
}

/**
 * Decode Google's encoded polyline format.
 */
export function decodePolyline(
  encodedPolyline: string
): Coordinates[] {
  const points: Coordinates[] = [];

  let index = 0;

  let latitude = 0;

  let longitude = 0;

  while (index < encodedPolyline.length) {
    let shift = 0;

    let result = 0;

    let byte: number;

    do {
      byte =
        encodedPolyline.charCodeAt(index++) - 63;

      result |=
        (byte & 0x1f) << shift;

      shift += 5;
    } while (byte >= 0x20);

    const latitudeChange =
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    latitude += latitudeChange;

    shift = 0;

    result = 0;

    do {
      byte =
        encodedPolyline.charCodeAt(index++) - 63;

      result |=
        (byte & 0x1f) << shift;

      shift += 5;
    } while (byte >= 0x20);

    const longitudeChange =
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    longitude += longitudeChange;

    points.push({
      latitude: latitude / 1e5,

      longitude: longitude / 1e5,
    });
  }

  return points;
}

/**
 * Find the closest point on the route polyline.
 *
 * For navigation purposes we use the closest
 * route vertex. This keeps the calculation
 * lightweight enough for a phone.
 */
function findClosestRoutePoint(
  location: Coordinates,
  routePoints: Coordinates[]
): {
  point: Coordinates | null;

  index: number;

  distanceMeters: number;
} {
  if (routePoints.length === 0) {
    return {
      point: null,

      index: -1,

      distanceMeters: Infinity,
    };
  }

  let closestPoint = routePoints[0];

  let closestIndex = 0;

  let closestDistance =
    calculateDistanceMeters(
      location,
      closestPoint
    );

  for (
    let index = 1;
    index < routePoints.length;
    index += 1
  ) {
    const point = routePoints[index];

    const distance =
      calculateDistanceMeters(
        location,
        point
      );

    if (distance < closestDistance) {
      closestDistance = distance;

      closestPoint = point;

      closestIndex = index;
    }
  }

  return {
    point: closestPoint,

    index: closestIndex,

    distanceMeters: closestDistance,
  };
}

/**
 * Calculate the remaining distance represented
 * by the route from the closest polyline point
 * to the destination.
 */
function calculateRemainingRouteDistance(
  routePoints: Coordinates[],
  closestIndex: number
): number {
  if (
    routePoints.length === 0 ||
    closestIndex < 0 ||
    closestIndex >= routePoints.length
  ) {
    return 0;
  }

  let remainingDistance = 0;

  for (
    let index = closestIndex;
    index < routePoints.length - 1;
    index += 1
  ) {
    remainingDistance +=
      calculateDistanceMeters(
        routePoints[index],
        routePoints[index + 1]
      );
  }

  return remainingDistance;
}

/**
 * Calculate the remaining route distance from
 * a particular coordinate to the destination.
 *
 * The coordinate is matched to the closest
 * route vertex first.
 */
function calculateRemainingDistanceFromCoordinate(
  coordinate: Coordinates,
  routePoints: Coordinates[]
): number {
  const closestPoint =
    findClosestRoutePoint(
      coordinate,
      routePoints
    );

  return calculateRemainingRouteDistance(
    routePoints,
    closestPoint.index
  );
}

/**
 * Calculate route progress from the closest
 * route point.
 */
function calculateProgress(
  route: RouteInfo,
  remainingDistanceMeters: number
): number {
  if (route.distanceMeters <= 0) {
    return 0;
  }

  const travelledDistance =
    route.distanceMeters -
    remainingDistanceMeters;

  const progress =
    (travelledDistance /
      route.distanceMeters) *
    100;

  return Math.min(
    100,
    Math.max(0, progress)
  );
}

/**
 * Determine the current maneuver phase
 * from the distance to the maneuver.
 */
function getManeuverPhase(
  distanceToManeuverMeters: number
): ManeuverPhase {
  if (
    distanceToManeuverMeters <=
    MANEUVER_IMMINENT_DISTANCE_METERS
  ) {
    return "IMMINENT";
  }

  if (
    distanceToManeuverMeters <=
    MANEUVER_APPROACHING_DISTANCE_METERS
  ) {
    return "APPROACHING";
  }

  return "FAR";
}

/**
 * Find the current navigation step.
 *
 * Step progression is based on both:
 *
 * 1. Distance from the rider to the current
 *    step's endpoint.
 *
 * 2. The rider's position along the route.
 *
 * This prevents the navigation system from
 * relying entirely on a single GPS radius.
 */
function getCurrentNavigationStep(
  location: Coordinates,
  steps: NavigationStep[],
  previousStepIndex: number,
  routePoints: Coordinates[],
  remainingRouteDistance: number
): {
  stepIndex: number;

  step: NavigationStep | null;

  distanceToManeuverMeters: number;

  stepAdvanced: boolean;
} {
  if (steps.length === 0) {
    return {
      stepIndex: -1,

      step: null,

      distanceToManeuverMeters: 0,

      stepAdvanced: false,
    };
  }

  let stepIndex = Math.max(
    0,
    previousStepIndex
  );

  let stepAdvanced = false;

  /**
   * Move forward through completed steps.
   *
   * We never move backwards through the
   * navigation instructions.
   */
  while (
    stepIndex < steps.length - 1
  ) {
    const currentStep =
      steps[stepIndex];

    const distanceToEnd =
      calculateDistanceMeters(
        location,
        currentStep.endLocation
      );

    /**
     * Determine where the end of this step
     * sits along the route.
     */
    const stepEndRemainingDistance =
      calculateRemainingDistanceFromCoordinate(
        currentStep.endLocation,
        routePoints
      );

    /**
     * Condition 1:
     *
     * The rider is physically close to
     * the step endpoint.
     */
    const reachedStepEndpoint =
      distanceToEnd <=
      STEP_COMPLETION_RADIUS_METERS;

    /**
     * Condition 2:
     *
     * The rider has progressed far enough
     * along the route that the step endpoint
     * has effectively been passed.
     *
     * The tolerance handles small differences
     * between the route geometry and GPS position.
     */
    const passedStepEndpoint =
      remainingRouteDistance <=
      stepEndRemainingDistance +
        STEP_ROUTE_PROGRESS_TOLERANCE_METERS;

    if (
      reachedStepEndpoint ||
      passedStepEndpoint
    ) {
      stepIndex += 1;

      stepAdvanced = true;

      continue;
    }

    break;
  }

  const currentStep =
    steps[stepIndex];

  const distanceToManeuver =
    calculateDistanceMeters(
      location,
      currentStep.endLocation
    );

  return {
    stepIndex,

    step: currentStep,

    distanceToManeuverMeters:
      distanceToManeuver,

    stepAdvanced,
  };
}

/**
 * Start a navigation session.
 */
export function startNavigationSession(
  destination: Destination,
  route: RouteInfo,
  origin: Coordinates
): NavigationSessionState {
  const firstStep =
    route.steps[0] ?? null;

  const distanceToFirstManeuver =
    firstStep
      ? calculateDistanceMeters(
          origin,
          firstStep.endLocation
        )
      : 0;

  return {
    status: "NAVIGATING",

    destination,

    route,

    remainingDistanceMeters:
      route.distanceMeters,

    remainingDurationSeconds:
      route.durationSeconds,

    progressPercent: 0,

    currentLocation: origin,

    routeOrigin: origin,

    offRoute: false,

    currentStepIndex:
      firstStep ? 0 : -1,

    currentStep: firstStep,

    distanceToNextManeuverMeters:
      distanceToFirstManeuver,

    maneuverPhase:
      firstStep
        ? getManeuverPhase(
            distanceToFirstManeuver
          )
        : "FAR",
  };
}

/**
 * Update the active navigation session
 * with a new GPS position.
 */
export function updateNavigationSession(
  state: NavigationSessionState,
  location: Coordinates
): NavigationUpdateResult {
  if (
    state.status === "IDLE" ||
    !state.destination ||
    !state.route
  ) {
    return {
      state,

      shouldReroute: false,

      arrived: false,
    };
  }

  const destinationDistance =
    calculateDistanceMeters(
      location,
      state.destination
    );

  /**
   * Destination reached.
   */
  if (
    destinationDistance <=
    ARRIVAL_RADIUS_METERS
  ) {
    return {
      state: {
        ...state,

        status: "ARRIVED",

        currentLocation: location,

        remainingDistanceMeters: 0,

        remainingDurationSeconds: 0,

        progressPercent: 100,

        offRoute: false,

        currentStepIndex:
          state.route.steps.length > 0
            ? state.route.steps.length - 1
            : -1,

        currentStep:
          state.route.steps[
            state.route.steps.length - 1
          ] ?? null,

        distanceToNextManeuverMeters: 0,

        maneuverPhase: "PASSED",
      },

      shouldReroute: false,

      arrived: true,
    };
  }

  /**
   * Decode the route while processing
   * an active navigation update.
   */
  const routePoints =
    decodePolyline(
      state.route.encodedPolyline
    );

  const closestRoutePoint =
    findClosestRoutePoint(
      location,
      routePoints
    );

  const remainingDistance =
    calculateRemainingRouteDistance(
      routePoints,
      closestRoutePoint.index
    );

  const progressPercent =
    calculateProgress(
      state.route,
      remainingDistance
    );

  /**
   * The rider is considered off the route
   * once they are more than 60 metres away
   * from the closest route point.
   */
  const offRoute =
    closestRoutePoint.distanceMeters >
    OFF_ROUTE_DISTANCE_METERS;

  /**
   * Rerouting is based on distance FROM THE
   * ROUTE, not distance travelled from the
   * original route origin.
   */
  const shouldReroute =
    closestRoutePoint.distanceMeters >=
    REROUTE_DISTANCE_METERS;

  /**
   * Determine the current navigation step.
   */
  const navigationStep =
    getCurrentNavigationStep(
      location,
      state.route.steps,
      state.currentStepIndex,
      routePoints,
      remainingDistance
    );

  /**
   * Determine the current maneuver phase.
   */
  const maneuverPhase =
    getManeuverPhase(
      navigationStep.distanceToManeuverMeters
    );

  /**
   * If the rider is sufficiently far away,
   * the session enters REROUTING state.
   *
   * Otherwise it remains NAVIGATING.
   */
  const nextStatus =
    shouldReroute
      ? "REROUTING"
      : "NAVIGATING";

  /**
   * Estimate remaining duration using
   * the proportion of the original route
   * that remains.
   */
  const remainingRatio =
    state.route.distanceMeters > 0
      ? remainingDistance /
        state.route.distanceMeters
      : 0;

  const remainingDuration =
    Math.max(
      0,
      Math.round(
        state.route.durationSeconds *
          remainingRatio
      )
    );

  const nextState: NavigationSessionState = {
    ...state,

    status: nextStatus,

    currentLocation: location,

    remainingDistanceMeters:
      remainingDistance,

    remainingDurationSeconds:
      remainingDuration,

    progressPercent,

    offRoute,

    currentStepIndex:
      navigationStep.stepIndex,

    currentStep:
      navigationStep.step,

    distanceToNextManeuverMeters:
      navigationStep.distanceToManeuverMeters,

    maneuverPhase,
  };

  return {
    state: nextState,

    shouldReroute,

    arrived: false,
  };
}

/**
 * Apply a newly calculated route after
 * a reroute.
 */
export function applyNavigationRoute(
  state: NavigationSessionState,
  route: RouteInfo,
  origin: Coordinates
): NavigationSessionState {
  if (!state.destination) {
    return state;
  }

  const firstStep =
    route.steps[0] ?? null;

  const distanceToFirstManeuver =
    firstStep
      ? calculateDistanceMeters(
          origin,
          firstStep.endLocation
        )
      : 0;

  return {
    ...state,

    status: "NAVIGATING",

    route,

    routeOrigin: origin,

    currentLocation: origin,

    remainingDistanceMeters:
      route.distanceMeters,

    remainingDurationSeconds:
      route.durationSeconds,

    progressPercent: 0,

    offRoute: false,

    currentStepIndex:
      firstStep ? 0 : -1,

    currentStep: firstStep,

    distanceToNextManeuverMeters:
      distanceToFirstManeuver,

    maneuverPhase:
      firstStep
        ? getManeuverPhase(
            distanceToFirstManeuver
          )
        : "FAR",
  };
}

/**
 * Stop navigation completely.
 */
export function stopNavigationSession(): NavigationSessionState {
  return createNavigationSessionState();
}

/* ============================================================
   PERSISTENT NAVIGATION SESSION STORE
   ============================================================ */

/**
 * The navigation session must live outside the
 * navigation screen because the screen can unmount
 * while navigation is still active.
 *
 * This module-level store survives screen changes
 * for the lifetime of the JavaScript application.
 */
let navigationSessionState =
  createNavigationSessionState();

/**
 * Subscribers are normally React hooks/components
 * that need to be notified when navigation changes.
 */
const navigationSessionListeners =
  new Set<
    (
      state: NavigationSessionState
    ) => void
  >();

/**
 * Read the current navigation session.
 */
export function getNavigationSessionState(): NavigationSessionState {
  return navigationSessionState;
}

/**
 * Subscribe to navigation session changes.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToNavigationSession(
  listener: (
    state: NavigationSessionState
  ) => void
): () => void {
  navigationSessionListeners.add(listener);

  return () => {
    navigationSessionListeners.delete(
      listener
    );
  };
}

/**
 * Replace the current navigation session
 * and notify all subscribers.
 */
export function setNavigationSessionState(
  state: NavigationSessionState
): void {
  navigationSessionState = state;

  navigationSessionListeners.forEach(
    (listener) => {
      listener(navigationSessionState);
    }
  );
}