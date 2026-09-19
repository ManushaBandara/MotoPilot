import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getFuelEntries,
  FuelEntry,
} from "../services/database";

import {
  getFuelSettings,
  saveFuelSettings,
  FuelSettings,
} from "../services/fuelSettings";

import {
  addFuelTransaction,
} from "../services/fuelService";

import {
  getMonthlyFuelAnalytics,
} from "../services/fuelAnalyticsService";

import {
  calculateRemainingRange,
} from "../services/fuelCalculator";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatNumber(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toFixed(decimals);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString();
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FuelScreen() {
  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const [settings, setSettings] = useState<FuelSettings | null>(null);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [analytics, setAnalytics] = useState<Awaited<
    ReturnType<typeof getMonthlyFuelAnalytics>
  > | null>(null);

  const [tankCapacityInput, setTankCapacityInput] = useState("");
  const [fuelPriceInput, setFuelPriceInput] = useState("");
  const [kmPerLitreInput, setKmPerLitreInput] = useState("");

  const [amountSpentInput, setAmountSpentInput] = useState("");
  const [refuelPriceInput, setRefuelPriceInput] = useState("");
  const [odometerInput, setOdometerInput] = useState("");
  const [isFullTank, setIsFullTank] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingFuel, setAddingFuel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * Initial data loading.
   *
   * The eslint rule for setState-in-effect is disabled for this
   * initialization effect because these state updates are the result
   * of reading the local SQLite database.
   */
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setError(null);

        const [loadedSettings, loadedEntries, loadedAnalytics] =
          await Promise.all([
            getFuelSettings(),
            getFuelEntries(),
            getMonthlyFuelAnalytics(selectedYear, selectedMonth),
          ]);

        if (!mounted) {
          return;
        }

        setSettings(loadedSettings);
        setFuelEntries(loadedEntries);
        setAnalytics(loadedAnalytics);

        setTankCapacityInput(
          String(loadedSettings.tankCapacityLitres)
        );

        setFuelPriceInput(
          String(loadedSettings.currentFuelPrice)
        );

        setKmPerLitreInput(
          String(loadedSettings.estimatedKmPerLitre)
        );

        setRefuelPriceInput(
          String(loadedSettings.currentFuelPrice)
        );
      } catch (err) {
        console.error("Fuel: failed to initialize:", err);

        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load fuel data."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []);

  /*
   * Reload monthly analytics whenever the selected month changes.
   */
  useEffect(() => {
    let mounted = true;

    async function loadMonthlyAnalytics() {
      try {
        setError(null);

        const result = await getMonthlyFuelAnalytics(
          selectedYear,
          selectedMonth
        );

        if (!mounted) {
          return;
        }

        setAnalytics(result);
      } catch (err) {
        console.error(
          "Fuel: failed to load monthly analytics:",
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load monthly analytics."
        );
      }
    }

    /*
     * The initial load already loads the current month.
     * This effect is primarily responsible for month navigation.
     */
    if (!loading) {
      void loadMonthlyAnalytics();
    }

    return () => {
      mounted = false;
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [selectedMonth, selectedYear]);

  const refreshData = async () => {
    try {
      setError(null);

      const [loadedSettings, loadedEntries, loadedAnalytics] =
        await Promise.all([
          getFuelSettings(),
          getFuelEntries(),
          getMonthlyFuelAnalytics(selectedYear, selectedMonth),
        ]);

      setSettings(loadedSettings);
      setFuelEntries(loadedEntries);
      setAnalytics(loadedAnalytics);

      setTankCapacityInput(
        String(loadedSettings.tankCapacityLitres)
      );

      setFuelPriceInput(
        String(loadedSettings.currentFuelPrice)
      );

      setKmPerLitreInput(
        String(loadedSettings.estimatedKmPerLitre)
      );

      setRefuelPriceInput(
        String(loadedSettings.currentFuelPrice)
      );
    } catch (err) {
      console.error("Fuel: refresh failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh fuel data."
      );
    }
  };

  const estimatedFuelRemaining =
    settings?.estimatedFuelRemainingLitres ?? 0;

  const tankCapacity =
    settings?.tankCapacityLitres ?? 0;

  const estimatedKmPerLitre =
    settings?.estimatedKmPerLitre ?? 0;

  const estimatedRangeKm =
    tankCapacity > 0 && estimatedKmPerLitre > 0
      ? calculateRemainingRange(
          estimatedFuelRemaining,
          estimatedKmPerLitre
        )
      : 0;

  const fuelPercentage = useMemo(() => {
    if (tankCapacity <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        (estimatedFuelRemaining / tankCapacity) * 100
      )
    );
  }, [estimatedFuelRemaining, tankCapacity]);

  const recentEntries = useMemo(() => {
    return [...fuelEntries]
      .sort(
        (a, b) =>
          new Date(b.addedAt).getTime() -
          new Date(a.addedAt).getTime()
      )
      .slice(0, 10);
  }, [fuelEntries]);

  const changeMonth = (direction: number) => {
    let nextMonth = selectedMonth + direction;
    let nextYear = selectedYear;

    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }

    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }

    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
  };

  const handleSaveSettings = async () => {
    const tankCapacity = Number(tankCapacityInput);
    const fuelPrice = Number(fuelPriceInput);
    const kmPerLitre = Number(kmPerLitreInput);

    if (
      !Number.isFinite(tankCapacity) ||
      tankCapacity <= 0
    ) {
      Alert.alert(
        "Invalid tank capacity",
        "Enter a tank capacity greater than zero."
      );
      return;
    }

    if (
      !Number.isFinite(fuelPrice) ||
      fuelPrice <= 0
    ) {
      Alert.alert(
        "Invalid fuel price",
        "Enter a fuel price greater than zero."
      );
      return;
    }

    if (
      !Number.isFinite(kmPerLitre) ||
      kmPerLitre <= 0
    ) {
      Alert.alert(
        "Invalid fuel efficiency",
        "Enter an estimated km/L greater than zero."
      );
      return;
    }

    const currentFuel = Math.min(
      settings?.estimatedFuelRemainingLitres ?? 0,
      tankCapacity
    );

    const newSettings: FuelSettings = {
      tankCapacityLitres: tankCapacity,
      currentFuelPrice: fuelPrice,
      estimatedKmPerLitre: kmPerLitre,
      estimatedFuelRemainingLitres: currentFuel,
    };

    try {
      setSavingSettings(true);
      setError(null);

      await saveFuelSettings(newSettings);

      setSettings(newSettings);
      setFuelPriceInput(String(fuelPrice));

      Alert.alert(
        "Saved",
        "Fuel settings have been updated."
      );
    } catch (err) {
      console.error(
        "Fuel: failed to save settings:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save fuel settings."
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddFuel = async () => {
    const amountSpent = Number(amountSpentInput);

    const price =
      refuelPriceInput.trim() === ""
        ? settings?.currentFuelPrice ?? 0
        : Number(refuelPriceInput);

    const odometer =
      odometerInput.trim() === ""
        ? null
        : Number(odometerInput);

    if (
      !Number.isFinite(amountSpent) ||
      amountSpent <= 0
    ) {
      Alert.alert(
        "Invalid amount",
        "Enter the amount of money spent on fuel."
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      Alert.alert(
        "Invalid fuel price",
        "Enter a fuel price greater than zero."
      );
      return;
    }

    if (
      odometer != null &&
      (!Number.isFinite(odometer) || odometer < 0)
    ) {
      Alert.alert(
        "Invalid odometer",
        "Enter a valid odometer reading."
      );
      return;
    }

    try {
      setAddingFuel(true);
      setError(null);

      const result = await addFuelTransaction({
        amountSpent,
        pricePerLitre: price,
        odometerKm: odometer,
        isFullTank,
      });

      setAmountSpentInput("");
      setOdometerInput("");
      setIsFullTank(false);

      const [updatedSettings, updatedEntries, updatedAnalytics] =
        await Promise.all([
          getFuelSettings(),
          getFuelEntries(),
          getMonthlyFuelAnalytics(
            selectedYear,
            selectedMonth
          ),
        ]);

      setSettings(updatedSettings);
      setFuelEntries(updatedEntries);
      setAnalytics(updatedAnalytics);

      setTankCapacityInput(
        String(updatedSettings.tankCapacityLitres)
      );

      setFuelPriceInput(
        String(updatedSettings.currentFuelPrice)
      );

      setKmPerLitreInput(
        String(updatedSettings.estimatedKmPerLitre)
      );

      setRefuelPriceInput(
        String(updatedSettings.currentFuelPrice)
      );

      Alert.alert(
        "Fuel added",
        `${formatNumber(result.litresAdded, 2)} L added.\n\nEstimated fuel remaining: ${formatNumber(
          result.estimatedFuelRemainingLitres,
          2
        )} L\nEstimated range: ${Math.round(
          result.estimatedRangeKm
        )} km`
      );
    } catch (err) {
      console.error(
        "Fuel: failed to add transaction:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add fuel transaction."
      );
    } finally {
      setAddingFuel(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingTitle}>
          Loading fuel data
        </Text>

        <Text style={styles.loadingText}>
          Reading local fuel records...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              MOTOPILOT
            </Text>

            <Text style={styles.title}>
              Fuel
            </Text>

            <Text style={styles.subtitle}>
              Estimated fuel tracking and spending
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={refreshData}
          >
            <Text style={styles.refreshButtonText}>
              REFRESH
            </Text>
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>
              Fuel data error
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {/* Current estimated fuel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            CURRENT ESTIMATE
          </Text>

          <View style={styles.fuelCard}>
            <View style={styles.fuelCardTop}>
              <View>
                <Text style={styles.largeValue}>
                  {formatNumber(
                    estimatedFuelRemaining,
                    2
                  )}
                  <Text style={styles.largeUnit}>
                    {" "}L
                  </Text>
                </Text>

                <Text style={styles.mutedText}>
                  Estimated fuel remaining
                </Text>
              </View>

              <View style={styles.percentageBox}>
                <Text style={styles.percentageValue}>
                  {Math.round(fuelPercentage)}%
                </Text>

                <Text style={styles.percentageLabel}>
                  TANK
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${fuelPercentage}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.rangeRow}>
              <View>
                <Text style={styles.statLabel}>
                  RANGE
                </Text>

                <Text style={styles.statValue}>
                  {Math.round(estimatedRangeKm)} km
                </Text>
              </View>

              <View>
                <Text style={styles.statLabel}>
                  EFFICIENCY
                </Text>

                <Text style={styles.statValue}>
                  {formatNumber(
                    estimatedKmPerLitre,
                    1
                  )}{" "}
                  km/L
                </Text>
              </View>

              <View>
                <Text style={styles.statLabel}>
                  CAPACITY
                </Text>

                <Text style={styles.statValue}>
                  {formatNumber(tankCapacity, 1)} L
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            Fuel level and range are estimates. Your motorcycle
            does not provide electronic fuel-level data.
          </Text>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            FUEL SETTINGS
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>
              TANK CAPACITY (L)
            </Text>

            <TextInput
              style={styles.input}
              value={tankCapacityInput}
              onChangeText={setTankCapacityInput}
              keyboardType="decimal-pad"
              placeholder="12"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>
              CURRENT FUEL PRICE / L
            </Text>

            <TextInput
              style={styles.input}
              value={fuelPriceInput}
              onChangeText={setFuelPriceInput}
              keyboardType="decimal-pad"
              placeholder="300"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>
              ESTIMATED EFFICIENCY (KM/L)
            </Text>

            <TextInput
              style={styles.input}
              value={kmPerLitreInput}
              onChangeText={setKmPerLitreInput}
              keyboardType="decimal-pad"
              placeholder="40"
              placeholderTextColor="#666"
            />

            <Pressable
              style={[
                styles.primaryButton,
                savingSettings &&
                  styles.disabledButton,
              ]}
              onPress={handleSaveSettings}
              disabled={savingSettings}
            >
              <Text style={styles.primaryButtonText}>
                {savingSettings
                  ? "SAVING..."
                  : "SAVE SETTINGS"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Add fuel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ADD REFUEL
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>
              AMOUNT SPENT
            </Text>

            <TextInput
              style={styles.input}
              value={amountSpentInput}
              onChangeText={setAmountSpentInput}
              keyboardType="decimal-pad"
              placeholder="5000"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>
              FUEL PRICE / L
            </Text>

            <TextInput
              style={styles.input}
              value={refuelPriceInput}
              onChangeText={setRefuelPriceInput}
              keyboardType="decimal-pad"
              placeholder="300"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputHint}>
              Leave this at the current price or change it for
              this specific transaction.
            </Text>

            <Text style={styles.inputLabel}>
              ODOMETER (KM)
            </Text>

            <TextInput
              style={styles.input}
              value={odometerInput}
              onChangeText={setOdometerInput}
              keyboardType="decimal-pad"
              placeholder="20000"
              placeholderTextColor="#666"
            />

            <Pressable
              style={[
                styles.fullTankButton,
                isFullTank &&
                  styles.fullTankButtonActive,
              ]}
              onPress={() =>
                setIsFullTank((value) => !value)
              }
            >
              <View
                style={[
                  styles.checkbox,
                  isFullTank &&
                    styles.checkboxActive,
                ]}
              >
                {isFullTank && (
                  <Text style={styles.checkmark}>
                    ✓
                  </Text>
                )}
              </View>

              <View style={styles.fullTankTextContainer}>
                <Text style={styles.fullTankTitle}>
                  FULL TANK
                </Text>

                <Text style={styles.fullTankDescription}>
                  Use this when you filled the tank completely.
                  This helps calculate estimated km/L.
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.primaryButton,
                addingFuel &&
                  styles.disabledButton,
              ]}
              onPress={handleAddFuel}
              disabled={addingFuel}
            >
              <Text style={styles.primaryButtonText}>
                {addingFuel
                  ? "ADDING..."
                  : "ADD FUEL"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Monthly analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            MONTHLY ANALYTICS
          </Text>

          <View style={styles.monthSelector}>
            <Pressable
              style={styles.monthButton}
              onPress={() => changeMonth(-1)}
            >
              <Text style={styles.monthButtonText}>
                ‹
              </Text>
            </Pressable>

            <View style={styles.monthTitleContainer}>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[selectedMonth]}
              </Text>

              <Text style={styles.monthYear}>
                {selectedYear}
              </Text>
            </View>

            <Pressable
              style={styles.monthButton}
              onPress={() => changeMonth(1)}
            >
              <Text style={styles.monthButtonText}>
                ›
              </Text>
            </Pressable>
          </View>

          {analytics && (
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>
                  SPENT
                </Text>

                <Text style={styles.analyticsValue}>
                  Rs.{" "}
                  {Math.round(
                    analytics.totalMoneySpent
                  ).toLocaleString()}
                </Text>
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>
                  LITRES
                </Text>

                <Text style={styles.analyticsValue}>
                  {formatNumber(
                    analytics.totalLitresPurchased,
                    2
                  )}{" "}
                  L
                </Text>
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>
                  AVG PRICE
                </Text>

                <Text style={styles.analyticsValue}>
                  Rs.{" "}
                  {formatNumber(
                    analytics.averageFuelPrice,
                    2
                  )}
                </Text>
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>
                  REFUELS
                </Text>

                <Text style={styles.analyticsValue}>
                  {analytics.refuelCount}
                </Text>
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>
                  DISTANCE
                </Text>

                <Text style={styles.analyticsValue}>
                  {formatNumber(
                    analytics.distanceKm,
                    1
                  )}{" "}
                  km
                </Text>
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>
                  EST. KM/L
                </Text>

                <Text style={styles.analyticsValue}>
                  {analytics.estimatedKmPerLitre != null
                    ? `${formatNumber(
                        analytics.estimatedKmPerLitre,
                        1
                      )} km/L`
                    : "--"}
                </Text>
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>
                  COST / KM
                </Text>

                <Text style={styles.analyticsValue}>
                  {analytics.estimatedCostPerKm != null
                    ? `Rs. ${formatNumber(
                        analytics.estimatedCostPerKm,
                        2
                      )}`
                    : "--"}
                </Text>
              </View>
            </View>
          )}

          {!analytics && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No analytics available for this month.
              </Text>
            </View>
          )}
        </View>

        {/* Recent fuel records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            RECENT REFUELS
          </Text>

          {recentEntries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No fuel transactions recorded yet.
              </Text>
            </View>
          ) : (
            <View style={styles.entriesContainer}>
              {recentEntries.map((entry) => (
                <View
                  key={entry.id}
                  style={styles.entryRow}
                >
                  <View style={styles.entryMain}>
                    <Text style={styles.entryDate}>
                      {formatDate(entry.addedAt)}
                    </Text>

                    <Text style={styles.entryTime}>
                      {formatTime(entry.addedAt)}
                    </Text>

                    {entry.odometerKm != null && (
                      <Text style={styles.entrySecondary}>
                        Odometer:{" "}
                        {entry.odometerKm.toLocaleString()} km
                      </Text>
                    )}

                    {entry.isFullTank && (
                      <Text style={styles.fullTankBadge}>
                        FULL TANK
                      </Text>
                    )}
                  </View>

                  <View style={styles.entryRight}>
                    <Text style={styles.entryLitres}>
                      {formatNumber(
                        entry.amountLitres,
                        2
                      )}{" "}
                      L
                    </Text>

                    {entry.amountSpent != null && (
                      <Text style={styles.entrySpent}>
                        Rs.{" "}
                        {entry.amountSpent.toLocaleString()}
                      </Text>
                    )}

                    {entry.pricePerLitre != null && (
                      <Text style={styles.entryPrice}>
                        Rs.{" "}
                        {formatNumber(
                          entry.pricePerLitre,
                          2
                        )}{" "}
                        / L
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            MotoPilot fuel tracking uses estimated fuel consumption.
            Actual fuel level may differ from the estimate.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050505",
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },

  loadingText: {
    color: "#777777",
    fontSize: 14,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },

  eyebrow: {
    color: "#d42b4e",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 7,
  },

  title: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },

  subtitle: {
    color: "#777777",
    fontSize: 13,
    marginTop: 5,
  },

  refreshButton: {
    borderWidth: 1,
    borderColor: "#292929",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },

  refreshButtonText: {
    color: "#aaaaaa",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  errorBox: {
    backgroundColor: "#18090d",
    borderWidth: 1,
    borderColor: "#5c1729",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },

  errorTitle: {
    color: "#ff5a7b",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 5,
  },

  errorText: {
    color: "#c7a7ae",
    fontSize: 13,
    lineHeight: 19,
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },

  fuelCard: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    padding: 18,
  },

  fuelCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  largeValue: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },

  largeUnit: {
    color: "#888888",
    fontSize: 18,
    fontWeight: "600",
  },

  mutedText: {
    color: "#666666",
    fontSize: 12,
    marginTop: 2,
  },

  percentageBox: {
    alignItems: "flex-end",
  },

  percentageValue: {
    color: "#d42b4e",
    fontSize: 25,
    fontWeight: "800",
  },

  percentageLabel: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },

  progressTrack: {
    height: 7,
    backgroundColor: "#222222",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 22,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#d42b4e",
    borderRadius: 10,
  },

  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },

  statLabel: {
    color: "#555555",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 5,
  },

  statValue: {
    color: "#dddddd",
    fontSize: 14,
    fontWeight: "700",
  },

  disclaimer: {
    color: "#555555",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
  },

  formCard: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    padding: 18,
  },

  inputLabel: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: 7,
    marginTop: 4,
  },

  input: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#292929",
    borderRadius: 8,
    color: "#ffffff",
    fontSize: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 14,
  },

  inputHint: {
    color: "#555555",
    fontSize: 11,
    lineHeight: 16,
    marginTop: -7,
    marginBottom: 14,
  },

  primaryButton: {
    backgroundColor: "#d42b4e",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 4,
  },

  disabledButton: {
    opacity: 0.5,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  fullTankButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#292929",
    borderRadius: 9,
    padding: 13,
    marginBottom: 15,
  },

  fullTankButtonActive: {
    borderColor: "#6c1d31",
    backgroundColor: "#16090d",
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#555555",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  checkboxActive: {
    backgroundColor: "#d42b4e",
    borderColor: "#d42b4e",
  },

  checkmark: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },

  fullTankTextContainer: {
    flex: 1,
  },

  fullTankTitle: {
    color: "#dddddd",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
  },

  fullTankDescription: {
    color: "#666666",
    fontSize: 11,
    lineHeight: 16,
  },

  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
  },

  monthButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#151515",
    alignItems: "center",
    justifyContent: "center",
  },

  monthButtonText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "300",
    marginTop: -3,
  },

  monthTitleContainer: {
    alignItems: "center",
  },

  monthTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  monthYear: {
    color: "#666666",
    fontSize: 11,
    marginTop: 2,
  },

  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  analyticsCard: {
    width: "48%",
    flexGrow: 1,
    minHeight: 78,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 10,
    padding: 13,
    justifyContent: "center",
  },

  analyticsLabel: {
    color: "#555555",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },

  analyticsValue: {
    color: "#eeeeee",
    fontSize: 15,
    fontWeight: "800",
  },

  emptyBox: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },

  emptyText: {
    color: "#666666",
    fontSize: 13,
    textAlign: "center",
  },

  entriesContainer: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 12,
    overflow: "hidden",
  },

  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
  },

  entryMain: {
    flex: 1,
    paddingRight: 10,
  },

  entryDate: {
    color: "#dddddd",
    fontSize: 13,
    fontWeight: "700",
  },

  entryTime: {
    color: "#555555",
    fontSize: 10,
    marginTop: 2,
  },

  entrySecondary: {
    color: "#666666",
    fontSize: 10,
    marginTop: 7,
  },

  fullTankBadge: {
    color: "#d42b4e",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 6,
  },

  entryRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },

  entryLitres: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },

  entrySpent: {
    color: "#aaaaaa",
    fontSize: 11,
    marginTop: 3,
  },

  entryPrice: {
    color: "#555555",
    fontSize: 9,
    marginTop: 2,
  },

  footer: {
    paddingTop: 5,
    paddingHorizontal: 5,
  },

  footerText: {
    color: "#444444",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },
});