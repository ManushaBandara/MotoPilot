import {
  createSpeedFilterState,
  filterSpeed,
} from "./src/services/speedFilter";

function kmhToMs(kmh: number) {
  return kmh / 3.6;
}

function runTest(
  name: string,
  readings: {
    speedKmh: number;
    accuracyMeters: number;
  }[]
) {
  const state = createSpeedFilterState();

  console.log(`\n=== ${name} ===\n`);

  for (const reading of readings) {
    const filteredSpeed = filterSpeed(
      kmhToMs(reading.speedKmh),
      reading.accuracyMeters,
      state
    );

    console.log(
      `Input: ${reading.speedKmh
        .toString()
        .padStart(3)} km/h | ` +
        `Accuracy: ${reading.accuracyMeters
          .toString()
          .padStart(3)} m | ` +
        `Output: ${filteredSpeed
          .toString()
          .padStart(3)} km/h`
    );
  }
}

// ---------------------------------------------
// TEST 1: Stationary GPS noise
// ---------------------------------------------

runTest(
  "STATIONARY GPS NOISE",
  [
    { speedKmh: 0, accuracyMeters: 5 },
    { speedKmh: 0.4, accuracyMeters: 5 },
    { speedKmh: 0.8, accuracyMeters: 6 },
    { speedKmh: 1.2, accuracyMeters: 5 },
    { speedKmh: 1.7, accuracyMeters: 7 },
    { speedKmh: 0.6, accuracyMeters: 6 },
    { speedKmh: 1.4, accuracyMeters: 5 },
    { speedKmh: 0.3, accuracyMeters: 5 },
    { speedKmh: 0, accuracyMeters: 5 },
  ]
);

// ---------------------------------------------
// TEST 2: Normal acceleration
// ---------------------------------------------

runTest(
  "NORMAL ACCELERATION",
  [
    { speedKmh: 0, accuracyMeters: 5 },
    { speedKmh: 3, accuracyMeters: 5 },
    { speedKmh: 7, accuracyMeters: 6 },
    { speedKmh: 12, accuracyMeters: 5 },
    { speedKmh: 18, accuracyMeters: 6 },
    { speedKmh: 25, accuracyMeters: 5 },
    { speedKmh: 32, accuracyMeters: 7 },
    { speedKmh: 40, accuracyMeters: 6 },
    { speedKmh: 48, accuracyMeters: 5 },
    { speedKmh: 55, accuracyMeters: 6 },
    { speedKmh: 62, accuracyMeters: 5 },
    { speedKmh: 70, accuracyMeters: 6 },
    { speedKmh: 80, accuracyMeters: 5 },
  ]
);

// ---------------------------------------------
// TEST 3: Normal deceleration
// ---------------------------------------------

runTest(
  "NORMAL DECELERATION",
  [
    { speedKmh: 80, accuracyMeters: 5 },
    { speedKmh: 72, accuracyMeters: 6 },
    { speedKmh: 65, accuracyMeters: 5 },
    { speedKmh: 58, accuracyMeters: 7 },
    { speedKmh: 50, accuracyMeters: 6 },
    { speedKmh: 42, accuracyMeters: 5 },
    { speedKmh: 35, accuracyMeters: 6 },
    { speedKmh: 28, accuracyMeters: 5 },
    { speedKmh: 20, accuracyMeters: 6 },
    { speedKmh: 12, accuracyMeters: 5 },
    { speedKmh: 5, accuracyMeters: 6 },
    { speedKmh: 0, accuracyMeters: 5 },
  ]
);

// ---------------------------------------------
// TEST 4: GPS speed jump
// ---------------------------------------------

runTest(
  "GPS SPEED JUMP",
  [
    { speedKmh: 40, accuracyMeters: 5 },
    { speedKmh: 42, accuracyMeters: 5 },
    { speedKmh: 44, accuracyMeters: 6 },

    // Bad GPS speed jump.
    { speedKmh: 100, accuracyMeters: 5 },

    { speedKmh: 45, accuracyMeters: 5 },
    { speedKmh: 47, accuracyMeters: 6 },
    { speedKmh: 49, accuracyMeters: 5 },
  ]
);

// ---------------------------------------------
// TEST 5: Impossible speed
// ---------------------------------------------

runTest(
  "IMPOSSIBLE SPEED",
  [
    { speedKmh: 40, accuracyMeters: 5 },
    { speedKmh: 45, accuracyMeters: 5 },
    { speedKmh: 50, accuracyMeters: 6 },

    // Impossible motorcycle speed.
    { speedKmh: 260, accuracyMeters: 5 },

    { speedKmh: 52, accuracyMeters: 5 },
    { speedKmh: 55, accuracyMeters: 6 },
  ]
);

// ---------------------------------------------
// TEST 6: Poor GPS accuracy
// ---------------------------------------------

runTest(
  "POOR GPS ACCURACY",
  [
    { speedKmh: 40, accuracyMeters: 5 },
    { speedKmh: 42, accuracyMeters: 5 },

    // GPS accuracy becomes very poor.
    { speedKmh: 80, accuracyMeters: 60 },

    { speedKmh: 45, accuracyMeters: 5 },
    { speedKmh: 47, accuracyMeters: 5 },
  ]
);

console.log(
  "\n=== ALL TESTS COMPLETE ===\n"
);