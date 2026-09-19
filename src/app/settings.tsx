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
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getDashcamSettings,
  saveDashcamSettings,
} from "../services/camera/dashcamSettings";

import {
  DashcamSettings,
  DEFAULT_DASHCAM_SETTINGS,
} from "../services/camera/dashcamTypes";

import {
  getFuelSettings,
  saveFuelSettings,
  FuelSettings,
  DEFAULT_FUEL_SETTINGS,
} from "../services/fuelSettings";

/* ============================================================
   HELPERS
   ============================================================ */

function formatStorageGigabytes(
  bytes: number
): string {
  return (
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(1);
}

/* ============================================================
   SETTINGS SCREEN
   ============================================================ */

export default function SettingsScreen() {
  /* ==========================================================
     DASHCAM STATE
     ========================================================== */

  const [
    settings,
    setSettings,
  ] = useState<DashcamSettings>(
    DEFAULT_DASHCAM_SETTINGS
  );

  const [
    maxRollingClipsText,
    setMaxRollingClipsText,
  ] = useState(
    DEFAULT_DASHCAM_SETTINGS.maxRollingClips.toString()
  );

  const [
    clipDurationMinutesText,
    setClipDurationMinutesText,
  ] = useState(
    (
      DEFAULT_DASHCAM_SETTINGS
        .clipDurationSeconds / 60
    ).toString()
  );

  const [
    maxStorageGbText,
    setMaxStorageGbText,
  ] = useState(
    formatStorageGigabytes(
      DEFAULT_DASHCAM_SETTINGS.maxStorageBytes
    )
  );

  const [
    audioEnabled,
    setAudioEnabled,
  ] = useState(
    DEFAULT_DASHCAM_SETTINGS.audioEnabled
  );

  /* ==========================================================
     FUEL STATE
     ========================================================== */

  const [
    fuelSettings,
    setFuelSettings,
  ] = useState<FuelSettings>(
    DEFAULT_FUEL_SETTINGS
  );

  const [
    tankCapacityText,
    setTankCapacityText,
  ] = useState(
    DEFAULT_FUEL_SETTINGS.tankCapacityLitres.toString()
  );

  const [
    fuelPriceText,
    setFuelPriceText,
  ] = useState(
    DEFAULT_FUEL_SETTINGS.currentFuelPrice.toString()
  );

  const [
    estimatedKmPerLitreText,
    setEstimatedKmPerLitreText,
  ] = useState(
    DEFAULT_FUEL_SETTINGS.estimatedKmPerLitre.toString()
  );

  /* ==========================================================
     COMMON STATE
     ========================================================== */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  /* ==========================================================
     LOAD SETTINGS
     ========================================================== */

  const loadSettings =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          savedDashcamSettings,
          savedFuelSettings,
        ] = await Promise.all([
          getDashcamSettings(),
          getFuelSettings(),
        ]);

        /* ----------------------------------------------
           DASHCAM
           ---------------------------------------------- */

        setSettings(
          savedDashcamSettings
        );

        setMaxRollingClipsText(
          savedDashcamSettings.maxRollingClips.toString()
        );

        setClipDurationMinutesText(
          (
            savedDashcamSettings
              .clipDurationSeconds / 60
          ).toString()
        );

        setMaxStorageGbText(
          formatStorageGigabytes(
            savedDashcamSettings.maxStorageBytes
          )
        );

        setAudioEnabled(
          savedDashcamSettings.audioEnabled
        );

        /* ----------------------------------------------
           FUEL
           ---------------------------------------------- */

        setFuelSettings(
          savedFuelSettings
        );

        setTankCapacityText(
          savedFuelSettings
            .tankCapacityLitres
            .toString()
        );

        setFuelPriceText(
          savedFuelSettings
            .currentFuelPrice
            .toString()
        );

        setEstimatedKmPerLitreText(
          savedFuelSettings
            .estimatedKmPerLitre
            .toString()
        );
      } catch (err) {
        console.error(
          "Settings: failed to load settings:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load settings."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* ==========================================================
     SAVE SETTINGS
     ========================================================== */

  const handleSave =
    async () => {
      /* ------------------------------------------------------
         DASHCAM VALUES
         ------------------------------------------------------ */

      const maxRollingClips =
        Number(
          maxRollingClipsText
        );

      const clipDurationMinutes =
        Number(
          clipDurationMinutesText
        );

      const maxStorageGb =
        Number(
          maxStorageGbText
        );

      /* ------------------------------------------------------
         FUEL VALUES
         ------------------------------------------------------ */

      const tankCapacityLitres =
        Number(
          tankCapacityText
        );

      const currentFuelPrice =
        Number(
          fuelPriceText
        );

      const estimatedKmPerLitre =
        Number(
          estimatedKmPerLitreText
        );

      /* ------------------------------------------------------
         DASHCAM VALIDATION
         ------------------------------------------------------ */

      if (
        !Number.isInteger(
          maxRollingClips
        ) ||
        maxRollingClips <= 0
      ) {
        setError(
          "Maximum rolling clips must be a positive whole number."
        );

        return;
      }

      if (
        !Number.isFinite(
          clipDurationMinutes
        ) ||
        clipDurationMinutes <= 0
      ) {
        setError(
          "Clip duration must be greater than zero."
        );

        return;
      }

      if (
        !Number.isFinite(
          maxStorageGb
        ) ||
        maxStorageGb <= 0
      ) {
        setError(
          "Maximum storage must be greater than zero."
        );

        return;
      }

      /* ------------------------------------------------------
         FUEL VALIDATION
         ------------------------------------------------------ */

      if (
        !Number.isFinite(
          tankCapacityLitres
        ) ||
        tankCapacityLitres <= 0
      ) {
        setError(
          "Tank capacity must be greater than zero."
        );

        return;
      }

      if (
        !Number.isFinite(
          currentFuelPrice
        ) ||
        currentFuelPrice <= 0
      ) {
        setError(
          "Current fuel price must be greater than zero."
        );

        return;
      }

      if (
        !Number.isFinite(
          estimatedKmPerLitre
        ) ||
        estimatedKmPerLitre <= 0
      ) {
        setError(
          "Estimated km/L must be greater than zero."
        );

        return;
      }

      /* ------------------------------------------------------
         BUILD SETTINGS
         ------------------------------------------------------ */

      const nextDashcamSettings:
        DashcamSettings = {
        maxRollingClips,

        clipDurationSeconds:
          Math.round(
            clipDurationMinutes * 60
          ),

        maxStorageBytes:
          Math.round(
            maxStorageGb *
              1024 *
              1024 *
              1024
          ),

        audioEnabled,
      };

      const nextFuelSettings:
        FuelSettings = {
        tankCapacityLitres,

        currentFuelPrice,

        estimatedKmPerLitre,

        estimatedFuelRemainingLitres:
          Math.min(
            fuelSettings.estimatedFuelRemainingLitres,
            tankCapacityLitres
          ),
      };

      /* ------------------------------------------------------
         SAVE
         ------------------------------------------------------ */

      try {
        setSaving(true);
        setError(null);

        await Promise.all([
          saveDashcamSettings(
            nextDashcamSettings
          ),

          saveFuelSettings(
            nextFuelSettings
          ),
        ]);

        setSettings(
          nextDashcamSettings
        );

        setFuelSettings(
          nextFuelSettings
        );

        Alert.alert(
          "Settings saved",
          "MotoPilot settings have been saved."
        );
      } catch (err) {
        console.error(
          "Settings: failed to save settings:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to save settings."
        );
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     RESET SETTINGS
     ========================================================== */

  const handleReset =
    () => {
      Alert.alert(
        "Reset settings?",
        "This will restore the default dashcam and fuel configuration.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },

          {
            text: "Reset",
            style: "destructive",

            onPress: async () => {
              try {
                setSaving(true);
                setError(null);

                /*
                 * Keep the user's current estimated
                 * fuel level when resetting configuration.
                 *
                 * Resetting settings should not pretend
                 * that the fuel tank became empty.
                 */
                const resetFuelSettings:
                  FuelSettings = {
                  ...DEFAULT_FUEL_SETTINGS,

                  estimatedFuelRemainingLitres:
                    Math.min(
                      fuelSettings
                        .estimatedFuelRemainingLitres,
                      DEFAULT_FUEL_SETTINGS
                        .tankCapacityLitres
                    ),
                };

                await Promise.all([
                  saveDashcamSettings(
                    DEFAULT_DASHCAM_SETTINGS
                  ),

                  saveFuelSettings(
                    resetFuelSettings
                  ),
                ]);

                /* ------------------------------------------
                   DASHCAM
                   ------------------------------------------ */

                setSettings(
                  DEFAULT_DASHCAM_SETTINGS
                );

                setMaxRollingClipsText(
                  DEFAULT_DASHCAM_SETTINGS
                    .maxRollingClips
                    .toString()
                );

                setClipDurationMinutesText(
                  (
                    DEFAULT_DASHCAM_SETTINGS
                      .clipDurationSeconds /
                    60
                  ).toString()
                );

                setMaxStorageGbText(
                  formatStorageGigabytes(
                    DEFAULT_DASHCAM_SETTINGS
                      .maxStorageBytes
                  )
                );

                setAudioEnabled(
                  DEFAULT_DASHCAM_SETTINGS
                    .audioEnabled
                );

                /* ------------------------------------------
                   FUEL
                   ------------------------------------------ */

                setFuelSettings(
                  resetFuelSettings
                );

                setTankCapacityText(
                  DEFAULT_FUEL_SETTINGS
                    .tankCapacityLitres
                    .toString()
                );

                setFuelPriceText(
                  DEFAULT_FUEL_SETTINGS
                    .currentFuelPrice
                    .toString()
                );

                setEstimatedKmPerLitreText(
                  DEFAULT_FUEL_SETTINGS
                    .estimatedKmPerLitre
                    .toString()
                );

                Alert.alert(
                  "Settings reset",
                  "MotoPilot settings have been restored to their defaults."
                );
              } catch (err) {
                console.error(
                  "Settings: failed to reset settings:",
                  err
                );

                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to reset settings."
                );
              } finally {
                setSaving(false);
              }
            },
          },
        ]
      );
    };

  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <View
        style={styles.center}
      >
        <Text
          style={styles.loadingText}
        >
          Loading settings...
        </Text>
      </View>
    );
  }

  /* ==========================================================
     UI
     ========================================================== */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={styles.title}
      >
        SETTINGS
      </Text>

      <Text
        style={styles.subtitle}
      >
        MotoPilot configuration
      </Text>

      {/* ======================================================
          DASHCAM
          ====================================================== */}

      <View
        style={styles.section}
      >
        <Text
          style={styles.sectionTitle}
        >
          DASHCAM
        </Text>

        {/* ROLLING CLIPS */}

        <View
          style={styles.settingRow}
        >
          <View
            style={styles.settingInfo}
          >
            <Text
              style={styles.settingTitle}
            >
              Rolling clips
            </Text>

            <Text
              style={styles.settingDescription}
            >
              Maximum number of temporary clips kept.
            </Text>
          </View>

          <TextInput
            style={styles.input}
            value={
              maxRollingClipsText
            }
            onChangeText={
              setMaxRollingClipsText
            }
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>

        {/* CLIP DURATION */}

        <View
          style={styles.settingRow}
        >
          <View
            style={styles.settingInfo}
          >
            <Text
              style={styles.settingTitle}
            >
              Clip duration
            </Text>

            <Text
              style={styles.settingDescription}
            >
              Length of each rolling recording.
            </Text>
          </View>

          <View
            style={styles.inputWithUnit}
          >
            <TextInput
              style={styles.input}
              value={
                clipDurationMinutesText
              }
              onChangeText={
                setClipDurationMinutesText
              }
              keyboardType="decimal-pad"
              maxLength={5}
            />

            <Text
              style={styles.unitText}
            >
              min
            </Text>
          </View>
        </View>

        {/* STORAGE */}

        <View
          style={styles.settingRow}
        >
          <View
            style={styles.settingInfo}
          >
            <Text
              style={styles.settingTitle}
            >
              Maximum storage
            </Text>

            <Text
              style={styles.settingDescription}
            >
              Maximum storage used by rolling clips.
            </Text>
          </View>

          <View
            style={styles.inputWithUnit}
          >
            <TextInput
              style={styles.input}
              value={
                maxStorageGbText
              }
              onChangeText={
                setMaxStorageGbText
              }
              keyboardType="decimal-pad"
              maxLength={6}
            />

            <Text
              style={styles.unitText}
            >
              GB
            </Text>
          </View>
        </View>

        {/* AUDIO */}

        <View
          style={styles.settingRow}
        >
          <View
            style={styles.settingInfo}
          >
            <Text
              style={styles.settingTitle}
            >
              Record audio
            </Text>

            <Text
              style={styles.settingDescription}
            >
              Include microphone audio in dashcam recordings.
            </Text>
          </View>

          <Switch
            value={
              audioEnabled
            }
            onValueChange={
              setAudioEnabled
            }
          />
        </View>
      </View>

      {/* ======================================================
          FUEL
          ====================================================== */}

      <View
        style={styles.section}
      >
        <Text
          style={styles.sectionTitle}
        >
          FUEL
        </Text>

        {/* TANK CAPACITY */}

        <View
          style={styles.settingRow}
        >
          <View
            style={styles.settingInfo}
          >
            <Text
              style={styles.settingTitle}
            >
              Tank capacity
            </Text>

            <Text
              style={styles.settingDescription}
            >
              Fuel tank capacity used for range estimation.
            </Text>
          </View>

          <View
            style={styles.inputWithUnit}
          >
            <TextInput
              style={styles.input}
              value={
                tankCapacityText
              }
              onChangeText={
                setTankCapacityText
              }
              keyboardType="decimal-pad"
              maxLength={6}
            />

            <Text
              style={styles.unitText}
            >
              L
            </Text>
          </View>
        </View>

        {/* FUEL PRICE */}

        <View
          style={styles.settingRow}
        >
          <View
            style={styles.settingInfo}
          >
            <Text
              style={styles.settingTitle}
            >
              Current fuel price
            </Text>

            <Text
              style={styles.settingDescription}
            >
              Default fuel price used when calculating refuelling.
            </Text>
          </View>

          <View
            style={styles.inputWithUnit}
          >
            <TextInput
              style={styles.input}
              value={
                fuelPriceText
              }
              onChangeText={
                setFuelPriceText
              }
              keyboardType="decimal-pad"
              maxLength={7}
            />

            <Text
              style={styles.unitText}
            >
              Rs/L
            </Text>
          </View>
        </View>

        {/* KM/L */}

        <View
          style={styles.settingRow}
        >
          <View
            style={styles.settingInfo}
          >
            <Text
              style={styles.settingTitle}
            >
              Estimated km/L
            </Text>

            <Text
              style={styles.settingDescription}
            >
              Manual fallback used until measured fuel efficiency is available.
            </Text>
          </View>

          <View
            style={styles.inputWithUnit}
          >
            <TextInput
              style={styles.input}
              value={
                estimatedKmPerLitreText
              }
              onChangeText={
                setEstimatedKmPerLitreText
              }
              keyboardType="decimal-pad"
              maxLength={6}
            />

            <Text
              style={styles.unitText}
            >
              km/L
            </Text>
          </View>
        </View>
      </View>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <Text
          style={styles.errorText}
        >
          {error}
        </Text>
      )}

      {/* ======================================================
          SAVE
          ====================================================== */}

      <Pressable
        style={[
          styles.saveButton,
          saving &&
            styles.disabledButton,
        ]}
        onPress={
          handleSave
        }
        disabled={saving}
      >
        <Text
          style={styles.buttonText}
        >
          {saving
            ? "Saving..."
            : "Save Settings"}
        </Text>
      </Pressable>

      {/* ======================================================
          RESET
          ====================================================== */}

      <Pressable
        style={[
          styles.resetButton,
          saving &&
            styles.disabledButton,
        ]}
        onPress={
          handleReset
        }
        disabled={saving}
      >
        <Text
          style={styles.buttonText}
        >
          Reset Settings
        </Text>
      </Pressable>

      {/* ======================================================
          CURRENT VALUES
          ====================================================== */}

      <View
        style={styles.currentValues}
      >
        <Text
          style={styles.currentValuesTitle}
        >
          Current configuration
        </Text>

        <Text
          style={styles.currentValue}
        >
          Rolling clips:{" "}
          {settings.maxRollingClips}
        </Text>

        <Text
          style={styles.currentValue}
        >
          Clip duration:{" "}
          {settings.clipDurationSeconds /
            60}{" "}
          minutes
        </Text>

        <Text
          style={styles.currentValue}
        >
          Maximum storage:{" "}
          {formatStorageGigabytes(
            settings.maxStorageBytes
          )}{" "}
          GB
        </Text>

        <Text
          style={styles.currentValue}
        >
          Audio:{" "}
          {settings.audioEnabled
            ? "Enabled"
            : "Disabled"}
        </Text>

        <Text
          style={styles.currentValue}
        >
          Tank capacity:{" "}
          {fuelSettings.tankCapacityLitres}{" "}
          L
        </Text>

        <Text
          style={styles.currentValue}
        >
          Fuel price: Rs.{" "}
          {fuelSettings.currentFuelPrice}/L
        </Text>

        <Text
          style={styles.currentValue}
        >
          Estimated efficiency:{" "}
          {fuelSettings.estimatedKmPerLitre}{" "}
          km/L
        </Text>
      </View>
    </ScrollView>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#050505",
    },

    content: {
      padding: 24,
      paddingBottom: 50,
    },

    center: {
      flex: 1,
      backgroundColor:
        "#050505",
      alignItems: "center",
      justifyContent:
        "center",
    },

    loadingText: {
      color: "#aaa",
      fontSize: 14,
    },

    title: {
      color: "#fff",
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: 3,
    },

    subtitle: {
      color: "#666",
      fontSize: 12,
      marginTop: 8,
      marginBottom: 30,
      letterSpacing: 1,
    },

    section: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
      backgroundColor:
        "#0a0a0a",
      borderWidth: 1,
      borderColor: "#222",
      borderRadius: 12,
      padding: 18,
      marginBottom: 18,
    },

    sectionTitle: {
      color: "#d42b4e",
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 2,
      marginBottom: 18,
    },

    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        "#181818",
      gap: 16,
    },

    settingInfo: {
      flex: 1,
    },

    settingTitle: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },

    settingDescription: {
      color: "#666",
      fontSize: 11,
      marginTop: 5,
      lineHeight: 16,
    },

    inputWithUnit: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    input: {
      width: 75,
      height: 44,
      color: "#fff",
      backgroundColor:
        "#111",
      borderWidth: 1,
      borderColor: "#333",
      borderRadius: 8,
      paddingHorizontal: 10,
      textAlign: "center",
      fontSize: 14,
    },

    unitText: {
      color: "#777",
      fontSize: 12,
    },

    errorText: {
      color: "#ff6b6b",
      fontSize: 13,
      marginTop: 2,
      marginBottom: 8,
      textAlign: "center",
    },

    saveButton: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
      minHeight: 52,
      marginTop: 6,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 10,
      backgroundColor:
        "#d42b4e",
    },

    resetButton: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
      minHeight: 50,
      marginTop: 12,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 10,
      backgroundColor:
        "#222",
      borderWidth: 1,
      borderColor: "#333",
    },

    disabledButton: {
      opacity: 0.5,
    },

    buttonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },

    currentValues: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
      marginTop: 24,
      padding: 16,
      borderRadius: 10,
      backgroundColor:
        "#0a0a0a",
      borderWidth: 1,
      borderColor: "#1c1c1c",
    },

    currentValuesTitle: {
      color: "#aaa",
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 10,
    },

    currentValue: {
      color: "#666",
      fontSize: 12,
      marginBottom: 5,
    },
  });