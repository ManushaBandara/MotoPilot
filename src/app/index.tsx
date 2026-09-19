import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLocation } from "../hooks/useLocation";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { useTripTracker } from "../hooks/useTripTracker";
import { useCompass } from "../hooks/useCompass";

import {
  getFuelSettings,
  FuelSettings,
} from "../services/fuelSettings";

import {
  calculateRemainingRange,
} from "../services/fuelCalculator";

export default function HomeScreen() {
  const currentTime = useCurrentTime();

  const {
    location,
    error,
    updateCount,
    speedKmh,
  } = useLocation();

  const {
    heading,
    magneticHeading,
    usingGpsHeading,
    error: compassError,
  } = useCompass({
    enabled: true,
    gpsHeading: location?.heading ?? null,
    speedKmh,
  });

  const {
    isTracking,
    distanceKm,
    duration,
    maxSpeedKmh,
    averageSpeedKmh,
    startTrip,
    stopTrip,
  } = useTripTracker({
    location,
    speedKmh,
  });

  const [fuelSettings, setFuelSettings] =
    useState<FuelSettings | null>(null);

  const [fuelError, setFuelError] =
    useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadFuelData() {
        try {
          const settings = await getFuelSettings();

          if (!active) return;

          setFuelSettings(settings);
          setFuelError(null);
        } catch (err) {
          console.error(
            "Home: failed to load fuel data:",
            err
          );

          if (!active) return;

          setFuelError(
            err instanceof Error
              ? err.message
              : "Unable to load fuel data."
          );
        }
      }

      void loadFuelData();

      return () => {
        active = false;
      };
    }, [])
  );

  const gpsStatus = error
    ? "GPS ERROR"
    : location
      ? "GPS READY"
      : "GPS SEARCHING";

  const tankCapacity =
    fuelSettings?.tankCapacityLitres ?? 0;

  const estimatedFuelRemaining =
    fuelSettings?.estimatedFuelRemainingLitres ?? 0;

  const estimatedKmPerLitre =
    fuelSettings?.estimatedKmPerLitre ?? 0;

  const fuelPercentage =
    tankCapacity > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (estimatedFuelRemaining /
              tankCapacity) *
              100
          )
        )
      : 0;

  const estimatedRangeKm =
    tankCapacity > 0 &&
    estimatedKmPerLitre > 0
      ? calculateRemainingRange(
          estimatedFuelRemaining,
          estimatedKmPerLitre
        )
      : 0;

  const displayHeading =
    heading != null && Number.isFinite(heading)
      ? Math.round(heading)
      : location?.heading != null
        ? Math.round(location.heading)
        : null;

  const compassStatus = compassError
    ? "COMPASS ERROR"
    : usingGpsHeading
      ? "GPS HEADING"
      : magneticHeading != null
        ? "MAG HEADING"
        : "COMPASS";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            MOTO PILOT
          </Text>

          <Text style={styles.subtitle}>
            MOTORCYCLE COCKPIT
          </Text>
        </View>

        <Text style={styles.time}>
          {currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>

      {/* GPS Status */}
      <View style={styles.gpsContainer}>
        <View
          style={[
            styles.gpsDot,
            error
              ? styles.gpsError
              : location
                ? styles.gpsReady
                : styles.gpsSearching,
          ]}
        />

        <Text style={styles.gpsText}>
          {gpsStatus}
        </Text>
      </View>

      <Text style={styles.updateCount}>
        GPS UPDATES: {updateCount}
      </Text>

      {/* GPS Debug Information */}
      <View style={styles.debugContainer}>
        {error ? (
          <Text style={styles.debugError}>
            {error}
          </Text>
        ) : location ? (
          <>
            <Text style={styles.debugText}>
              LAT: {location.latitude.toFixed(5)}
            </Text>

            <Text style={styles.debugText}>
              LNG: {location.longitude.toFixed(5)}
            </Text>

            <Text style={styles.debugText}>
              ACCURACY:{" "}
              {location.accuracy != null
                ? `${location.accuracy.toFixed(1)} m`
                : "N/A"}
            </Text>
          </>
        ) : (
          <Text style={styles.debugText}>
            Waiting for GPS location...
          </Text>
        )}
      </View>

      {/* Speed */}
      <View style={styles.speedSection}>
        <Text style={styles.speedLabel}>
          CURRENT SPEED
        </Text>

        <View style={styles.speedRow}>
          <Text style={styles.speed}>
            {speedKmh}
          </Text>

          <Text style={styles.speedUnit}>
            KM/H
          </Text>
        </View>

        <Text style={styles.direction}>
          {displayHeading != null
            ? `${displayHeading}°`
            : "N"}
        </Text>

        <Text style={styles.compassStatus}>
          {compassStatus}
        </Text>
      </View>

      {/* Main Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>
            TRIP
          </Text>

          <Text style={styles.statValue}>
            {distanceKm.toFixed(1)}
          </Text>

          <Text style={styles.statUnit}>
            KM
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <Text style={styles.statLabel}>
            FUEL
          </Text>

          <Text style={styles.statValue}>
            {Math.round(fuelPercentage)}
          </Text>

          <Text style={styles.statUnit}>
            %
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <Text style={styles.statLabel}>
            RANGE
          </Text>

          <Text style={styles.statValue}>
            {Math.round(estimatedRangeKm)}
          </Text>

          <Text style={styles.statUnit}>
            KM
          </Text>
        </View>
      </View>

      {fuelError && (
        <Text style={styles.fuelError}>
          FUEL: {fuelError}
        </Text>
      )}

      {/* Trip Control */}
      <View style={styles.tripControl}>
        <Text style={styles.tripControlLabel}>
          {isTracking
            ? "RIDE IN PROGRESS"
            : "TRIP TRACKING"}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.tripControlButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={
            isTracking
              ? stopTrip
              : startTrip
          }
        >
          <Text style={styles.tripControlButtonText}>
            {isTracking
              ? "STOP RIDE"
              : "START RIDE"}
          </Text>
        </Pressable>
      </View>

      {/* Live Ride Statistics */}
      {isTracking && (
        <View style={styles.rideStats}>
          <View style={styles.rideStat}>
            <Text style={styles.rideStatLabel}>
              TIME
            </Text>

            <Text style={styles.rideStatValue}>
              {duration}
            </Text>
          </View>

          <View style={styles.rideStat}>
            <Text style={styles.rideStatLabel}>
              AVG
            </Text>

            <Text style={styles.rideStatValue}>
              {Math.round(
                averageSpeedKmh
              )}
            </Text>

            <Text style={styles.rideStatUnit}>
              KM/H
            </Text>
          </View>

          <View style={styles.rideStat}>
            <Text style={styles.rideStatLabel}>
              MAX
            </Text>

            <Text style={styles.rideStatValue}>
              {Math.round(maxSpeedKmh)}
            </Text>

            <Text style={styles.rideStatUnit}>
              KM/H
            </Text>
          </View>
        </View>
      )}

      {/* Compass Test */}
      <Pressable
        style={({ pressed }) => [
          styles.sqliteButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() =>
          router.push("/compass-test")
        }
      >
        <Text style={styles.sqliteButtonText}>
          COMPASS TEST
        </Text>
      </Pressable>

      {/* Navigation Controls */}
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [
            styles.control,
            pressed && styles.controlPressed,
          ]}
          onPress={() =>
            router.push("/navigation")
          }
        >
          <Text style={styles.controlText}>
            NAV
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.control,
            pressed && styles.controlPressed,
          ]}
          onPress={() =>
            router.push("/rides")
          }
        >
          <Text style={styles.controlText}>
            RIDES
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.control,
            pressed && styles.controlPressed,
          ]}
          onPress={() =>
            router.push("/fuel")
          }
        >
          <Text style={styles.controlText}>
            FUEL
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.control,
            pressed && styles.controlPressed,
          ]}
          onPress={() =>
            router.push("/media")
          }
        >
          <Text style={styles.controlText}>
            MEDIA
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.control,
            pressed && styles.controlPressed,
          ]}
          onPress={() =>
            router.push("/more")
          }
        >
          <Text style={styles.controlText}>
            MORE
          </Text>
        </Pressable>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        MOTOPILOT • OFFLINE FIRST
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 25,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 2,
  },

  subtitle: {
    color: "#666666",
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 4,
  },

  time: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  gpsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },

  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  gpsReady: {
    backgroundColor: "#e63946",
  },

  gpsSearching: {
    backgroundColor: "#777777",
  },

  gpsError: {
    backgroundColor: "#ff0000",
  },

  gpsText: {
    color: "#aaaaaa",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
  },

  updateCount: {
    color: "#444444",
    fontSize: 9,
    textAlign: "center",
    letterSpacing: 1,
    marginTop: 6,
  },

  debugContainer: {
    alignItems: "center",
    marginTop: 12,
    minHeight: 55,
  },

  debugText: {
    color: "#555555",
    fontSize: 10,
    marginTop: 2,
  },

  debugError: {
    color: "#ff4d4d",
    fontSize: 10,
    textAlign: "center",
  },

  speedSection: {
    alignItems: "center",
    marginTop: 20,
  },

  speedLabel: {
    color: "#666666",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "600",
  },

  speedRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 5,
  },

  speed: {
    color: "#ffffff",
    fontSize: 105,
    lineHeight: 115,
    fontWeight: "200",
    letterSpacing: -5,
  },

  speedUnit: {
    color: "#777777",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 20,
    marginLeft: 10,
  },

  direction: {
    color: "#d42b4e",
    fontSize: 16,
    fontWeight: "700",
    marginTop: -5,
  },

  compassStatus: {
    color: "#444444",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 3,
  },

  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 35,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1c1c1c",
  },

  stat: {
    alignItems: "center",
    flex: 1,
  },

  statLabel: {
    color: "#555555",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  statValue: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "600",
    marginTop: 5,
  },

  statUnit: {
    color: "#666666",
    fontSize: 8,
    marginTop: 2,
  },

  divider: {
    width: 1,
    height: 35,
    backgroundColor: "#222222",
  },

  fuelError: {
    color: "#ff4d4d",
    fontSize: 9,
    textAlign: "center",
    marginTop: 8,
  },

  tripControl: {
    alignItems: "center",
    marginTop: 25,
  },

  tripControlLabel: {
    color: "#555555",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  tripControlButton: {
    backgroundColor: "#d42b4e",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },

  tripControlButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  sqliteButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 8,
    alignSelf: "center",
  },

  sqliteButtonText: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  rideStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1c1c1c",
  },

  rideStat: {
    alignItems: "center",
    flex: 1,
  },

  rideStatLabel: {
    color: "#555555",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  rideStatValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 4,
  },

  rideStatUnit: {
    color: "#666666",
    fontSize: 7,
    marginTop: 1,
  },

  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    gap: 8,
  },

  control: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },

  controlPressed: {
    backgroundColor: "#151515",
    borderColor: "#d42b4e",
  },

  controlText: {
    color: "#bbbbbb",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  footer: {
    color: "#333333",
    fontSize: 8,
    textAlign: "center",
    letterSpacing: 1.5,
    marginTop: "auto",
  },
});