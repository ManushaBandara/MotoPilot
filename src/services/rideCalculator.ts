import {
  calculateDistanceMeters,
  Coordinates,
} from "./distance";

export type RideLocation = Coordinates & {
  accuracy: number | null;
};

const MIN_SPEED_KMH = 2;
const MAX_ACCURACY_METERS = 50;
const MIN_DISTANCE_METERS = 3;

export type RideCalculationState = {
  previousLocation: RideLocation | null;
  distanceMeters: number;
  speedSamples: number[];
  maxSpeedKmh: number;
};

export function createRideCalculationState(): RideCalculationState {
  return {
    previousLocation: null,
    distanceMeters: 0,
    speedSamples: [],
    maxSpeedKmh: 0,
  };
}

export function processRideLocation(
  state: RideCalculationState,
  location: RideLocation,
  speedKmh: number
) {
  if (
    location.accuracy != null &&
    location.accuracy > MAX_ACCURACY_METERS
  ) {
    return;
  }

  if (speedKmh >= MIN_SPEED_KMH) {
    state.speedSamples.push(speedKmh);

    if (speedKmh > state.maxSpeedKmh) {
      state.maxSpeedKmh = speedKmh;
    }
  }

  if (speedKmh < MIN_SPEED_KMH) {
    state.previousLocation = location;
    return;
  }

  if (!state.previousLocation) {
    state.previousLocation = location;
    return;
  }

  const distance = calculateDistanceMeters(
    state.previousLocation,
    location
  );

  state.previousLocation = location;

  if (distance < MIN_DISTANCE_METERS) {
    return;
  }

  state.distanceMeters += distance;
}

export function calculateAverageSpeed(
  state: RideCalculationState
): number {
  if (state.speedSamples.length === 0) {
    return 0;
  }

  const totalSpeed = state.speedSamples.reduce(
    (total, speed) => total + speed,
    0
  );

  return totalSpeed / state.speedSamples.length;
}