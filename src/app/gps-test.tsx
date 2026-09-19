import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import MotoPilotLocationModule, {
  NativeLocation,
} from "../../modules/motopilot-location/src/MotoPilotLocationModule";

export default function GpsTestScreen() {
  const [location, setLocation] = useState<NativeLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const subscription =
      MotoPilotLocationModule.addListener(
        "onLocationUpdate",
        (newLocation) => {
          console.log(
            "NATIVE GPS TEST: location update:",
            newLocation
          );

          setLocation(newLocation);
          setError(null);
        }
      );

    return () => {
      subscription.remove();

      MotoPilotLocationModule.stopLocationUpdates().catch(
        () => {}
      );
    };
  }, []);

  async function startGps() {
    try {
      setError(null);

      console.log(
        "NATIVE GPS TEST: starting location updates..."
      );

      await MotoPilotLocationModule.startLocationUpdates();

      setRunning(true);
    } catch (err) {
      console.error("NATIVE GPS START ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start GPS."
      );
    }
  }

  async function stopGps() {
    try {
      await MotoPilotLocationModule.stopLocationUpdates();

      setRunning(false);

      console.log(
        "NATIVE GPS TEST: location updates stopped."
      );
    } catch (err) {
      console.error("NATIVE GPS STOP ERROR:", err);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NATIVE GPS TEST</Text>

      <Text style={styles.subtitle}>
        Android LocationManager
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          title={
            running
              ? "GPS Running"
              : "Start GPS"
          }
          onPress={startGps}
          disabled={running}
        />

        <View style={styles.buttonSpacing} />

        <Button
          title="Stop GPS"
          onPress={stopGps}
          disabled={!running}
        />
      </View>

      <View style={styles.status}>
        <Text style={styles.statusText}>
          STATUS: {running ? "RUNNING" : "STOPPED"}
        </Text>
      </View>

      <View style={styles.result}>
        {location && (
          <>
            <Text style={styles.value}>
              LAT: {location.latitude.toFixed(6)}
            </Text>

            <Text style={styles.value}>
              LNG: {location.longitude.toFixed(6)}
            </Text>

            <Text style={styles.value}>
              SPEED:{" "}
              {location.speed != null
                ? `${(location.speed * 3.6).toFixed(1)} km/h`
                : "N/A"}
            </Text>

            <Text style={styles.value}>
              HEADING:{" "}
              {location.heading != null
                ? `${location.heading.toFixed(1)}°`
                : "N/A"}
            </Text>

            <Text style={styles.value}>
              ACCURACY:{" "}
              {location.accuracy != null
                ? `${location.accuracy.toFixed(1)} m`
                : "N/A"}
            </Text>
          </>
        )}

        {error && (
          <Text style={styles.error}>
            ERROR: {error}
          </Text>
        )}

        {!location && !error && (
          <Text style={styles.waiting}>
            Start GPS to receive continuous updates.
          </Text>
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
    paddingTop: 70,
  },

  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
  },

  subtitle: {
    color: "#666666",
    marginTop: 6,
    marginBottom: 40,
  },

  buttonContainer: {
    marginBottom: 25,
  },

  buttonSpacing: {
    height: 12,
  },

  status: {
    marginBottom: 20,
  },

  statusText: {
    color: "#d42b4e",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },

  result: {
    marginTop: 10,
  },

  value: {
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 12,
  },

  waiting: {
    color: "#666666",
  },

  error: {
    color: "#ff4d4d",
    fontSize: 14,
  },
});