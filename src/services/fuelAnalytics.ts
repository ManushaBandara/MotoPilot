import {
  FuelEntry,
  Ride,
} from "./database";

import {
  calculateFuelEfficiency,
} from "./fuelEfficiency";

export type MonthlyFuelAnalytics = {
  year: number;
  month: number;

  totalMoneySpent: number;
  totalLitresPurchased: number;
  averageFuelPrice: number;
  refuelCount: number;

  distanceKm: number;

  estimatedKmPerLitre: number | null;
  estimatedCostPerKm: number | null;
};

function isSameMonth(
  dateString: string,
  year: number,
  month: number
): boolean {
  const date = new Date(dateString);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month
  );
}

export function calculateMonthlyFuelAnalytics(
  year: number,
  month: number,
  fuelEntries: FuelEntry[],
  rides: Ride[]
): MonthlyFuelAnalytics {
  const monthlyFuelEntries =
    fuelEntries.filter((entry) =>
      isSameMonth(
        entry.addedAt,
        year,
        month
      )
    );

  const monthlyRides =
    rides.filter((ride) =>
      isSameMonth(
        ride.startedAt,
        year,
        month
      )
    );

  let totalMoneySpent = 0;
  let totalLitresPurchased = 0;

  for (const entry of monthlyFuelEntries) {
    if (
      entry.amountSpent != null &&
      Number.isFinite(entry.amountSpent) &&
      entry.amountSpent > 0
    ) {
      totalMoneySpent +=
        entry.amountSpent;
    }

    if (
      Number.isFinite(entry.amountLitres) &&
      entry.amountLitres > 0
    ) {
      totalLitresPurchased +=
        entry.amountLitres;
    }
  }

  const averageFuelPrice =
    totalLitresPurchased > 0
      ? totalMoneySpent /
        totalLitresPurchased
      : 0;

  const distanceKm =
    monthlyRides.reduce(
      (total, ride) =>
        total +
        (Number.isFinite(
          ride.distanceKm
        )
          ? Math.max(
              ride.distanceKm,
              0
            )
          : 0),
      0
    );

  /*
   * Efficiency is calculated from valid
   * full-tank checkpoints across the
   * complete fuel history, not only from
   * this month's purchases.
   */
  const efficiency =
    calculateFuelEfficiency(
      fuelEntries
    );

  const estimatedKmPerLitre =
    efficiency.estimatedKmPerLitre;

  const estimatedCostPerKm =
    estimatedKmPerLitre != null &&
    estimatedKmPerLitre > 0 &&
    averageFuelPrice > 0
      ? averageFuelPrice /
        estimatedKmPerLitre
      : null;

  return {
    year,
    month,

    totalMoneySpent,
    totalLitresPurchased,

    averageFuelPrice,

    refuelCount:
      monthlyFuelEntries.length,

    distanceKm,

    estimatedKmPerLitre,
    estimatedCostPerKm,
  };
}