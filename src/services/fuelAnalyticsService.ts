import {
  getFuelEntries,
  getRidesForDateRange,
} from "./database";

import {
  calculateMonthlyFuelAnalytics,
  MonthlyFuelAnalytics,
} from "./fuelAnalytics";

export type FuelAnalyticsPeriod = {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
};

function createMonthDateRange(
  year: number,
  month: number
): FuelAnalyticsPeriod {
  const startDate = new Date(
    year,
    month,
    1,
    0,
    0,
    0,
    0
  );

  const endDate = new Date(
    year,
    month + 1,
    1,
    0,
    0,
    0,
    0
  );

  return {
    year,
    month,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

export async function getMonthlyFuelAnalytics(
  year: number,
  month: number
): Promise<MonthlyFuelAnalytics> {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    throw new Error(
      "Invalid analytics year."
    );
  }

  if (
    !Number.isInteger(month) ||
    month < 0 ||
    month > 11
  ) {
    throw new Error(
      "Invalid analytics month."
    );
  }

  const period =
    createMonthDateRange(
      year,
      month
    );

  const [
    allFuelEntries,
    monthlyRides,
  ] = await Promise.all([
    getFuelEntries(),

    getRidesForDateRange(
      period.startDate,
      period.endDate
    ),
  ]);

  return calculateMonthlyFuelAnalytics(
    period.year,
    period.month,
    allFuelEntries,
    monthlyRides
  );
}