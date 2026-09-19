import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getDatabase,
  getRides,
  Ride,
  saveRide,
} from "../services/database";

function formatDuration(
  totalSeconds: number
) {
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

export default function SQLiteTestScreen() {
  const [rides, setRides] =
    useState<Ride[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const loadRides =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        await getDatabase();

        const savedRides =
          await getRides();

        setRides(savedRides);
      } catch (err) {
        console.error(
          "SQLite: failed to load rides:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load rides."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialRides() {
      try {
        setLoading(true);
        setError(null);

        await getDatabase();

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
          "SQLite: failed to load rides:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load rides."
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

  const testMaintenanceTable =
    async () => {
      try {
        setError(null);

        const db =
          await getDatabase();

        const result =
          await db.getAllAsync<{
            id: number;
            title: string;
            notes: string | null;
            interval_km: number | null;
            last_completed_km: number | null;
            created_at: string;
          }>(
            `
              SELECT
                id,
                title,
                notes,
                interval_km,
                last_completed_km,
                created_at
              FROM maintenance
              ORDER BY created_at DESC
            `
          );

        console.log(
          "SQLite: maintenance table result:",
          result
        );

        setError(
          `Maintenance table works. Rows: ${result.length}`
        );
      } catch (err) {
        console.error(
          "SQLite: maintenance table failed:",
          err
        );

        setError(
          err instanceof Error
            ? `Maintenance table failed: ${err.message}`
            : "Maintenance table failed."
        );
      }
    };

  const insertTestRide =
    async () => {
      try {
        setError(null);

        await saveRide({
          startedAt:
            new Date().toISOString(),
          durationSeconds: 60,
          distanceKm: 1.5,
          averageSpeedKmh: 45,
          maxSpeedKmh: 62,
          route: [],
        });

        await loadRides();
      } catch (err) {
        console.error(
          "SQLite: failed to insert test ride:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to insert test ride."
        );
      }
    };

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <Text style={styles.title}>
        SQLITE TEST
      </Text>

      <Text style={styles.subtitle}>
        Saved rides from local database
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      <Pressable
        style={styles.button}
        onPress={loadRides}
      >
        <Text style={styles.buttonText}>
          REFRESH RIDES
        </Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={
          testMaintenanceTable
        }
      >
        <Text style={styles.buttonText}>
          TEST MAINTENANCE TABLE
        </Text>
      </Pressable>

      <Pressable
        style={styles.testButton}
        onPress={insertTestRide}
      >
        <Text style={styles.testButtonText}>
          INSERT TEST RIDE
        </Text>
      </Pressable>

      {loading ? (
        <Text style={styles.emptyText}>
          Loading...
        </Text>
      ) : rides.length === 0 ? (
        <Text style={styles.emptyText}>
          No rides saved yet.
        </Text>
      ) : (
        rides.map((ride) => (
          <View
            key={ride.id}
            style={styles.ride}
          >
            <Text style={styles.rideTitle}>
              Ride #{ride.id}
            </Text>

            <Text style={styles.value}>
              Started: {ride.startedAt}
            </Text>

            <Text style={styles.value}>
              Duration:{" "}
              {formatDuration(
                ride.durationSeconds
              )}
            </Text>

            <Text style={styles.value}>
              Duration seconds:{" "}
              {ride.durationSeconds}
            </Text>

            <Text style={styles.value}>
              Distance:{" "}
              {ride.distanceKm.toFixed(3)} km
            </Text>

            <Text style={styles.value}>
              Average speed:{" "}
              {ride.averageSpeedKmh.toFixed(
                1
              )} km/h
            </Text>

            <Text style={styles.value}>
              Maximum speed:{" "}
              {ride.maxSpeedKmh.toFixed(
                1
              )} km/h
            </Text>

            <Text style={styles.value}>
              Route points:{" "}
              {ride.route.length}
            </Text>

            {ride.route.length > 0 && (
              <>
                <Text style={styles.value}>
                  First point:{" "}
                  {ride.route[0]?.latitude.toFixed(
                    6
                  )}
                  ,{" "}
                  {ride.route[0]?.longitude.toFixed(
                    6
                  )}
                </Text>

                <Text style={styles.value}>
                  Last point:{" "}
                  {ride.route[
                    ride.route.length - 1
                  ]?.latitude.toFixed(6)}
                  ,{" "}
                  {ride.route[
                    ride.route.length - 1
                  ]?.longitude.toFixed(6)}
                </Text>
              </>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#050505",
  },

  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    color: "#777777",
    fontSize: 13,
  },

  button: {
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#222222",
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },

  testButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#444444",
    borderRadius: 8,
  },

  testButtonText: {
    color: "#999999",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },

  ride: {
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 10,
    backgroundColor: "#0b0b0b",
  },

  rideTitle: {
    marginBottom: 14,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  value: {
    marginBottom: 7,
    color: "#aaaaaa",
    fontSize: 12,
  },

  emptyText: {
    color: "#666666",
    fontSize: 13,
  },

  errorBox: {
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#552222",
    borderRadius: 8,
  },

  errorText: {
    color: "#ff7777",
    fontSize: 12,
  },
});
