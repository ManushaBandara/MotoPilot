import {
  FuelEntry,
} from "../src/services/database";

import {
  calculateFuelEfficiency,
} from "../src/services/fuelEfficiency";

function assert(
  condition: boolean,
  message: string
) {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }

  console.log(`PASSED: ${message}`);
}

function createFuelEntry(
  overrides: Partial<FuelEntry>
): FuelEntry {
  return {
    id: 1,
    addedAt: "2026-09-01T08:00:00.000Z",
    amountLitres: 10,
    pricePerLitre: 300,
    amountSpent: 3000,
    odometerKm: 20000,
    isFullTank: true,
    ...overrides,
  };
}

/* ============================================================
   TEST 1
   Full tank → full tank
   20,000 km → 20,400 km
   10 L added
   Expected: 40 km/L
   ============================================================ */

const result1 =
  calculateFuelEfficiency([
    createFuelEntry({
      id: 1,
      addedAt:
        "2026-09-01T08:00:00.000Z",
      odometerKm: 20000,
      amountLitres: 10,
      isFullTank: true,
    }),

    createFuelEntry({
      id: 2,
      addedAt:
        "2026-09-10T08:00:00.000Z",
      odometerKm: 20400,
      amountLitres: 10,
      isFullTank: true,
    }),
  ]);

assert(
  result1.estimatedKmPerLitre === 40,
  "calculates 40 km/L from full-tank readings"
);

/* ============================================================
   TEST 2
   Partial refuel should NOT be used
   ============================================================ */

const result2 =
  calculateFuelEfficiency([
    createFuelEntry({
      id: 1,
      odometerKm: 20000,
      amountLitres: 10,
      isFullTank: true,
    }),

    createFuelEntry({
      id: 2,
      odometerKm: 20200,
      amountLitres: 5,
      isFullTank: false,
    }),

    createFuelEntry({
      id: 3,
      odometerKm: 20400,
      amountLitres: 10,
      isFullTank: true,
    }),
  ]);

assert(
  result2.estimatedKmPerLitre === 40,
  "ignores partial refuels when calculating efficiency"
);

/* ============================================================
   TEST 3
   Not enough full-tank records
   ============================================================ */

const result3 =
  calculateFuelEfficiency([
    createFuelEntry({
      id: 1,
      odometerKm: 20000,
      isFullTank: true,
    }),
  ]);

assert(
  result3.estimatedKmPerLitre === null,
  "returns null when there is only one full-tank reading"
);

/* ============================================================
   TEST 4
   Missing odometer
   ============================================================ */

const result4 =
  calculateFuelEfficiency([
    createFuelEntry({
      id: 1,
      odometerKm: null,
      isFullTank: true,
    }),

    createFuelEntry({
      id: 2,
      odometerKm: 20400,
      amountLitres: 10,
      isFullTank: true,
    }),
  ]);

assert(
  result4.estimatedKmPerLitre === null,
  "does not calculate efficiency without an odometer reading"
);

/* ============================================================
   TEST 5
   Weighted efficiency
   300 km / 10 L
   500 km / 20 L

   Total:
   800 km / 30 L
   = 26.666... km/L
   ============================================================ */

const result5 =
  calculateFuelEfficiency([
    createFuelEntry({
      id: 1,
      addedAt:
        "2026-09-01T08:00:00.000Z",
      odometerKm: 20000,
      amountLitres: 10,
      isFullTank: true,
    }),

    createFuelEntry({
      id: 2,
      addedAt:
        "2026-09-05T08:00:00.000Z",
      odometerKm: 20300,
      amountLitres: 10,
      isFullTank: true,
    }),

    createFuelEntry({
      id: 3,
      addedAt:
        "2026-09-10T08:00:00.000Z",
      odometerKm: 20800,
      amountLitres: 20,
      isFullTank: true,
    }),
  ]);

assert(
  Math.abs(
    (result5.estimatedKmPerLitre ?? 0) -
      26.6666666667
  ) < 0.000001,
  "calculates weighted average fuel efficiency"
);

console.log(
  "\nAll fuel-efficiency tests passed."
);