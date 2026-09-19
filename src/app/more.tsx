import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        MORE
      </Text>

      <Text style={styles.subtitle}>
        Settings and system controls
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() =>
          router.push("/maintenance")
        }
      >
        <View>
          <Text style={styles.buttonTitle}>
            MAINTENANCE
          </Text>

          <Text style={styles.buttonSubtitle}>
            Service and maintenance tracker
          </Text>
        </View>

        <Text style={styles.arrow}>
          →
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() =>
          router.push("/map-test")
        }
      >
        <View>
          <Text style={styles.buttonTitle}>
            MAP TEST
          </Text>

          <Text style={styles.buttonSubtitle}>
            Test Google Maps inside MotoPilot
          </Text>
        </View>

        <Text style={styles.arrow}>
          →
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() =>
          router.push("/settings")
        }
      >
        <View>
          <Text style={styles.buttonTitle}>
            SETTINGS
          </Text>

          <Text style={styles.buttonSubtitle}>
            MotoPilot configuration
          </Text>
        </View>

        <Text style={styles.arrow}>
          →
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 3,
  },

  subtitle: {
    color: "#666666",
    fontSize: 12,
    marginTop: 10,
    letterSpacing: 1,
  },

  actionButton: {
    width: "100%",
    maxWidth: 420,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  buttonPressed: {
    opacity: 0.7,
  },

  buttonTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  buttonSubtitle: {
    color: "#555555",
    fontSize: 10,
    marginTop: 5,
  },

  arrow: {
    color: "#d42b4e",
    fontSize: 22,
    fontWeight: "600",
  },
});