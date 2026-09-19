import {
  calculateFuelConsumed,
  consumeFuelFromTank,
} from "./fuelCalculator";

import {
  getFuelEntries,
} from "./database";

import {
  calculateFuelEfficiency,
} from "./fuelEfficiency";

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

  /*
   * Get the measured efficiency from
   * full-tank checkpoints.
   */
  const fuelEntries =
    await getFuelEntries();

  const efficiencyResult =
    calculateFuelEfficiency(
      fuelEntries
    );

  /*
   * Measured efficiency is authoritative
   * when available.
   *
   * Manual settings remain the fallback
   * until enough full-tank checkpoints
   * have been recorded.
   */
  const effectiveKmPerLitre =
    efficiencyResult.estimatedKmPerLitre ??
    settings.estimatedKmPerLitre;

  if (
    !Number.isFinite(
      effectiveKmPerLitre
    ) ||
    effectiveKmPerLitre <= 0
  ) {
    throw new Error(
      "Estimated fuel efficiency is not configured."
    );
  }

  /*
   * Calculate estimated fuel consumed
   * using the effective efficiency.
   */
  const fuelConsumedLitres =
    calculateFuelConsumed(
      distanceKm,
      effectiveKmPerLitre
    );

  /*
   * Reduce the estimated tank level.
   */
  const estimatedFuelRemainingLitres =
    consumeFuelFromTank(
      settings.estimatedFuelRemainingLitres,
      distanceKm,
      effectiveKmPerLitre
    );

  await updateEstimatedFuelRemaining(
    estimatedFuelRemainingLitres,
    settings.tankCapacityLitres
  );

  return {
    distanceKm,

    estimatedKmPerLitre:
      effectiveKmPerLitre,

    fuelConsumedLitres,

    estimatedFuelRemainingLitres,
  };
}