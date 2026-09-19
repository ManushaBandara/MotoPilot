import { FuelEntry } from "./database";

export type FuelEfficiencyMeasurement = {
  distanceKm: number;
  fuelUsedLitres: number;
  kmPerLitre: number;
  fromFuelEntryId: number;
  toFuelEntryId: number;
};

export type FuelEfficiencyResult = {
  estimatedKmPerLitre: number | null;
  measurements: FuelEfficiencyMeasurement[];
};

const MIN_DISTANCE_KM = 1;
const MIN_FUEL_LITRES = 0.1;

function isValidFullTankEntry(
  entry: FuelEntry
): boolean {
  return (
    entry.isFullTank &&
    entry.odometerKm != null &&
    Number.isFinite(entry.odometerKm) &&
    entry.odometerKm >= 0 &&
    Number.isFinite(entry.amountLitres) &&
    entry.amountLitres > MIN_FUEL_LITRES
  );
}

export function calculateFuelEfficiency(
  fuelEntries: FuelEntry[]
): FuelEfficiencyResult {
  const fullTankEntries = fuelEntries
    .filter(isValidFullTankEntry)
    .sort(
      (a, b) =>
        new Date(a.addedAt).getTime() -
        new Date(b.addedAt).getTime()
    );

  if (fullTankEntries.length < 2) {
    return {
      estimatedKmPerLitre: null,
      measurements: [],
    };
  }

  const measurements: FuelEfficiencyMeasurement[] =
    [];

  for (
    let index = 1;
    index < fullTankEntries.length;
    index += 1
  ) {
    const previousEntry =
      fullTankEntries[index - 1];

    const currentEntry =
      fullTankEntries[index];

    if (!previousEntry || !currentEntry) {
      continue;
    }

    const previousOdometer =
      previousEntry.odometerKm;

    const currentOdometer =
      currentEntry.odometerKm;

    if (
      previousOdometer == null ||
      currentOdometer == null
    ) {
      continue;
    }

    const distanceKm =
      currentOdometer -
      previousOdometer;

    const fuelUsedLitres =
      currentEntry.amountLitres;

    if (
      distanceKm < MIN_DISTANCE_KM ||
      fuelUsedLitres <= MIN_FUEL_LITRES
    ) {
      continue;
    }

    const kmPerLitre =
      distanceKm /
      fuelUsedLitres;

    if (
      !Number.isFinite(kmPerLitre) ||
      kmPerLitre <= 0
    ) {
      continue;
    }

    measurements.push({
      distanceKm,
      fuelUsedLitres,
      kmPerLitre,
      fromFuelEntryId:
        previousEntry.id,
      toFuelEntryId:
        currentEntry.id,
    });
  }

  if (measurements.length === 0) {
    return {
      estimatedKmPerLitre: null,
      measurements: [],
    };
  }

  let totalDistanceKm = 0;
  let totalFuelUsedLitres = 0;

  for (const measurement of measurements) {
    totalDistanceKm +=
      measurement.distanceKm;

    totalFuelUsedLitres +=
      measurement.fuelUsedLitres;
  }

  const estimatedKmPerLitre =
    totalFuelUsedLitres > 0
      ? totalDistanceKm /
        totalFuelUsedLitres
      : null;

  return {
    estimatedKmPerLitre,
    measurements,
  };
}