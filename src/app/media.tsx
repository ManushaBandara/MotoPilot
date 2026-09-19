import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useMediaController } from "../hooks/useMediaController";

export default function MediaTestScreen() {
  const {
    mediaAccessEnabled,
    activeMedia,
    primaryMedia,
    loading,
    error,
    refreshMedia,
    play,
    pause,
    next,
    previous,
    forward,
    backward,
    openAccessSettings,
  } = useMediaController();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>
        MotoPilot Media Test
      </Text>

      <Text style={styles.status}>
        Access:{" "}
        {mediaAccessEnabled
          ? "ENABLED"
          : "DISABLED"}
      </Text>

      {!mediaAccessEnabled && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={openAccessSettings}
        >
          <Text style={styles.buttonText}>
            Enable Media Access
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={refreshMedia}
      >
        <Text style={styles.buttonText}>
          Refresh
        </Text>
      </TouchableOpacity>

      {loading && (
        <Text style={styles.info}>
          Loading media...
        </Text>
      )}

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {primaryMedia ? (
        <View style={styles.mediaCard}>
          <Text style={styles.sectionTitle}>
            Current Media
          </Text>

          <Text style={styles.mediaTitle}>
            {primaryMedia.title ||
              "Unknown title"}
          </Text>

          <Text style={styles.mediaArtist}>
            {primaryMedia.artist ||
              "Unknown artist"}
          </Text>

          <Text style={styles.mediaAlbum}>
            {primaryMedia.album ||
              "Unknown album"}
          </Text>

          <Text style={styles.detail}>
            App:{" "}
            {primaryMedia.packageName}
          </Text>

          <Text style={styles.detail}>
            State:{" "}
            {primaryMedia.playbackState}
          </Text>

          <Text style={styles.detail}>
            Position:{" "}
            {formatMilliseconds(
              primaryMedia.positionMs
            )}
          </Text>

          <Text style={styles.detail}>
            Duration:{" "}
            {primaryMedia.durationMs
              ? formatMilliseconds(
                  primaryMedia.durationMs
                )
              : "Unknown"}
          </Text>
        </View>
      ) : (
        <View style={styles.mediaCard}>
          <Text style={styles.info}>
            No active media session found.
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        Controls
      </Text>

      <View style={styles.controls}>
        <ControlButton
          label="Previous"
          onPress={previous}
        />

        <ControlButton
          label="Rewind"
          onPress={backward}
        />

        <ControlButton
          label="Play"
          onPress={play}
        />

        <ControlButton
          label="Pause"
          onPress={pause}
        />

        <ControlButton
          label="Forward"
          onPress={forward}
        />

        <ControlButton
          label="Next"
          onPress={next}
        />
      </View>

      <Text style={styles.sectionTitle}>
        Active Sessions
      </Text>

      {activeMedia.length === 0 ? (
        <Text style={styles.info}>
          No active sessions.
        </Text>
      ) : (
        activeMedia.map((media) => (
          <View
            key={media.packageName}
            style={styles.session}
          >
            <Text style={styles.sessionTitle}>
              {media.title ||
                "Unknown title"}
            </Text>

            <Text style={styles.detail}>
              {media.artist ||
                "Unknown artist"}
            </Text>

            <Text style={styles.detail}>
              {media.packageName}
            </Text>

            <Text style={styles.detail}>
              {media.playbackState}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ControlButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.controlButton}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function formatMilliseconds(
  milliseconds: number
): string {
  const totalSeconds =
    Math.floor(milliseconds / 1000);

  const minutes =
    Math.floor(totalSeconds / 60);

  const seconds =
    totalSeconds % 60;

  return `${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: "#111",
    flexGrow: 1,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
  },

  status: {
    fontSize: 16,
    color: "#ccc",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginTop: 8,
  },

  mediaCard: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: "#222",
    gap: 8,
  },

  mediaTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },

  mediaArtist: {
    fontSize: 16,
    color: "#ddd",
  },

  mediaAlbum: {
    fontSize: 14,
    color: "#aaa",
  },

  detail: {
    fontSize: 13,
    color: "#aaa",
  },

  info: {
    color: "#aaa",
    fontSize: 14,
  },

  error: {
    color: "#ff5555",
    fontSize: 14,
  },

  primaryButton: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },

  secondaryButton: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#333",
    alignItems: "center",
  },

  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#333",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },

  session: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#1c1c1c",
    gap: 4,
  },

  sessionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});