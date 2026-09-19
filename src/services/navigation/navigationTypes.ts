export type Destination = {
  name: string;

  address: string;

  latitude: number;

  longitude: number;
};

export type ManeuverPhase =
  | "FAR"
  | "APPROACHING"
  | "IMMINENT"
  | "PASSED";

export type NavigationStep = {
  distanceMeters: number;

  durationSeconds: number;

  instruction: string;

  maneuver: string;

  startLocation: {
    latitude: number;

    longitude: number;
  };

  endLocation: {
    latitude: number;

    longitude: number;
  };
};

export type RouteInfo = {
  distanceMeters: number;

  durationSeconds: number;

  encodedPolyline: string;

  steps: NavigationStep[];
};

export type RouteRequest = {
  origin: {
    latitude: number;

    longitude: number;
  };

  destination: {
    latitude: number;

    longitude: number;
  };
};