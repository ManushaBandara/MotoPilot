import {
  StyleSheet,
  Text,
  View,
  Pressable
} from "react-native";

export default function MediaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        MEDIA
      </Text>

      <Text style={styles.subtitle}>
        Media controls coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
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
});