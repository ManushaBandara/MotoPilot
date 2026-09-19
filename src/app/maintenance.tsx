import {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  createMaintenanceItem,
  completeMaintenanceItem,
  loadMaintenanceItems,
  MaintenanceItemWithStatus,
  MaintenanceStatus,
} from "../services/maintenanceService";

export default function MaintenanceScreen() {
  const [items, setItems] = useState<
    MaintenanceItemWithStatus[]
  >([]);

  const [currentOdometer, setCurrentOdometer] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [intervalKm, setIntervalKm] =
    useState("");

  const [lastCompletedKm, setLastCompletedKm] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadData = useCallback(
    async (odometerText?: string) => {
      const value =
        odometerText ?? currentOdometer;

      const odometer =
        Number(value);

      if (
        !Number.isFinite(odometer) ||
        odometer < 0
      ) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result =
          await loadMaintenanceItems(
            odometer
          );

        setItems(result);
      } catch (err) {
        console.error(
          "Maintenance: failed to load:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load maintenance."
        );
      } finally {
        setLoading(false);
      }
    },
    [currentOdometer]
  );

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  function handleOdometerChange(
    value: string
  ) {
    setCurrentOdometer(value);

    const odometer =
      Number(value);

    if (
      value.trim() !== "" &&
      Number.isFinite(odometer) &&
      odometer >= 0
    ) {
      void loadData(value);
    }
  }

  async function handleAddMaintenance() {
    const interval =
      intervalKm.trim() === ""
        ? null
        : Number(intervalKm);

    const lastCompleted =
      lastCompletedKm.trim() === ""
        ? null
        : Number(lastCompletedKm);

    try {
      setSaving(true);
      setError(null);

      await createMaintenanceItem({
        title,
        notes:
          notes.trim() || null,
        intervalKm: interval,
        lastCompletedKm:
          lastCompleted,
      });

      setTitle("");
      setNotes("");
      setIntervalKm("");
      setLastCompletedKm("");

      await loadData();

      Alert.alert(
        "Maintenance Added",
        "The maintenance item has been saved."
      );
    } catch (err) {
      console.error(
        "Maintenance: failed to add:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save maintenance."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleComplete(
    item: MaintenanceItemWithStatus
  ) {
    Alert.alert(
      "Complete Maintenance",
      `Mark "${item.title}" as completed at ${currentOdometer} km?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Complete",
          onPress: async () => {
            const odometer =
              Number(currentOdometer);

            if (
              !Number.isFinite(odometer) ||
              odometer < 0
            ) {
              setError(
                "Enter a valid current odometer first."
              );
              return;
            }

            try {
              setError(null);

              await completeMaintenanceItem(
                item,
                odometer
              );

              await loadData();

              Alert.alert(
                "Completed",
                `${item.title} has been marked as completed.`
              );
            } catch (err) {
              console.error(
                "Maintenance: failed to complete:",
                err
              );

              setError(
                err instanceof Error
                  ? err.message
                  : "Unable to complete maintenance."
              );
            }
          },
        },
      ]
    );
  }

  function getStatusLabel(
    status: MaintenanceStatus
  ): string {
    switch (status) {
      case "OVERDUE":
        return "OVERDUE";

      case "DUE":
        return "DUE SOON";

      case "COMPLETED":
        return "COMPLETED";

      default:
        return "UPCOMING";
    }
  }

  function getStatusStyle(
    status: MaintenanceStatus
  ) {
    switch (status) {
      case "OVERDUE":
        return styles.statusOverdue;

      case "DUE":
        return styles.statusDue;

      case "COMPLETED":
        return styles.statusCompleted;

      default:
        return styles.statusUpcoming;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ←
          </Text>
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            MAINTENANCE
          </Text>

          <Text style={styles.headerSubtitle}>
            SERVICE TRACKER
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Current Odometer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            CURRENT ODOMETER
          </Text>

          <TextInput
            value={currentOdometer}
            onChangeText={
              handleOdometerChange
            }
            placeholder="Enter current km"
            placeholderTextColor="#555555"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.helperText}>
            Used to calculate maintenance due status.
          </Text>
        </View>

        {/* Add Maintenance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ADD MAINTENANCE
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Maintenance title"
            placeholderTextColor="#555555"
            style={styles.input}
          />

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor="#555555"
            style={[
              styles.input,
              styles.notesInput,
            ]}
            multiline
          />

          <TextInput
            value={intervalKm}
            onChangeText={setIntervalKm}
            placeholder="Service interval in km"
            placeholderTextColor="#555555"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <TextInput
            value={lastCompletedKm}
            onChangeText={
              setLastCompletedKm
            }
            placeholder="Last completed at km (optional)"
            placeholderTextColor="#555555"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed &&
                styles.buttonPressed,
              saving &&
                styles.buttonDisabled,
            ]}
            onPress={
              handleAddMaintenance
            }
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator
                size="small"
                color="#ffffff"
              />
            ) : (
              <Text
                style={
                  styles.addButtonText
                }
              >
                ADD MAINTENANCE
              </Text>
            )}
          </Pressable>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {/* Maintenance List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            MAINTENANCE ITEMS
          </Text>

          {loading ? (
            <View
              style={
                styles.loadingContainer
              }
            >
              <ActivityIndicator
                size="small"
                color="#d42b4e"
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Loading maintenance...
              </Text>
            </View>
          ) : items.length === 0 ? (
            <View
              style={
                styles.emptyContainer
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                NO MAINTENANCE ITEMS
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Add your first service item above.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                style={styles.item}
              >
                <View
                  style={
                    styles.itemHeader
                  }
                >
                  <View
                    style={
                      styles.itemTitleContainer
                    }
                  >
                    <Text
                      style={
                        styles.itemTitle
                      }
                    >
                      {item.title}
                    </Text>

                    {item.notes && (
                      <Text
                        style={
                          styles.itemNotes
                        }
                      >
                        {item.notes}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.status,
                      getStatusStyle(
                        item.status
                      ),
                    ]}
                  >
                    {getStatusLabel(
                      item.status
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.itemDetails
                  }
                >
                  <View
                    style={
                      styles.detail
                    }
                  >
                    <Text
                      style={
                        styles.detailLabel
                      }
                    >
                      INTERVAL
                    </Text>

                    <Text
                      style={
                        styles.detailValue
                      }
                    >
                      {item.intervalKm !=
                      null
                        ? `${item.intervalKm.toLocaleString()} KM`
                        : "—"}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.detail
                    }
                  >
                    <Text
                      style={
                        styles.detailLabel
                      }
                    >
                      NEXT DUE
                    </Text>

                    <Text
                      style={
                        styles.detailValue
                      }
                    >
                      {item.nextDueKm !=
                      null
                        ? `${item.nextDueKm.toLocaleString()} KM`
                        : "—"}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.detail
                    }
                  >
                    <Text
                      style={
                        styles.detailLabel
                      }
                    >
                      REMAINING
                    </Text>

                    <Text
                      style={
                        styles.detailValue
                      }
                    >
                      {item.remainingKm !=
                      null
                        ? item.remainingKm < 0
                          ? `${Math.abs(
                              item.remainingKm
                            ).toLocaleString()} KM OVER`
                          : `${item.remainingKm.toLocaleString()} KM`
                        : "—"}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.completeButton,
                    pressed &&
                      styles.buttonPressed,
                  ]}
                  onPress={() =>
                    handleComplete(
                      item
                    )
                  }
                >
                  <Text
                    style={
                      styles.completeButtonText
                    }
                  >
                    MARK COMPLETED
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1c",
  },

  backButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    color: "#ffffff",
    fontSize: 20,
  },

  headerTitleContainer: {
    marginLeft: 14,
  },

  headerTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },

  headerSubtitle: {
    color: "#555555",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 3,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 8,
    color: "#ffffff",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
  },

  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  helperText: {
    color: "#444444",
    fontSize: 9,
    lineHeight: 14,
  },

  addButton: {
    height: 48,
    backgroundColor: "#d42b4e",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  addButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  errorContainer: {
    backgroundColor: "#16090c",
    borderWidth: 1,
    borderColor: "#4a1722",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },

  errorText: {
    color: "#ff6b7f",
    fontSize: 10,
    lineHeight: 16,
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },

  loadingText: {
    color: "#555555",
    fontSize: 10,
    marginTop: 10,
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderRadius: 8,
  },

  emptyTitle: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  emptyText: {
    color: "#444444",
    fontSize: 9,
    marginTop: 7,
  },

  item: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },

  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  itemTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },

  itemTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },

  itemNotes: {
    color: "#555555",
    fontSize: 10,
    marginTop: 5,
    lineHeight: 15,
  },

  status: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  statusUpcoming: {
    color: "#777777",
  },

  statusDue: {
    color: "#e0a82e",
  },

  statusOverdue: {
    color: "#ff4d4d",
  },

  statusCompleted: {
    color: "#777777",
  },

  itemDetails: {
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#171717",
  },

  detail: {
    flex: 1,
  },

  detailLabel: {
    color: "#444444",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },

  detailValue: {
    color: "#cccccc",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 5,
  },

  completeButton: {
    height: 40,
    borderWidth: 1,
    borderColor: "#292929",
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },

  completeButtonText: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
});