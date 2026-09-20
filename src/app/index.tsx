import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CockpitTabBar } from "@/components/cockpit/CockpitTabBar";

import { useLocation } from "../hooks/useLocation";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { useTripTracker } from "../hooks/useTripTracker";
import { useCompass } from "../hooks/useCompass";
import { useNavigationSessionState } from "../hooks/useNavigationSessionState";

import {
  getFuelSettings,
  FuelSettings,
} from "../services/fuelSettings";

import {
  calculateRemainingRange,
} from "../services/fuelCalculator";

import {
  getFuelEntries,
} from "../services/database";

import {
  calculateFuelEfficiency,
} from "../services/fuelEfficiency";

type TimeTheme = {
  name:
    | "MORNING"
    | "DAY"
    | "EVENING"
    | "NIGHT";
  accent: string;
  accentSoft: string;
  glow: string;
};

function getTimeTheme(
  date: Date
): TimeTheme {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) {
    return {
      name: "MORNING",
      accent: "#54D7FF",
      accentSoft: "#183A46",
      glow: "#54D7FF",
    };
  }

  if (hour >= 11 && hour < 17) {
    return {
      name: "DAY",
      accent: "#00D4FF",
      accentSoft: "#123B46",
      glow: "#00D4FF",
    };
  }

  if (hour >= 17 && hour < 20) {
    return {
      name: "EVENING",
      accent: "#FFB84D",
      accentSoft: "#493517",
      glow: "#FFB84D",
    };
  }

  return {
    name: "NIGHT",
    accent: "#9B8CFF",
    accentSoft: "#292448",
    glow: "#9B8CFF",
  };
}

function formatNavigationDistance(
  meters: number
): string {
  if (meters >= 1000) {
    return `${(
      meters / 1000
    ).toFixed(1)} KM`;
  }

  return `${Math.round(meters)} M`;
}

export default function HomeScreen() {
  const currentTime =
    useCurrentTime();

  const {
    location,
    error,
    updateCount,
    speedKmh,
  } = useLocation();

  const navigationSession =
    useNavigationSessionState();

  const {
    heading,
    magneticHeading,
    usingGpsHeading,
    error: compassError,
  } = useCompass({
    enabled: true,
    gpsHeading:
      location?.heading ?? null,
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

  const [
    fuelSettings,
    setFuelSettings,
  ] =
    useState<FuelSettings | null>(
      null
    );

  const [
    measuredKmPerLitre,
    setMeasuredKmPerLitre,
  ] =
    useState<number | null>(null);

  const [
    fuelError,
    setFuelError,
  ] =
    useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadFuelData() {
        try {
          const [
            settings,
            fuelEntries,
          ] = await Promise.all([
            getFuelSettings(),
            getFuelEntries(),
          ]);

          if (!active) {
            return;
          }

          setFuelSettings(settings);

          const efficiencyResult =
            calculateFuelEfficiency(
              fuelEntries
            );

          setMeasuredKmPerLitre(
            efficiencyResult.estimatedKmPerLitre
          );

          setFuelError(null);
        } catch (err) {
          console.error(
            "Home: failed to load fuel data:",
            err
          );

          if (!active) {
            return;
          }

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

  const theme = useMemo(
    () =>
      getTimeTheme(
        currentTime
      ),
    [currentTime]
  );

  const gpsStatus = error
    ? "GPS ERROR"
    : location
      ? "GPS READY"
      : "GPS SEARCHING";

  const tankCapacity =
    fuelSettings
      ?.tankCapacityLitres ?? 0;

  const estimatedFuelRemaining =
    fuelSettings
      ?.estimatedFuelRemainingLitres ??
    0;

  const estimatedKmPerLitre =
    measuredKmPerLitre ??
    fuelSettings
      ?.estimatedKmPerLitre ??
    0;

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
    heading != null &&
    Number.isFinite(heading)
      ? Math.round(heading)
      : location?.heading != null
        ? Math.round(
            location.heading
          )
        : null;

  const compassStatus = compassError
    ? "COMPASS ERROR"
    : usingGpsHeading
      ? "GPS HEADING"
      : magneticHeading != null
        ? "MAG HEADING"
        : "COMPASS";

  const isNavigating =
    navigationSession.status ===
      "NAVIGATING" ||
    navigationSession.status ===
      "REROUTING";

  const navigationDistanceKm =
    navigationSession
      .remainingDistanceMeters /
    1000;

  const navigationEtaMinutes =
    Math.ceil(
      navigationSession
        .remainingDurationSeconds /
        60
    );

  const navigationProgress =
    Math.min(
      100,
      Math.max(
        0,
        navigationSession.progressPercent
      )
    );

  const isOffRoute =
    navigationSession.offRoute;

  return (
    <View
      style={[
        styles.container,
        {
          borderTopColor:
            theme.accentSoft,
        },
      ]}
    >
      {/* =====================================================
          HEADER
          ===================================================== */}

      <View style={styles.header}>
        <View>
          <View
            style={styles.brandRow}
          >
            <View
              style={[
                styles.brandIndicator,
                {
                  backgroundColor:
                    theme.accent,
                  shadowColor:
                    theme.glow,
                },
              ]}
            />

            <Text style={styles.logo}>
              MOTO PILOT
            </Text>
          </View>

          <Text
            style={styles.subtitle}
          >
            MOTORCYCLE COCKPIT
          </Text>
        </View>

        <View
          style={styles.headerRight}
        >
          <Text style={styles.time}>
            {currentTime.toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </Text>

          <View
            style={styles.modeRow}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    theme.accent,
                },
              ]}
            />

            <Text
              style={styles.modeText}
            >
              {theme.name}
            </Text>
          </View>
        </View>
      </View>

      {/* =====================================================
          GPS STATUS
          ===================================================== */}

      <View
        style={styles.statusBar}
      >
        <View
          style={styles.statusItem}
        >
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor:
                  error
                    ? "#FF5263"
                    : location
                      ? "#39D98A"
                      : "#FFB547",
              },
            ]}
          />

          <Text
            style={styles.statusLabel}
          >
            {gpsStatus}
          </Text>
        </View>

        <Text
          style={styles.statusSeparator}
        >
          /
        </Text>

        <Text
          style={styles.statusMeta}
        >
          {updateCount} UPDATES
        </Text>
      </View>

      {/* =====================================================
          MAIN SPEED COCKPIT
          ===================================================== */}

      <View
        style={styles.speedSection}
      >
        <Text
          style={styles.speedEyebrow}
        >
          CURRENT SPEED
        </Text>

        <View
          style={styles.speedDisplay}
        >
          <Text style={styles.speed}>
            {speedKmh}
          </Text>

          <View
            style={
              styles.speedUnitContainer
            }
          >
            <Text
              style={styles.speedUnit}
            >
              KM/H
            </Text>

            <View
              style={[
                styles.speedAccent,
                {
                  backgroundColor:
                    theme.accent,
                },
              ]}
            />
          </View>
        </View>

        <View
          style={styles.headingRow}
        >
          <Text
            style={[
              styles.headingValue,
              {
                color:
                  theme.accent,
              },
            ]}
          >
            {displayHeading != null
              ? `${displayHeading}°`
              : "--"}
          </Text>

          <Text
            style={styles.headingLabel}
          >
            {compassStatus}
          </Text>
        </View>
      </View>

      {/* =====================================================
          TELEMETRY
          ===================================================== */}

      <View
        style={styles.telemetryRow}
      >
        <View
          style={styles.telemetryItem}
        >
          <Text
            style={
              styles.telemetryLabel
            }
          >
            TRIP
          </Text>

          <View
            style={
              styles.telemetryValueRow
            }
          >
            <Text
              style={
                styles.telemetryValue
              }
            >
              {distanceKm.toFixed(
                1
              )}
            </Text>

            <Text
              style={
                styles.telemetryUnit
              }
            >
              KM
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.telemetryDivider,
            {
              backgroundColor:
                theme.accentSoft,
            },
          ]}
        />

        <View
          style={styles.telemetryItem}
        >
          <Text
            style={
              styles.telemetryLabel
            }
          >
            FUEL
          </Text>

          <View
            style={
              styles.telemetryValueRow
            }
          >
            <Text
              style={[
                styles.telemetryValue,
                {
                  color:
                    fuelPercentage <=
                    20
                      ? "#FF5263"
                      : fuelPercentage <=
                          50
                        ? "#FFB547"
                        : "#F5F7FA",
                },
              ]}
            >
              {Math.round(
                fuelPercentage
              )}
            </Text>

            <Text
              style={
                styles.telemetryUnit
              }
            >
              %
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.telemetryDivider,
            {
              backgroundColor:
                theme.accentSoft,
            },
          ]}
        />

        <View
          style={styles.telemetryItem}
        >
          <Text
            style={
              styles.telemetryLabel
            }
          >
            RANGE
          </Text>

          <View
            style={
              styles.telemetryValueRow
            }
          >
            <Text
              style={
                styles.telemetryValue
              }
            >
              {Math.round(
                estimatedRangeKm
              )}
            </Text>

            <Text
              style={
                styles.telemetryUnit
              }
            >
              KM
            </Text>
          </View>
        </View>
      </View>

      {fuelError && (
        <Text
          style={styles.fuelError}
        >
          FUEL SYSTEM ERROR
        </Text>
      )}

      {/* =====================================================
          ACTIVE NAVIGATION
          ===================================================== */}

      {isNavigating &&
        navigationSession.destination && (
          <View
            style={[
              styles.navigationPanel,
              {
                borderColor:
                  theme.accentSoft,
              },
            ]}
          >
            <View
              style={
                styles.navigationHeader
              }
            >
              <View
                style={
                  styles.navigationTitleRow
                }
              >
                <View
                  style={[
                    styles.navigationLiveDot,
                    {
                      backgroundColor:
                        theme.accent,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.navigationTitle,
                    {
                      color:
                        theme.accent,
                    },
                  ]}
                >
                  NAVIGATION ACTIVE
                </Text>
              </View>

              <Text
                style={
                  styles.navigationPercent
                }
              >
                {Math.round(
                  navigationProgress
                )}
                %
              </Text>
            </View>

            <Text
              style={
                styles.navigationDestination
              }
              numberOfLines={1}
            >
              {
                navigationSession
                  .destination.name
              }
            </Text>

            {navigationSession.currentStep && (
              <View
                style={
                  styles.maneuver
                }
              >
                <View
                  style={[
                    styles.maneuverIcon,
                    {
                      borderColor:
                        theme.accentSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.maneuverArrow,
                      {
                        color:
                          theme.accent,
                      },
                    ]}
                  >
                    →
                  </Text>
                </View>

                <View
                  style={
                    styles.maneuverContent
                  }
                >
                  <Text
                    style={
                      styles.maneuverInstruction
                    }
                    numberOfLines={1}
                  >
                    {
                      navigationSession
                        .currentStep
                        .instruction
                    }
                  </Text>

                  <Text
                    style={
                      styles.maneuverDistance
                    }
                  >
                    {formatNavigationDistance(
                      navigationSession
                        .distanceToNextManeuverMeters
                    )}
                  </Text>
                </View>
              </View>
            )}

            <View
              style={
                styles.navigationStats
              }
            >
              <View>
                <Text
                  style={
                    styles.navigationStatLabel
                  }
                >
                  REMAINING
                </Text>

                <Text
                  style={
                    styles.navigationStatValue
                  }
                >
                  {navigationDistanceKm >=
                  1
                    ? `${navigationDistanceKm.toFixed(
                        1
                      )} KM`
                    : `${Math.round(
                        navigationSession
                          .remainingDistanceMeters
                      )} M`}
                </Text>
              </View>

              <View>
                <Text
                  style={
                    styles.navigationStatLabel
                  }
                >
                  ETA
                </Text>

                <Text
                  style={
                    styles.navigationStatValue
                  }
                >
                  {navigationEtaMinutes}{" "}
                  MIN
                </Text>
              </View>

              <Pressable
                style={({
                  pressed,
                }) => [
                  styles.openNavigationButton,
                  {
                    borderColor:
                      theme.accentSoft,
                    backgroundColor:
                      pressed
                        ? theme.accentSoft
                        : "transparent",
                  },
                ]}
                onPress={() =>
                  router.push(
                    "/navigation"
                  )
                }
              >
                <Text
                  style={[
                    styles.openNavigationText,
                    {
                      color:
                        theme.accent,
                    },
                  ]}
                >
                  OPEN NAV
                </Text>
              </Pressable>
            </View>

            {isOffRoute && (
              <Text
                style={styles.offRoute}
              >
                OFF ROUTE —
                RECALCULATING
              </Text>
            )}

            <View
              style={
                styles.progressTrack
              }
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${navigationProgress}%`,
                    backgroundColor:
                      theme.accent,
                  },
                ]}
              />
            </View>
          </View>
        )}

      {/* =====================================================
          RIDE CONTROL
          ===================================================== */}

      <View
        style={styles.rideControl}
      >
        <View>
          <Text
            style={
              styles.rideControlLabel
            }
          >
            {isTracking
              ? "RIDE IN PROGRESS"
              : "READY TO RIDE"}
          </Text>

          {isTracking && (
            <Text
              style={
                styles.rideControlValue
              }
            >
              {duration}
            </Text>
          )}
        </View>

        <Pressable
          style={({
            pressed,
          }) => [
            styles.rideButton,
            {
              borderColor:
                isTracking
                  ? "#FF5263"
                  : theme.accent,
              backgroundColor:
                isTracking
                  ? "rgba(255,82,99,0.08)"
                  : theme.accentSoft,
            },
            pressed &&
              styles.rideButtonPressed,
          ]}
          onPress={
            isTracking
              ? stopTrip
              : startTrip
          }
        >
          <View
            style={[
              styles.rideButtonDot,
              {
                backgroundColor:
                  isTracking
                    ? "#FF5263"
                    : theme.accent,
              },
            ]}
          />

          <Text
            style={[
              styles.rideButtonText,
              {
                color:
                  isTracking
                    ? "#FF5263"
                    : theme.accent,
              },
            ]}
          >
            {isTracking
              ? "STOP RIDE"
              : "START RIDE"}
          </Text>
        </Pressable>
      </View>

      {/* =====================================================
          LIVE RIDE STATS
          ===================================================== */}

      {isTracking && (
        <View
          style={styles.rideStats}
        >
          <View
            style={styles.rideStat}
          >
            <Text
              style={
                styles.rideStatLabel
              }
            >
              AVG SPEED
            </Text>

            <Text
              style={
                styles.rideStatValue
              }
            >
              {Math.round(
                averageSpeedKmh
              )}
            </Text>

            <Text
              style={
                styles.rideStatUnit
              }
            >
              KM/H
            </Text>
          </View>

          <View
            style={styles.rideStat}
          >
            <Text
              style={
                styles.rideStatLabel
              }
            >
              MAX SPEED
            </Text>

            <Text
              style={
                styles.rideStatValue
              }
            >
              {Math.round(
                maxSpeedKmh
              )}
            </Text>

            <Text
              style={
                styles.rideStatUnit
              }
            >
              KM/H
            </Text>
          </View>

          <View
            style={styles.rideStat}
          >
            <Text
              style={
                styles.rideStatLabel
              }
            >
              DISTANCE
            </Text>

            <Text
              style={
                styles.rideStatValue
              }
            >
              {distanceKm.toFixed(
                1
              )}
            </Text>

            <Text
              style={
                styles.rideStatUnit
              }
            >
              KM
            </Text>
          </View>
        </View>
      )}

      {/* =====================================================
          DEVELOPMENT TESTS
          ===================================================== */}

      <View
        style={styles.testRow}
      >
        <Pressable
          style={({ pressed }) => [
            styles.testButton,
            pressed &&
              styles.testButtonPressed,
          ]}
          onPress={() =>
            router.push(
              "/compass-test"
            )
          }
        >
          <Text
            style={styles.testText}
          >
            COMPASS
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.testButton,
            pressed &&
              styles.testButtonPressed,
          ]}
          onPress={() =>
            router.push(
              "/camera-test"
            )
          }
        >
          <Text
            style={styles.testText}
          >
            CAMERA
          </Text>
        </Pressable>
      </View>

      {/* =====================================================
          NEW COCKPIT NAVIGATION
          ===================================================== */}

      <CockpitTabBar
        activeTab="dashboard"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080C12",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 90,
    borderTopWidth: 1,
  },

  /* ========================================================
     HEADER
     ======================================================== */

  header: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  brandIndicator: {
    width: 5,
    height: 20,
    borderRadius: 3,
    marginRight: 9,
    shadowOpacity: 0.7,
    shadowRadius: 7,
    elevation: 5,
  },

  logo: {
    color: "#F5F7FA",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: 2.5,
  },

  subtitle: {
    color: "#596575",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 5,
    marginLeft: 14,
  },

  headerRight: {
    alignItems: "flex-end",
  },

  time: {
    color: "#F5F7FA",
    fontSize: 19,
    fontWeight: "600",
    letterSpacing: 1,
  },

  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 6,
  },

  modeText: {
    color: "#596575",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  /* ========================================================
     STATUS
     ======================================================== */

  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
  },

  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 7,
  },

  statusLabel: {
    color: "#A2ACB9",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  statusSeparator: {
    color: "#303946",
    marginHorizontal: 9,
    fontSize: 9,
  },

  statusMeta: {
    color: "#46515F",
    fontSize: 7,
    fontWeight: "600",
    letterSpacing: 1,
  },

  /* ========================================================
     SPEED
     ======================================================== */

  speedSection: {
    alignItems: "center",
    marginTop: 18,
  },

  speedEyebrow: {
    color: "#596575",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 2,
  },

  speedDisplay: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 2,
  },

  speed: {
    color: "#F5F7FA",
    fontSize: 104,
    lineHeight: 112,
    fontWeight: "200",
    letterSpacing: -5,
  },

  speedUnitContainer: {
    alignItems: "flex-start",
    marginBottom: 18,
    marginLeft: 9,
  },

  speedUnit: {
    color: "#788494",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  speedAccent: {
    width: 25,
    height: 2,
    marginTop: 5,
    borderRadius: 1,
  },

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -3,
  },

  headingValue: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },

  headingLabel: {
    color: "#596575",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
    marginLeft: 8,
  },

  /* ========================================================
     TELEMETRY
     ======================================================== */

  telemetryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#18202A",
  },

  telemetryItem: {
    flex: 1,
    alignItems: "center",
  },

  telemetryLabel: {
    color: "#596575",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  telemetryValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },

  telemetryValue: {
    color: "#F5F7FA",
    fontSize: 22,
    fontWeight: "600",
  },

  telemetryUnit: {
    color: "#697584",
    fontSize: 7,
    fontWeight: "700",
    marginLeft: 3,
  },

  telemetryDivider: {
    width: 1,
    height: 32,
  },

  fuelError: {
    color: "#FF5263",
    textAlign: "center",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 6,
  },

  /* ========================================================
     NAVIGATION
     ======================================================== */

  navigationPanel: {
    marginTop: 13,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: "#0D131B",
  },

  navigationHeader: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  navigationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  navigationLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 6,
  },

  navigationTitle: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  navigationPercent: {
    color: "#8C97A5",
    fontSize: 10,
    fontWeight: "700",
  },

  navigationDestination: {
    color: "#F5F7FA",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },

  maneuver: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
  },

  maneuverIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  maneuverArrow: {
    fontSize: 20,
    fontWeight: "800",
  },

  maneuverContent: {
    flex: 1,
    marginLeft: 9,
  },

  maneuverInstruction: {
    color: "#E7EBF0",
    fontSize: 9,
    fontWeight: "600",
  },

  maneuverDistance: {
    color: "#667281",
    fontSize: 7,
    fontWeight: "600",
    marginTop: 3,
  },

  navigationStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  navigationStatLabel: {
    color: "#596575",
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 1,
  },

  navigationStatValue: {
    color: "#F5F7FA",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  openNavigationButton: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },

  openNavigationText: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },

  offRoute: {
    color: "#FF5263",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 8,
  },

  progressTrack: {
    height: 2,
    backgroundColor: "#202934",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 9,
  },

  progressFill: {
    height: "100%",
    borderRadius: 2,
  },

  /* ========================================================
     RIDE CONTROL
     ======================================================== */

  rideControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginTop: 15,
  },

  rideControlLabel: {
    color: "#596575",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  rideControlValue: {
    color: "#F5F7FA",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
  },

  rideButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  rideButtonPressed: {
    opacity: 0.65,
  },

  rideButtonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 7,
  },

  rideButtonText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  /* ========================================================
     RIDE STATS
     ======================================================== */

  rideStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#18202A",
  },

  rideStat: {
    flex: 1,
    alignItems: "center",
  },

  rideStatLabel: {
    color: "#596575",
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 1,
  },

  rideStatValue: {
    color: "#F5F7FA",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 3,
  },

  rideStatUnit: {
    color: "#667281",
    fontSize: 6,
    marginTop: 1,
  },

  /* ========================================================
     TEST BUTTONS
     ======================================================== */

  testRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 9,
  },

  testButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#222C37",
    borderRadius: 7,
  },

  testButtonPressed: {
    backgroundColor: "#141D26",
  },

  testText: {
    color: "#53606E",
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 1,
  },
});