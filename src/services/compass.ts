import {
  Accelerometer,
  Magnetometer,
} from "expo-sensors";

const SENSOR_UPDATE_INTERVAL_MS = 100;

const GPS_FUSION_MIN_SPEED_KMH = 8;

const GPS_WEIGHT = 0.65;

export type CompassReading = {
  heading: number;
  magneticHeading: number;
  gpsHeading: number | null;
  usingGpsHeading: boolean;
  accuracy: number | null;
};

type SensorVector = {
  x: number;
  y: number;
  z: number;
};

function normalizeHeading(
  heading: number
): number {
  const normalized =
    ((heading % 360) + 360) % 360;

  return normalized;
}

function calculateTiltCompensatedHeading(
  magnetometer: SensorVector,
  accelerometer: SensorVector
): number {
  /*
   * Accelerometer gives the direction
   * of gravity.
   *
   * We use it to compensate for the
   * phone being tilted.
   */

  const { x, y, z } = accelerometer;

  const magnitude = Math.sqrt(
    x * x +
      y * y +
      z * z
  );

  if (magnitude === 0) {
    return 0;
  }

  const ax = x / magnitude;
  const ay = y / magnitude;
  const az = z / magnitude;

  /*
   * Calculate roll and pitch from
   * the gravity vector.
   */

  const roll = Math.atan2(
    ay,
    az
  );

  const pitch = Math.atan2(
    -ax,
    Math.sqrt(
      ay * ay +
        az * az
    )
  );

  const {
    x: mx,
    y: my,
    z: mz,
  } = magnetometer;

  /*
   * Rotate the magnetic field so that
   * the phone's tilt is compensated.
   */

  const compensatedX =
    mx * Math.cos(pitch) +
    mz * Math.sin(pitch);

  const compensatedY =
    mx * Math.sin(roll) *
      Math.sin(pitch) +
    my * Math.cos(roll) -
    mz *
      Math.sin(roll) *
      Math.cos(pitch);

  /*
   * Calculate the horizontal magnetic
   * angle.
   */

  const angle =
    Math.atan2(
      compensatedY,
      compensatedX
    ) *
    (180 / Math.PI);

  /*
   * Convert the sensor angle into the
   * standard compass convention:
   *
   * North = 0°
   * East  = 90°
   * South = 180°
   * West  = 270°
   */

  return normalizeHeading(
    angle - 90
  );
}

function calculateAngularDifference(
  from: number,
  to: number
): number {
  return (
    ((to - from + 540) % 360) -
    180
  );
}

function fuseHeadings(
  magneticHeading: number,
  gpsHeading: number | null,
  speedKmh: number
): {
  heading: number;
  usingGpsHeading: boolean;
} {
  /*
   * GPS course becomes useful once the
   * motorcycle is moving.
   *
   * Below this speed, magnetic heading
   * is used by itself because GPS bearing
   * can be unstable at very low speeds.
   */

  if (
    gpsHeading == null ||
    speedKmh < GPS_FUSION_MIN_SPEED_KMH
  ) {
    return {
      heading: magneticHeading,
      usingGpsHeading: false,
    };
  }

  /*
   * Find the shortest angular distance
   * between magnetic heading and GPS
   * course.
   */

  const difference =
    calculateAngularDifference(
      magneticHeading,
      gpsHeading
    );

  /*
   * Move the magnetic heading toward
   * the GPS course.
   */

  const fusedHeading =
    magneticHeading +
    difference *
      GPS_WEIGHT;

  return {
    heading:
      normalizeHeading(
        fusedHeading
      ),
    usingGpsHeading: true,
  };
}

export function startCompass(
  onReading: (
    reading: CompassReading
  ) => void
) {
  Accelerometer.setUpdateInterval(
    SENSOR_UPDATE_INTERVAL_MS
  );

  Magnetometer.setUpdateInterval(
    SENSOR_UPDATE_INTERVAL_MS
  );

  let latestAccelerometer:
    SensorVector | null = null;

  let latestMagnetometer:
    SensorVector | null = null;

  let latestGpsHeading:
    number | null = null;

  let latestGpsSpeedKmh = 0;

  function publishReading() {
    if (
      !latestAccelerometer ||
      !latestMagnetometer
    ) {
      return;
    }

    const magneticHeading =
      calculateTiltCompensatedHeading(
        latestMagnetometer,
        latestAccelerometer
      );

    const fused =
      fuseHeadings(
        magneticHeading,
        latestGpsHeading,
        latestGpsSpeedKmh
      );

    onReading({
      heading: fused.heading,

      magneticHeading,

      gpsHeading:
        latestGpsHeading,

      usingGpsHeading:
        fused.usingGpsHeading,

      accuracy: null,
    });
  }

  const accelerometerSubscription =
    Accelerometer.addListener(
      (data) => {
        latestAccelerometer = data;

        publishReading();
      }
    );

  const magnetometerSubscription =
    Magnetometer.addListener(
      (data) => {
        latestMagnetometer = data;

        publishReading();
      }
    );

  function updateGpsData(
    heading: number | null,
    speedKmh: number
  ) {
    latestGpsHeading =
      heading == null
        ? null
        : normalizeHeading(
            heading
          );

    latestGpsSpeedKmh =
      speedKmh;

    publishReading();
  }

  function stop() {
    accelerometerSubscription.remove();
    magnetometerSubscription.remove();
  }

  return {
    updateGpsData,
    stop,
  };
}