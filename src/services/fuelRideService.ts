import {
  calculateFuelConsumed,
  consumeFuelFromTank,
} from "./fuelCalculator";

import {
  getFuelSettings,
  updateEstimatedFuelRemaining,
} from "./fuelSettings";

export type RideFuelConsumptionResult = {
  distanceKm: number;
  estimatedKmPerLitre: number;
  fuelConsumedLitres: number;
  estimatedFuelRemainingLitres: number;
};

export async function processRideFuelConsumption(
  distanceKm: number
): Promise<RideFuelConsumptionResult> {
  if (
    !Number.isFinite(distanceKm) ||
    distanceKm <= 0
  ) {
    throw new Error(
      "Ride distance must be greater than zero."
    );
  }

  const settings =
    await getFuelSettings();

  if (
    !Number.isFinite(
      settings.estimatedKmPerLitre
    ) ||
    settings.estimatedKmPerLitre <= 0
  ) {
    throw new Error(
      "Estimated fuel efficiency is not configured."
    );
  }

  const fuelConsumedLitres =
    calculateFuelConsumed(
      distanceKm,
      settings.estimatedKmPerLitre
    );

  const estimatedFuelRemainingLitres =
    consumeFuelFromTank(
      settings.estimatedFuelRemainingLitres,
      distanceKm,
      settings.estimatedKmPerLitre
    );

  await updateEstimatedFuelRemaining(
    estimatedFuelRemainingLitres,
    settings.tankCapacityLitres
  );

  return {
    distanceKm,
    estimatedKmPerLitre:
      settings.estimatedKmPerLitre,
    fuelConsumedLitres,
    estimatedFuelRemainingLitres,
  };
}