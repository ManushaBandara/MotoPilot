const MIN_SPEED_KMH = 2;
const MAX_SPEED_KMH = 250;

const LARGE_SPEED_CHANGE_KMH = 30;

const POOR_ACCURACY_METERS = 50;

export type SpeedFilterState = {
  previousSpeedKmh: number | null;
  suspiciousReadingCount: number;
};

export function createSpeedFilterState(): SpeedFilterState {
  return {
    previousSpeedKmh: null,
    suspiciousReadingCount: 0,
  };
}

export function filterSpeed(
  rawSpeedMs: number | null,
  accuracyMeters: number | null,
  state: SpeedFilterState
): number {
  // ---------------------------------------------
  // No speed available
  // ---------------------------------------------

  if (rawSpeedMs == null) {
    return state.previousSpeedKmh ?? 0;
  }

  // ---------------------------------------------
  // Convert m/s → km/h
  // ---------------------------------------------

  const rawSpeedKmh = rawSpeedMs * 3.6;

  // ---------------------------------------------
  // Reject impossible readings
  // ---------------------------------------------

  if (
    rawSpeedKmh < 0 ||
    rawSpeedKmh > MAX_SPEED_KMH
  ) {
    return state.previousSpeedKmh ?? 0;
  }

  // ---------------------------------------------
  // Stationary threshold
  // ---------------------------------------------

  if (rawSpeedKmh < MIN_SPEED_KMH) {
    state.previousSpeedKmh = 0;
    state.suspiciousReadingCount = 0;

    return 0;
  }

  // ---------------------------------------------
  // Poor GPS accuracy
  // ---------------------------------------------

  if (
    accuracyMeters != null &&
    accuracyMeters > POOR_ACCURACY_METERS
  ) {
    console.log(
      "GPS: poor accuracy:",
      accuracyMeters,
      "m"
    );

    return state.previousSpeedKmh ?? 0;
  }

  // ---------------------------------------------
  // First valid reading
  // ---------------------------------------------

  if (state.previousSpeedKmh == null) {
    state.previousSpeedKmh = rawSpeedKmh;

    return Math.round(rawSpeedKmh);
  }

  // ---------------------------------------------
  // Detect sudden GPS speed jumps
  // ---------------------------------------------

  const speedDifference = Math.abs(
    rawSpeedKmh -
      state.previousSpeedKmh
  );

  if (
    speedDifference >
    LARGE_SPEED_CHANGE_KMH
  ) {
    state.suspiciousReadingCount += 1;

    console.log(
      "GPS: possible speed jump:",
      rawSpeedKmh
    );

    // Require two consecutive suspicious
    // readings before accepting the change.
    if (
      state.suspiciousReadingCount < 2
    ) {
      return Math.round(
        state.previousSpeedKmh
      );
    }
  } else {
    state.suspiciousReadingCount = 0;
  }

  // ---------------------------------------------
  // Accept the reading
  // ---------------------------------------------

  state.previousSpeedKmh = rawSpeedKmh;

  return Math.round(rawSpeedKmh);
}