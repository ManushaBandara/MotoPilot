import {
  calculateLitresFromSpending,
  addFuelToTank,
  calculateRemainingRange,
} from "./fuelCalculator";

import {
  saveFuelEntry,
} from "./database";

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

  const estimatedFuelRemaining =
    addFuelToTank(
      settings.estimatedFuelRemainingLitres,
      litresAdded,
      settings.tankCapacityLitres
    );

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
      settings.estimatedKmPerLitre
    );

  return {
    amountSpent,
    pricePerLitre: effectivePrice,
    litresAdded,
    estimatedFuelRemainingLitres:
      estimatedFuelRemaining,
    estimatedRangeKm,
  };
}