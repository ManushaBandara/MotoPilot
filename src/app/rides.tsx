import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import {
  deleteAllRides,
  deleteRide,
  getRides,
  Ride,
} from "../services/database";

function formatDuration(
  totalSeconds: number
): string {
  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

function formatDate(
  dateString: string
): string {
  const date = new Date(dateString);

  return date.toLocaleString();
}

export default function RidesScreen() {
  const [rides, setRides] =
    useState<Ride[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadRides = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const savedRides =
          await getRides();

        setRides(savedRides);
      } catch (err) {
        console.error(
          "Rides: failed to load rides:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load rides."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitialRides() {
      try {
        setLoading(true);
        setError(null);

        const savedRides =
          await getRides();

        if (cancelled) {
          return;
        }

        setRides(savedRides);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Rides: failed to load rides:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load rides."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialRides();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteRide = (
    ride: Ride
  ) => {
    Alert.alert(
      "Delete ride?",
      `Ride #${ride.id} will be permanently removed from the database.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setError(null);

              await deleteRide(
                ride.id
              );

              setRides((currentRides) =>
                currentRides.filter(
                  (currentRide) =>
                    currentRide.id !==
                    ride.id
                )
              );
            } catch (err) {
              console.error(
                "Rides: failed to delete ride:",
                err
              );

              setError(
                err instanceof Error
                  ? err.message
                  : "Unable to delete ride."
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll =
    () => {
      if (rides.length === 0) {
        return;
      }

      Alert.alert(
        "Delete all rides?",
        "This will permanently remove all saved rides and their route data.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete All",
            style: "destructive",
            onPress: async () => {
              try {
                setError(null);

                await deleteAllRides();

                setRides([]);
              } catch (err) {
                console.error(
                  "Rides: failed to delete all rides:",
                  err
                );

                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to delete rides."
                );
              }
            },
          },
        ]
      );
    };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            RIDE HISTORY
          </Text>

          <Text style={styles.subtitle}>
            {rides.length}{" "}
            {rides.length === 1
              ? "ride"
              : "rides"}{" "}
            saved locally
          </Text>
        </View>

        {rides.length > 0 && (
          <Pressable
            onPress={handleDeleteAll}
            style={({ pressed }) => [
              styles.deleteAllButton,
              pressed &&
                styles.buttonPressed,
            ]}
          >
            <Text
              style={
                styles.deleteAllText
              }
            >
              DELETE ALL
            </Text>
          </Pressable>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      <Pressable
        onPress={loadRides}
        style={({ pressed }) => [
          styles.refreshButton,
          pressed &&
            styles.buttonPressed,
        ]}
      >
        <Text style={styles.refreshText}>
          REFRESH
        </Text>
      </Pressable>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Loading rides...
          </Text>
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            NO RIDES YET
          </Text>

          <Text style={styles.emptyText}>
            Start a ride from the dashboard
            and your ride will appear here.
          </Text>

          <Pressable
            onPress={() =>
              router.push("/")
            }
            style={({ pressed }) => [
              styles.dashboardButton,
              pressed &&
                styles.buttonPressed,
            ]}
          >
            <Text
              style={
                styles.dashboardButtonText
              }
            >
              GO TO DASHBOARD
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={
            styles.list
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {rides.map((ride) => (
            <View
              key={ride.id}
              style={styles.rideCard}
            >
              <View
                style={
                  styles.rideHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.rideTitle
                    }
                  >
                    RIDE #{ride.id}
                  </Text>

                  <Text
                    style={
                      styles.rideDate
                    }
                  >
                    {formatDate(
                      ride.startedAt
                    )}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    handleDeleteRide(
                      ride
                    )
                  }
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed &&
                      styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={
                      styles.deleteText
                    }
                  >
                    DELETE
                  </Text>
                </Pressable>
              </View>

              <View
                style={
                  styles.statsGrid
                }
              >
                <View
                  style={styles.stat}
                >
                  <Text
                    style={
                      styles.statLabel
                    }
                  >
                    DURATION
                  </Text>

                  <Text
                    style={
                      styles.statValue
                    }
                  >
                    {formatDuration(
                      ride.durationSeconds
                    )}
                  </Text>
                </View>

                <View
                  style={styles.stat}
                >
                  <Text
                    style={
                      styles.statLabel
                    }
                  >
                    DISTANCE
                  </Text>

                  <Text
                    style={
                      styles.statValue
                    }
                  >
                    {ride.distanceKm.toFixed(
                      2
                    )}{" "}
                    km
                  </Text>
                </View>

                <View
                  style={styles.stat}
                >
                  <Text
                    style={
                      styles.statLabel
                    }
                  >
                    AVG SPEED
                  </Text>

                  <Text
                    style={
                      styles.statValue
                    }
                  >
                    {ride.averageSpeedKmh.toFixed(
                      1
                    )}{" "}
                    km/h
                  </Text>
                </View>

                <View
                  style={styles.stat}
                >
                  <Text
                    style={
                      styles.statLabel
                    }
                  >
                    MAX SPEED
                  </Text>

                  <Text
                    style={
                      styles.statValue
                    }
                  >
                    {ride.maxSpeedKmh.toFixed(
                      1
                    )}{" "}
                    km/h
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.routeInfo
                }
              >
                <Text
                  style={
                    styles.routeText
                  }
                >
                  Route points:{" "}
                  {ride.route.length}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050505",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 18,
  },

  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 2,
  },

  subtitle: {
    marginTop: 5,
    color: "#666666",
    fontSize: 12,
  },

  deleteAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#552222",
    borderRadius: 7,
  },

  deleteAllText: {
    color: "#d66b6b",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  refreshButton: {
    alignSelf: "flex-start",
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#161616",
  },

  refreshText: {
    color: "#999999",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  errorBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#552222",
    borderRadius: 8,
  },

  errorText: {
    color: "#e47777",
    fontSize: 12,
  },

  list: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },

  rideCard: {
    marginBottom: 14,
    padding: 17,
    borderWidth: 1,
    borderColor: "#202020",
    borderRadius: 10,
    backgroundColor: "#0b0b0b",
  },

  rideHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  rideTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },

  rideDate: {
    marginTop: 5,
    color: "#666666",
    fontSize: 11,
  },

  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 6,
  },

  deleteText: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  stat: {
    width: "50%",
    marginBottom: 17,
  },

  statLabel: {
    marginBottom: 5,
    color: "#555555",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },

  statValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  routeInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#181818",
  },

  routeText: {
    color: "#666666",
    fontSize: 10,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  emptyTitle: {
    marginBottom: 8,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },

  emptyText: {
    color: "#666666",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },

  dashboardButton: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 7,
    backgroundColor: "#1c1c1c",
  },

  dashboardButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  buttonPressed: {
    opacity: 0.6,
  },
});