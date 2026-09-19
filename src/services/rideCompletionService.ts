import {
  saveRide,
  RideRoutePoint,
} from "./database";

import {
  processRideFuelConsumption,
  RideFuelConsumptionResult,
} from "./fuelRideService";

export type CompleteRideInput = {
  startedAt: string;
  durationSeconds: number;
  distanceKm: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  route: RideRoutePoint[];
};

export type CompleteRideResult = {
  fuel: RideFuelConsumptionResult | null;
};

export async function completeRide(
  ride: CompleteRideInput
): Promise<CompleteRideResult> {
  if (
    !Number.isFinite(ride.durationSeconds) ||
    ride.durationSeconds < 0
  ) {
    throw new Error(
      "Ride duration is invalid."
    );
  }

  if (
    !Number.isFinite(ride.distanceKm) ||
    ride.distanceKm < 0
  ) {
    throw new Error(
      "Ride distance is invalid."
    );
  }

  if (
    !Number.isFinite(ride.averageSpeedKmh) ||
    ride.averageSpeedKmh < 0
  ) {
    throw new Error(
      "Average speed is invalid."
    );
  }

  if (
    !Number.isFinite(ride.maxSpeedKmh) ||
    ride.maxSpeedKmh < 0
  ) {
    throw new Error(
      "Maximum speed is invalid."
    );
  }

  /*
   * Save the completed ride first.
   */
  await saveRide({
    startedAt: ride.startedAt,
    durationSeconds:
      ride.durationSeconds,
    distanceKm:
      ride.distanceKm,
    averageSpeedKmh:
      ride.averageSpeedKmh,
    maxSpeedKmh:
      ride.maxSpeedKmh,
    route: ride.route,
  });

  /*
   * A zero-distance ride should still be
   * saved, but it should not consume fuel.
   */
  if (ride.distanceKm <= 0) {
    return {
      fuel: null,
    };
  }

  /*
   * Fuel consumption is estimated from the
   * currently configured km/L value.
   */
  const fuel =
    await processRideFuelConsumption(
      ride.distanceKm
    );

  return {
    fuel,
  };
}