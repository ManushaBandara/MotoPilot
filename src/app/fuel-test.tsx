import { useState } from "react";

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getDatabase,
  getFuelEntries,
} from "../services/database";

import {
  calculateFuelEfficiency,
} from "../services/fuelEfficiency";

import type {
  FuelEntry,
} from "../services/database";

export default function FuelTestScreen() {
  const [entries, setEntries] =
    useState<FuelEntry[]>([]);

  const [efficiency, setEfficiency] =
    useState<number | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  async function loadFuelData() {
    try {
      setError(null);

      const db = await getDatabase();

      console.log(
        "Fuel test: database opened successfully."
      );

      const tables =
        await db.getAllAsync<{
          name: string;
        }>(
          `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
          `
        );

      console.log(
        "Fuel test: tables:",
        tables
      );

      const fuelColumns =
        await db.getAllAsync<{
          name: string;
          type: string;
        }>(
          `
            PRAGMA table_info(fuel_entries);
          `
        );

      console.log(
        "Fuel test: fuel_entries columns:",
        fuelColumns
      );

      const fuelEntries =
        await getFuelEntries();

      setEntries(fuelEntries);

      const result =
        calculateFuelEfficiency(
          fuelEntries
        );

      setEfficiency(
        result.estimatedKmPerLitre
      );
    } catch (err) {
      console.error(
        "Fuel test database load failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load fuel database."
      );
    }
  }

  async function testDatabaseConnection() {
    try {
      setError(null);

      const db = await getDatabase();

      console.log(
        "Fuel test: testing SQLite query..."
      );

      const result =
        await db.getFirstAsync<{
          value: number;
        }>(
          `
            SELECT 1 AS value;
          `
        );

      console.log(
        "Fuel test: SELECT 1 result:",
        result
      );

      Alert.alert(
        "SQLite test",
        `Database is working.\nSELECT 1 returned: ${result?.value}`
      );
    } catch (err) {
      console.error(
        "Fuel test SQLite connection failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "SQLite connection test failed."
      );
    }
  }

  async function addTestFullTank(
    odometerKm: number
  ) {
    try {
      setLoading(true);
      setError(null);

      const db = await getDatabase();

      console.log(
        "Fuel test: database opened."
      );

      console.log(
        "Fuel test: attempting direct INSERT..."
      );

      await db.runAsync(
        `
          INSERT INTO fuel_entries (
            added_at,
            amount_litres,
            price_per_litre,
            amount_spent,
            odometer_km,
            is_full_tank
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        new Date().toISOString(),
        10,
        300,
        3000,
        odometerKm,
        1
      );

      console.log(
        "Fuel test: direct INSERT succeeded."
      );

      await loadFuelData();

      Alert.alert(
        "Test entry added",
        `Full tank recorded at ${odometerKm.toLocaleString()} km.`
      );
    } catch (err) {
      console.error(
        "Fuel test direct INSERT failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to insert fuel entry."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearDisplay() {
    setEfficiency(null);
    setEntries([]);
    setError(null);
  }

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <Text style={styles.title}>
        Fuel Database Test
      </Text>

      <Text style={styles.description}>
        Temporary test screen for SQLite
        fuel entries and efficiency
        calculations.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          SQLite Connection
        </Text>

        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            void testDatabaseConnection()
          }
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Test SQLite Connection
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Add Test Data
        </Text>

        <Pressable
          style={styles.button}
          disabled={loading}
          onPress={() =>
            void addTestFullTank(20000)
          }
        >
          <Text style={styles.buttonText}>
            Add Full Tank — 20,000 km
          </Text>
        </Pressable>

        <Pressable
          style={styles.button}
          disabled={loading}
          onPress={() =>
            void addTestFullTank(20400)
          }
        >
          <Text style={styles.buttonText}>
            Add Full Tank — 20,400 km
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Calculated Efficiency
        </Text>

        <Text style={styles.value}>
          {efficiency != null
            ? `${efficiency.toFixed(2)} km/L`
            : "Not enough data"}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          SQLite Entries
        </Text>

        {entries.length === 0 ? (
          <Text style={styles.empty}>
            No fuel entries found.
          </Text>
        ) : (
          entries.map((entry) => (
            <View
              key={entry.id}
              style={styles.entry}
            >
              <Text style={styles.entryText}>
                ID: {entry.id}
              </Text>

              <Text style={styles.entryText}>
                Litres:{" "}
                {entry.amountLitres.toFixed(
                  2
                )}
              </Text>

              <Text style={styles.entryText}>
                Price: Rs.{" "}
                {entry.pricePerLitre ??
                  "—"}
              </Text>

              <Text style={styles.entryText}>
                Spent: Rs.{" "}
                {entry.amountSpent ??
                  "—"}
              </Text>

              <Text style={styles.entryText}>
                Odometer:{" "}
                {entry.odometerKm ??
                  "—"}{" "}
                km
              </Text>

              <Text style={styles.entryText}>
                Full tank:{" "}
                {entry.isFullTank
                  ? "YES"
                  : "NO"}
              </Text>
            </View>
          ))
        )}
      </View>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      <Pressable
        style={styles.secondaryButton}
        onPress={() =>
          void loadFuelData()
        }
      >
        <Text
          style={styles.secondaryButtonText}
        >
          Refresh
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={clearDisplay}
      >
        <Text
          style={styles.secondaryButtonText}
        >
          Clear Display
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#050505",
  },

  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },

  description: {
    color: "#999999",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },

  section: {
    marginBottom: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 12,
  },

  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 14,
  },

  button: {
    padding: 15,
    backgroundColor: "#7f1025",
    borderRadius: 8,
    marginBottom: 10,
  },

  buttonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "600",
  },

  value: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
  },

  empty: {
    color: "#888888",
  },

  entry: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },

  entryText: {
    color: "#cccccc",
    marginBottom: 4,
  },

  error: {
    color: "#ff5c5c",
    marginBottom: 16,
  },

  secondaryButton: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#444444",
    borderRadius: 8,
    marginBottom: 10,
  },

  secondaryButtonText: {
    color: "#ffffff",
    textAlign: "center",
  },
});