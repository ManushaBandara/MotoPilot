import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getDatabase,
  getRides,
  saveRide,
  Ride,
} from "../services/database";

export default function CameraTestScreen() {
  const [message, setMessage] = useState(
    "SQLite test ready."
  );

  const [rides, setRides] = useState<Ride[]>([]);

  const [loading, setLoading] = useState(false);

  async function handleTestDatabase() {
    try {
      setLoading(true);
      setMessage("Opening SQLite database...");

      await getDatabase();

      setMessage(
        "Database opened successfully."
      );

      await saveRide({
        startedAt: new Date().toISOString(),
        durationSeconds: 60,
        distanceKm: 1.5,
        averageSpeedKmh: 45,
        maxSpeedKmh: 62,
      });

      setMessage(
        "Test ride saved successfully."
      );

      const savedRides =
        await getRides();

      setRides(savedRides);

      setMessage(
        `SQLite works. ${savedRides.length} ride(s) found.`
      );
    } catch (error) {
      console.error(
        "SQLite test failed:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "SQLite test failed."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function checkDatabase() {
      try {
        await getDatabase();

        const existingRides =
          await getRides();

        setRides(existingRides);

        setMessage(
          `Database opened. ${existingRides.length} ride(s) currently stored.`
        );
      } catch (error) {
        console.error(
          "SQLite initialization failed:",
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to open SQLite."
        );
      }
    }

    checkDatabase();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        SQLite Test
      </Text>

      <Text style={styles.status}>
        {message}
      </Text>

      <Pressable
        style={[
          styles.button,
          loading && styles.disabledButton,
        ]}
        onPress={handleTestDatabase}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Testing..."
            : "Test SQLite"}
        </Text>
      </Pressable>

      <View style={styles.results}>
        <Text style={styles.resultsTitle}>
          Stored Rides
        </Text>

        {rides.length === 0 ? (
          <Text style={styles.text}>
            No rides stored.
          </Text>
        ) : (
          rides.map((ride) => (
            <View
              key={ride.id}
              style={styles.ride}
            >
              <Text style={styles.text}>
                Ride #{ride.id}
              </Text>

              <Text style={styles.text}>
                Distance:{" "}
                {ride.distanceKm} km
              </Text>

              <Text style={styles.text}>
                Average:{" "}
                {ride.averageSpeedKmh} km/h
              </Text>

              <Text style={styles.text}>
                Maximum:{" "}
                {ride.maxSpeedKmh} km/h
              </Text>
            </View>
          ))
        )}
      </View>
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
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
  },

  status: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },

  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#d42b4e",
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  results: {
    marginTop: 32,
  },

  resultsTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },

  ride: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },

  text: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 5,
  },
});