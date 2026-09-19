import {
  calculateFuelConsumed,
} from "../src/services/fuelCalculator";

function assert(
  condition: boolean,
  message: string
) {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }

  console.log(`PASSED: ${message}`);
}

/* ============================================================
   TEST 1
   40 km/L
   100 km ride
   Expected fuel consumption = 2.5 L
   ============================================================ */

const fuelConsumed1 =
  calculateFuelConsumed(
    100,
    40
  );

assert(
  fuelConsumed1 === 2.5,
  "calculates 2.5 L consumption for a 100 km ride at 40 km/L"
);

/* ============================================================
   TEST 2
   40 km/L
   10 km ride
   Expected = 0.25 L
   ============================================================ */

const fuelConsumed2 =
  calculateFuelConsumed(
    10,
    40
  );

assert(
  fuelConsumed2 === 0.25,
  "calculates 0.25 L consumption for a 10 km ride"
);

/* ============================================================
   TEST 3
   Invalid distance
   ============================================================ */

const fuelConsumed3 =
  calculateFuelConsumed(
    0,
    40
  );

assert(
  fuelConsumed3 === 0,
  "returns zero for a zero-distance ride"
);

/* ============================================================
   TEST 4
   Invalid efficiency
   ============================================================ */

const fuelConsumed4 =
  calculateFuelConsumed(
    100,
    0
  );

assert(
  fuelConsumed4 === 0,
  "returns zero when fuel efficiency is invalid"
);

/* ============================================================
   TEST 5
   Tank consumption
   Starting fuel = 8 L
   Ride = 100 km
   Efficiency = 40 km/L

   Consumption = 2.5 L
   Remaining = 5.5 L
   ============================================================ */

const startingFuel = 8;

const distanceKm = 100;

const efficiency = 40;

const consumed =
  calculateFuelConsumed(
    distanceKm,
    efficiency
  );

const remainingFuel =
  Math.max(
    startingFuel -
      consumed,
    0
  );

assert(
  remainingFuel === 5.5,
  "reduces estimated fuel correctly after a ride"
);

/* ============================================================
   TEST 6
   Fuel must never become negative
   Starting fuel = 1 L
   Ride = 100 km
   Efficiency = 40 km/L

   Consumption = 2.5 L
   Remaining = 0 L
   ============================================================ */

const lowFuel = 1;

const largeConsumption =
  calculateFuelConsumed(
    100,
    40
  );

const safeRemainingFuel =
  Math.max(
    lowFuel -
      largeConsumption,
    0
  );

assert(
  safeRemainingFuel === 0,
  "never allows estimated fuel to become negative"
);

console.log(
  "\nAll ride-completion fuel tests passed."
);