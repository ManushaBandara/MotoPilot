import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useCompass } from "../hooks/useCompass";
import { useLocation } from "../hooks/useLocation";

function getDirection(
  heading: number | null
): string {
  if (heading == null) {
    return "--";
  }

  if (
    heading >= 337.5 ||
    heading < 22.5
  ) {
    return "N";
  }

  if (heading < 67.5) {
    return "NE";
  }

  if (heading < 112.5) {
    return "E";
  }

  if (heading < 157.5) {
    return "SE";
  }

  if (heading < 202.5) {
    return "S";
  }

  if (heading < 247.5) {
    return "SW";
  }

  if (heading < 292.5) {
    return "W";
  }

  return "NW";
}

export default function CompassTestScreen() {
  const {
    location,
    speedKmh,
  } = useLocation();

  const {
    heading,
    magneticHeading,
    gpsHeading,
    usingGpsHeading,
    error,
  } = useCompass({
    enabled: true,
    gpsHeading:
      location?.heading ?? null,
    speedKmh,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        COMPASS TEST
      </Text>

      <View style={styles.headingContainer}>
        <Text style={styles.heading}>
          {heading == null
            ? "--"
            : Math.round(heading)}
          °
        </Text>

        <Text style={styles.direction}>
          {getDirection(heading)}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.label}>
          FUSED HEADING
        </Text>

        <Text style={styles.value}>
          {heading == null
            ? "--"
            : `${heading.toFixed(1)}°`}
        </Text>

        <Text style={styles.label}>
          MAGNETIC HEADING
        </Text>

        <Text style={styles.value}>
          {magneticHeading == null
            ? "--"
            : `${magneticHeading.toFixed(
                1
              )}°`}
        </Text>

        <Text style={styles.label}>
          GPS HEADING
        </Text>

        <Text style={styles.value}>
          {gpsHeading == null
            ? "--"
            : `${gpsHeading.toFixed(
                1
              )}°`}
        </Text>

        <Text style={styles.label}>
          SPEED
        </Text>

        <Text style={styles.value}>
          {speedKmh.toFixed(1)} km/h
        </Text>

        <Text style={styles.label}>
          FUSION SOURCE
        </Text>

        <Text style={styles.value}>
          {usingGpsHeading
            ? "GPS + MAGNETOMETER"
            : "MAGNETOMETER"}
        </Text>
      </View>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    padding: 24,
    paddingTop: 60,
  },

  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 2,
  },

  headingContainer: {
    alignItems: "center",
    marginTop: 50,
    marginBottom: 50,
  },

  heading: {
    color: "#ffffff",
    fontSize: 72,
    fontWeight: "800",
  },

  direction: {
    marginTop: 5,
    color: "#888888",
    fontSize: 24,
    fontWeight: "700",
  },

  info: {
    borderTopWidth: 1,
    borderTopColor: "#222222",
    paddingTop: 20,
  },

  label: {
    marginTop: 14,
    color: "#555555",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  value: {
    marginTop: 4,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  error: {
    marginTop: 30,
    color: "#dd6666",
    fontSize: 12,
  },
});