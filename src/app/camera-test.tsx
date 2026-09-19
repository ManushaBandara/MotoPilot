import {
  CameraView,
} from "expo-camera";

import {
  useVideoPlayer,
  VideoView,
} from "expo-video";

import {
  File,
} from "expo-file-system";

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useState,
} from "react";

import {
  useDashcam,
} from "../hooks/useDashcam";

import {
  useLocation,
} from "../hooks/useLocation";

import {
  deleteDashcamClip,
} from "../services/database";

import {
  exportDashcamClipToGallery,
} from "../services/camera/dashcamGallery";

import type {
  DashcamClip,
} from "../services/camera/dashcamTypes";

/* ============================================================
   HELPERS
   ============================================================ */

function formatDuration(
  seconds: number
): string {
  const totalSeconds =
    Math.floor(seconds);

  const minutes =
    Math.floor(totalSeconds / 60);

  const remainingSeconds =
    totalSeconds % 60;

  return `${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function formatFileSize(
  bytes: number
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes =
    bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes =
    kilobytes / 1024;

  if (megabytes < 1024) {
    return `${megabytes.toFixed(1)} MB`;
  }

  const gigabytes =
    megabytes / 1024;

  return `${gigabytes.toFixed(2)} GB`;
}

function formatDate(
  dateString: string
): string {
  const date =
    new Date(dateString);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateString;
  }

  return date.toLocaleString();
}

/* ============================================================
   SAVED CLIP PLAYER
   ============================================================ */

function SavedClipPlayer({
  clip,
  onClose,
}: {
  clip: DashcamClip;
  onClose: () => void;
}) {
  const player =
    useVideoPlayer(
      clip.fileUri,
      (player) => {
        player.loop = false;
      }
    );

  return (
    <View
      style={
        styles.playerContainer
      }
    >
      <VideoView
        player={player}
        style={styles.videoPlayer}
        nativeControls
        contentFit="contain"
      />

      <View
        style={styles.playerInfo}
      >
        <Text
          style={styles.playerTitle}
        >
          Saved Clip
        </Text>

        <Text
          style={
            styles.playerDetails
          }
        >
          {formatDate(
            clip.startedAt
          )}
        </Text>

        <Text
          style={
            styles.playerDetails
          }
        >
          Duration:{" "}
          {formatDuration(
            clip.durationSeconds
          )}
        </Text>

        <Text
          style={
            styles.playerDetails
          }
        >
          Size:{" "}
          {formatFileSize(
            clip.fileSizeBytes
          )}
        </Text>
      </View>

      <Pressable
        style={
          styles.closePlayerButton
        }
        onPress={onClose}
      >
        <Text
          style={styles.buttonText}
        >
          Close Preview
        </Text>
      </Pressable>
    </View>
  );
}

/* ============================================================
   CAMERA TEST SCREEN
   ============================================================ */

export default function CameraTestScreen() {
  const {
    location,
  } = useLocation();

  const {
    cameraRef,

    permission,
    requestPermission,

    status,
    error,

    rollingClips,
    clips,

    recordingDurationSeconds,

    isRecording,
    isStarting,
    isStopping,

    startRecording,
    stopRecording,

    quickSave,
  } = useDashcam({
    location,
  });

  const [
    selectedClip,
    setSelectedClip,
  ] = useState<DashcamClip | null>(
    null
  );

  const [
    deletedClipIds,
    setDeletedClipIds,
  ] = useState<Set<string>>(
    new Set()
  );

  /* ============================================================
     SAVED CLIPS
     ============================================================ */

  const savedClips =
    clips.filter(
      (clip) =>
        clip.status === "SAVED" &&
        !deletedClipIds.has(
          clip.id
        )
    );

  /* ============================================================
     DELETE SAVED CLIP
     ============================================================ */

  const deleteSavedClip = (
    clip: DashcamClip
  ) => {
    Alert.alert(
      "Delete saved clip?",
      "This video will be permanently deleted from MotoPilot.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const file =
                new File(
                  clip.fileUri
                );

              if (file.exists) {
                file.delete();
              }

              await deleteDashcamClip(
                clip.id
              );

              setDeletedClipIds(
                (previous) => {
                  const updated =
                    new Set(
                      previous
                    );

                  updated.add(
                    clip.id
                  );

                  return updated;
                }
              );

              if (
                selectedClip?.id ===
                clip.id
              ) {
                setSelectedClip(
                  null
                );
              }

              console.log(
                "Dashcam: saved clip deleted:",
                clip.id
              );
            } catch (err) {
              console.error(
                "Dashcam: failed to delete saved clip:",
                err
              );

              Alert.alert(
                "Delete failed",
                err instanceof Error
                  ? err.message
                  : "Failed to delete the saved clip."
              );
            }
          },
        },
      ]
    );
  };

  /* ============================================================
     EXPORT SAVED CLIP TO GALLERY
     ============================================================ */

  const exportSavedClip = (
    clip: DashcamClip
  ) => {
    Alert.alert(
      "Export to Gallery?",
      "A copy of this video will be saved to the MotoPilot album in your Gallery.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Export",
          onPress: async () => {
            try {
              await exportDashcamClipToGallery(
                clip.fileUri
              );

              Alert.alert(
                "Export complete",
                "The clip has been copied to the MotoPilot album in your Gallery."
              );
            } catch (err) {
              console.error(
                "Dashcam: failed to export clip:",
                err
              );

              Alert.alert(
                "Export failed",
                err instanceof Error
                  ? err.message
                  : "Failed to export the clip to the Gallery."
              );
            }
          },
        },
      ]
    );
  };

  /* ============================================================
     PERMISSION CHECKING
     ============================================================ */

  if (!permission) {
    return (
      <View
        style={styles.center}
      >
        <Text
          style={styles.text}
        >
          Checking camera permission...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={styles.center}
      >
        <Text
          style={styles.title}
        >
          Camera Permission
        </Text>

        <Text
          style={styles.text}
        >
          MotoPilot needs camera access
          for dashcam recording.
        </Text>

        <Pressable
          style={styles.button}
          onPress={
            requestPermission
          }
        >
          <Text
            style={styles.buttonText}
          >
            Allow Camera
          </Text>
        </Pressable>
      </View>
    );
  }

  /* ============================================================
     VIDEO PLAYER
     ============================================================ */

  if (selectedClip) {
    return (
      <SavedClipPlayer
        clip={selectedClip}
        onClose={() =>
          setSelectedClip(null)
        }
      />
    );
  }

  /* ============================================================
     MAIN CAMERA VIEW
     ============================================================ */

  return (
    <View
      style={styles.container}
    >
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="video"
      />

      <View
        style={styles.overlay}
      >
        {/* ======================================================
            STATUS
            ====================================================== */}

        <View
          style={styles.statusBar}
        >
          <Text
            style={styles.statusText}
          >
            {status}
          </Text>

          {isRecording && (
            <Text
              style={
                styles.recordingText
              }
            >
              ● REC
            </Text>
          )}
        </View>

        {/* ======================================================
            RECORDING TIMER
            ====================================================== */}

        {isRecording && (
          <View
            style={
              styles.durationContainer
            }
          >
            <Text
              style={styles.duration}
            >
              {formatDuration(
                recordingDurationSeconds
              )}
            </Text>
          </View>
        )}

        {/* ======================================================
            BOTTOM AREA
            ====================================================== */}

        <View
          style={styles.bottomArea}
        >
          {/* ====================================================
              CONTROLS
              ==================================================== */}

          <View
            style={styles.controls}
          >
            {!isRecording &&
            !isStarting &&
            !isStopping ? (
              <Pressable
                style={
                  styles.recordButton
                }
                onPress={
                  startRecording
                }
              >
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  Start Dashcam
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.stopButton,
                  isStopping &&
                    styles.disabledButton,
                ]}
                onPress={
                  stopRecording
                }
                disabled={
                  isStopping
                }
              >
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  {isStopping
                    ? "Stopping..."
                    : "Stop Dashcam"}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.saveButton,
                !rollingClips.length &&
                  styles.disabledButton,
              ]}
              onPress={quickSave}
              disabled={
                !rollingClips.length
              }
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                Save Latest Clip
              </Text>
            </Pressable>
          </View>

          {/* ====================================================
              STATUS INFORMATION
              ==================================================== */}

          <View
            style={styles.info}
          >
            <Text
              style={styles.infoText}
            >
              Rolling clips:{" "}
              {rollingClips.length}
            </Text>

            <Text
              style={styles.infoText}
            >
              Saved clips:{" "}
              {savedClips.length}
            </Text>

            <Text
              style={styles.infoText}
            >
              Status: {status}
            </Text>

            {error && (
              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>
            )}
          </View>

          {/* ====================================================
              SAVED CLIPS
              ==================================================== */}

          <View
            style={
              styles.savedClipsContainer
            }
          >
            <Text
              style={
                styles.savedClipsTitle
              }
            >
              Saved Clips
            </Text>

            {savedClips.length ===
            0 ? (
              <Text
                style={
                  styles.emptyText
                }
              >
                No saved clips yet.
              </Text>
            ) : (
              <ScrollView
                style={
                  styles.savedClipsList
                }
                contentContainerStyle={
                  styles.savedClipsContent
                }
              >
                {savedClips.map(
                  (clip) => (
                    <View
                      key={clip.id}
                      style={
                        styles.clipItem
                      }
                    >
                      <View
                        style={
                          styles.clipDetails
                        }
                      >
                        <Text
                          style={
                            styles.clipTitle
                          }
                        >
                          Dashcam Clip
                        </Text>

                        <Text
                          style={
                            styles.clipText
                          }
                        >
                          {formatDate(
                            clip.startedAt
                          )}
                        </Text>

                        <Text
                          style={
                            styles.clipText
                          }
                        >
                          Duration:{" "}
                          {formatDuration(
                            clip.durationSeconds
                          )}
                        </Text>

                        <Text
                          style={
                            styles.clipText
                          }
                        >
                          Size:{" "}
                          {formatFileSize(
                            clip.fileSizeBytes
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.clipActions
                        }
                      >
                        <Pressable
                          style={
                            styles.playButton
                          }
                          onPress={() =>
                            setSelectedClip(
                              clip
                            )
                          }
                        >
                          <Text
                            style={
                              styles.buttonText
                            }
                          >
                            Play
                          </Text>
                        </Pressable>

                        <Pressable
                          style={
                            styles.exportButton
                          }
                          onPress={() =>
                            exportSavedClip(
                              clip
                            )
                          }
                        >
                          <Text
                            style={
                              styles.buttonText
                            }
                          >
                            Export
                          </Text>
                        </Pressable>

                        <Pressable
                          style={
                            styles.deleteButton
                          }
                          onPress={() =>
                            deleteSavedClip(
                              clip
                            )
                          }
                        >
                          <Text
                            style={
                              styles.buttonText
                            }
                          >
                            Delete
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000",
    },

    camera: {
      flex: 1,
    },

    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent:
        "space-between",
      padding: 20,
      paddingTop: 55,
      paddingBottom: 35,
    },

    statusBar: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    statusText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: 1,
    },

    recordingText: {
      color: "#ff3333",
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 1,
    },

    durationContainer: {
      alignItems: "center",
    },

    duration: {
      color: "#fff",
      fontSize: 32,
      fontWeight: "700",
      letterSpacing: 2,
    },

    bottomArea: {
      gap: 12,
    },

    controls: {
      gap: 12,
    },

    recordButton: {
      minHeight: 54,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 12,
      backgroundColor:
        "#d42b4e",
    },

    stopButton: {
      minHeight: 54,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 12,
      backgroundColor:
        "#444",
    },

    saveButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 12,
      backgroundColor:
        "rgba(0,0,0,0.75)",
      borderWidth: 1,
      borderColor: "#555",
    },

    disabledButton: {
      opacity: 0.45,
    },

    buttonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },

    info: {
      padding: 12,
      borderRadius: 10,
      backgroundColor:
        "rgba(0,0,0,0.7)",
    },

    infoText: {
      color: "#ddd",
      fontSize: 13,
      marginBottom: 4,
    },

    errorText: {
      color: "#ff6b6b",
      fontSize: 13,
      marginTop: 6,
    },

    savedClipsContainer: {
      maxHeight: 220,
      padding: 12,
      borderRadius: 12,
      backgroundColor:
        "rgba(0,0,0,0.82)",
    },

    savedClipsTitle: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 8,
    },

    savedClipsList: {
      maxHeight: 170,
    },

    savedClipsContent: {
      gap: 8,
    },

    emptyText: {
      color: "#aaa",
      fontSize: 13,
    },

    clipItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      padding: 10,
      borderRadius: 10,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    clipDetails: {
      flex: 1,
      marginRight: 10,
    },

    clipTitle: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 3,
    },

    clipText: {
      color: "#bbb",
      fontSize: 11,
      marginBottom: 2,
    },

    clipActions: {
      gap: 8,
    },

    playButton: {
      minWidth: 70,
      minHeight: 40,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 8,
      backgroundColor:
        "#d42b4e",
    },

    exportButton: {
      minWidth: 70,
      minHeight: 40,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 8,
      backgroundColor:
        "#333",
    },

    deleteButton: {
      minWidth: 70,
      minHeight: 40,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 8,
      backgroundColor:
        "#552222",
    },

    center: {
      flex: 1,
      backgroundColor:
        "#050505",
      alignItems: "center",
      justifyContent:
        "center",
      padding: 24,
    },

    title: {
      color: "#fff",
      fontSize: 26,
      fontWeight: "700",
      marginBottom: 16,
    },

    text: {
      color: "#ccc",
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 24,
    },

    button: {
      minHeight: 52,
      paddingHorizontal: 28,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 12,
      backgroundColor:
        "#d42b4e",
    },

    playerContainer: {
      flex: 1,
      backgroundColor:
        "#000",
      justifyContent:
        "center",
      padding: 20,
    },

    videoPlayer: {
      width: "100%",
      height: 300,
      backgroundColor:
        "#050505",
    },

    playerInfo: {
      marginTop: 20,
      padding: 14,
      borderRadius: 12,
      backgroundColor:
        "#111",
    },

    playerTitle: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 6,
    },

    playerDetails: {
      color: "#aaa",
      fontSize: 13,
      marginBottom: 3,
    },

    closePlayerButton: {
      marginTop: 16,
      minHeight: 50,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 12,
      backgroundColor:
        "#333",
    },
  });