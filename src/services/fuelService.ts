import {
  calculateLitresFromSpending,
  addFuelToTank,
  calculateRemainingRange,
} from "./fuelCalculator";

import {
  getFuelEntries,
  saveFuelEntry,
} from "./database";

import {
  calculateFuelEfficiency,
} from "./fuelEfficiency";

import {
  getFuelSettings,
  updateCurrentFuelPrice,
  updateEstimatedFuelRemaining,
} from "./fuelSettings";

export type AddFuelResult = {
  amountSpent: number;
  pricePerLitre: number;
  litresAdded: number;
  estimatedFuelRemainingLitres: number;
  estimatedRangeKm: number;
  estimatedKmPerLitre: number;
};

export async function addFuelTransaction({
  amountSpent,
  pricePerLitre,
  odometerKm,
  isFullTank = false,
}: {
  amountSpent: number;
  pricePerLitre?: number;
  odometerKm?: number | null;
  isFullTank?: boolean;
}): Promise<AddFuelResult> {
  if (
    !Number.isFinite(amountSpent) ||
    amountSpent <= 0
  ) {
    throw new Error(
      "Amount spent must be greater than zero."
    );
  }

  const settings =
    await getFuelSettings();

  const effectivePrice =
    pricePerLitre ??
    settings.currentFuelPrice;

  if (
    !Number.isFinite(effectivePrice) ||
    effectivePrice <= 0
  ) {
    throw new Error(
      "Fuel price must be greater than zero."
    );
  }

  if (
    odometerKm != null &&
    (
      !Number.isFinite(odometerKm) ||
      odometerKm < 0
    )
  ) {
    throw new Error(
      "Odometer reading must be zero or greater."
    );
  }

  /*
   * Calculate the amount of fuel purchased.
   *
   * Example:
   * Rs. 3000 / Rs. 300 per litre = 10 litres
   */
  const litresAdded =
    calculateLitresFromSpending(
      amountSpent,
      effectivePrice
    );

  if (litresAdded <= 0) {
    throw new Error(
      "Unable to calculate fuel amount."
    );
  }

  /*
   * Save the fuel transaction first.
   *
   * We do this before calculating measured
   * efficiency because the new full-tank
   * checkpoint needs to be included.
   */
  const now =
    new Date().toISOString();

  await saveFuelEntry({
    addedAt: now,
    amountLitres: litresAdded,
    pricePerLitre: effectivePrice,
    amountSpent,
    odometerKm:
      odometerKm ?? null,
    isFullTank,
  });

  /*
   * Reload all fuel entries and calculate
   * measured efficiency from full-tank
   * checkpoints.
   */
  const updatedFuelEntries =
    await getFuelEntries();

  const efficiencyResult =
    calculateFuelEfficiency(
      updatedFuelEntries
    );

  /*
   * Measured efficiency is now authoritative
   * whenever enough full-tank data exists.
   *
   * Until then, use the manually configured
   * efficiency as the fallback.
   */
  const effectiveKmPerLitre =
    efficiencyResult.estimatedKmPerLitre ??
    settings.estimatedKmPerLitre;

  /*
   * A full-tank refuel means the estimated
   * tank should now be considered full.
   *
   * Otherwise, add the purchased fuel to
   * the current estimated fuel level.
   */
  const estimatedFuelRemaining =
    isFullTank
      ? settings.tankCapacityLitres
      : addFuelToTank(
          settings.estimatedFuelRemainingLitres,
          litresAdded,
          settings.tankCapacityLitres
        );

  await updateCurrentFuelPrice(
    effectivePrice
  );

  await updateEstimatedFuelRemaining(
    estimatedFuelRemaining,
    settings.tankCapacityLitres
  );

  const estimatedRangeKm =
    calculateRemainingRange(
      estimatedFuelRemaining,
      effectiveKmPerLitre
    );

  return {
    amountSpent,
    pricePerLitre: effectivePrice,
    litresAdded,
    estimatedFuelRemainingLitres:
      estimatedFuelRemaining,
    estimatedRangeKm,
    estimatedKmPerLitre:
      effectiveKmPerLitre,
  };
}