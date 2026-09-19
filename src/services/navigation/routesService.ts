import type {
  NavigationStep,
  RouteInfo,
  RouteRequest,
} from "./navigationTypes";

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

type RoutesApiStep = {
  distanceMeters?: number;

  staticDuration?: string;

  duration?: string;

  startLocation?: {
    latLng?: {
      latitude?: number;

      longitude?: number;
    };
  };

  endLocation?: {
    latLng?: {
      latitude?: number;

      longitude?: number;
    };
  };

  navigationInstruction?: {
    maneuver?: string;

    instructions?: string;
  };
};

type RoutesApiLeg = {
  steps?: RoutesApiStep[];
};

type RoutesApiRoute = {
  distanceMeters?: number;

  duration?: string;

  polyline?: {
    encodedPolyline?: string;
  };

  legs?: RoutesApiLeg[];
};

type RoutesApiResponse = {
  routes?: RoutesApiRoute[];
};

function parseDurationSeconds(
  duration: string | undefined
): number {
  if (!duration) {
    return 0;
  }

  const match =
    duration.match(/^([\d.]+)s$/);

  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

function parseNavigationSteps(
  legs: RoutesApiLeg[] | undefined
): NavigationStep[] {
  if (!legs) {
    return [];
  }

  const steps: NavigationStep[] = [];

  for (const leg of legs) {
    if (!leg.steps) {
      continue;
    }

    for (const step of leg.steps) {
      const startLocation =
        step.startLocation?.latLng;

      const endLocation =
        step.endLocation?.latLng;

      const instruction =
        step.navigationInstruction
          ?.instructions;

      const maneuver =
        step.navigationInstruction
          ?.maneuver;

      if (
        !startLocation ||
        startLocation.latitude === undefined ||
        startLocation.longitude === undefined ||
        !endLocation ||
        endLocation.latitude === undefined ||
        endLocation.longitude === undefined ||
        !instruction ||
        !maneuver
      ) {
        continue;
      }

      steps.push({
        distanceMeters:
          step.distanceMeters ?? 0,

        durationSeconds:
          parseDurationSeconds(
            step.staticDuration ??
              step.duration
          ),

        instruction,

        maneuver,

        startLocation: {
          latitude:
            startLocation.latitude,

          longitude:
            startLocation.longitude,
        },

        endLocation: {
          latitude:
            endLocation.latitude,

          longitude:
            endLocation.longitude,
        },
      });
    }
  }

  return steps;
}

export async function calculateRoute(
  request: RouteRequest
): Promise<RouteInfo> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not configured."
    );
  }

  const response =
    await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "X-Goog-Api-Key":
            GOOGLE_MAPS_API_KEY,

          "X-Goog-FieldMask":
            [
              "routes.duration",
              "routes.distanceMeters",
              "routes.polyline.encodedPolyline",
              "routes.legs.steps.distanceMeters",
              "routes.legs.steps.staticDuration",
              "routes.legs.steps.startLocation",
              "routes.legs.steps.endLocation",
              "routes.legs.steps.navigationInstruction",
            ].join(","),
        },

        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude:
                  request.origin.latitude,

                longitude:
                  request.origin.longitude,
              },
            },
          },

          destination: {
            location: {
              latLng: {
                latitude:
                  request.destination.latitude,

                longitude:
                  request.destination.longitude,
              },
            },
          },

          travelMode:
            "TWO_WHEELER",

          routingPreference:
            "TRAFFIC_AWARE",

          computeAlternativeRoutes:
            false,

          languageCode:
            "en-US",

          units:
            "METRIC",
        }),
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Routes API failed (${response.status}): ${errorText}`
    );
  }

  const data =
    (await response.json()) as RoutesApiResponse;

  const route =
    data.routes?.[0];

  if (!route) {
    throw new Error(
      "No route was found."
    );
  }

  const encodedPolyline =
    route.polyline?.encodedPolyline;

  if (!encodedPolyline) {
    throw new Error(
      "Route was returned without route geometry."
    );
  }

  const steps =
    parseNavigationSteps(
      route.legs
    );

  return {
    distanceMeters:
      route.distanceMeters ?? 0,

    durationSeconds:
      parseDurationSeconds(
        route.duration
      ),

    encodedPolyline,

    steps,
  };
}