import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { WebView } from "react-native-webview";

import { useNavigationSession } from "../hooks/useNavigationSession";

import {
  calculateRoute,
} from "../services/navigation/routesService";

import {
  searchPlaces,
} from "../services/navigation/placesService";

import type {
  Destination,
  NavigationStep,
} from "../services/navigation/navigationTypes";

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const DEFAULT_LATITUDE = 7.8731;
const DEFAULT_LONGITUDE = 80.7718;

type GpsLocation = {
  latitude: number;
  longitude: number;
};

function createMapHtml(
  apiKey: string
) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <style>
    html,
    body,
    #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #050505;
    }

    body {
      overflow: hidden;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script>
    let map = null;
    let currentMarker = null;
    let destinationMarker = null;
    let routePolyline = null;

    let currentLocation = {
      latitude: ${DEFAULT_LATITUDE},
      longitude: ${DEFAULT_LONGITUDE}
    };

    function initMap() {
      map = new google.maps.Map(
        document.getElementById("map"),
        {
          center: {
            lat: currentLocation.latitude,
            lng: currentLocation.longitude
          },

          zoom: 16,

          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,

          zoomControl: true,

          gestureHandling: "greedy",

          styles: [
            {
              elementType: "geometry",
              stylers: [
                {
                  color: "#111111"
                }
              ]
            },
            {
              elementType: "labels.text.fill",
              stylers: [
                {
                  color: "#aaaaaa"
                }
              ]
            },
            {
              elementType: "labels.text.stroke",
              stylers: [
                {
                  color: "#111111"
                }
              ]
            },
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [
                {
                  color: "#292929"
                }
              ]
            },
            {
              featureType: "road",
              elementType: "geometry.stroke",
              stylers: [
                {
                  color: "#151515"
                }
              ]
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [
                {
                  color: "#050505"
                }
              ]
            }
          ]
        }
      );

      currentMarker =
        new google.maps.Marker({
          position: {
            lat: currentLocation.latitude,
            lng: currentLocation.longitude
          },

          map,

          title: "Current location",

          icon: {
            path: google.maps.SymbolPath.CIRCLE,

            scale: 8,

            fillColor: "#d42b4e",

            fillOpacity: 1,

            strokeColor: "#ffffff",

            strokeWeight: 2
          }
        });

      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "MAP_READY"
        })
      );
    }

    window.updateLocation = function(
      latitude,
      longitude
    ) {
      currentLocation = {
        latitude,
        longitude
      };

      if (!map) {
        return;
      }

      const position = {
        lat: latitude,
        lng: longitude
      };

      if (currentMarker) {
        currentMarker.setPosition(
          position
        );
      }
    };

    window.centerOnLocation = function() {
      if (!map) {
        return;
      }

      map.panTo({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude
      });
    };

    window.setDestination = function(
      latitude,
      longitude,
      name
    ) {
      if (!map) {
        return;
      }

      const position = {
        lat: latitude,
        lng: longitude
      };

      if (destinationMarker) {
        destinationMarker.setMap(null);
      }

      destinationMarker =
        new google.maps.Marker({
          position,
          map,

          title: name || "Destination",

          icon: {
            path: google.maps.SymbolPath.CIRCLE,

            scale: 7,

            fillColor: "#ffffff",

            fillOpacity: 1,

            strokeColor: "#d42b4e",

            strokeWeight: 3
          }
        });

      map.panTo(position);
    };

    window.drawRoute = function(
      encodedPolyline
    ) {
      if (!map) {
        return;
      }

      if (routePolyline) {
        routePolyline.setMap(null);
      }

      const path =
        google.maps.geometry.encoding.decodePath(
          encodedPolyline
        );

      routePolyline =
        new google.maps.Polyline({
          path,

          geodesic: true,

          strokeColor: "#d42b4e",

          strokeOpacity: 0.9,

          strokeWeight: 6,

          map
        });

      const bounds =
        new google.maps.LatLngBounds();

      path.forEach((point) => {
        bounds.extend(point);
      });

      if (currentMarker) {
        bounds.extend(
          currentMarker.getPosition()
        );
      }

      if (destinationMarker) {
        bounds.extend(
          destinationMarker.getPosition()
        );
      }

      map.fitBounds(bounds, 70);
    };

    window.clearNavigation = function() {
      if (routePolyline) {
        routePolyline.setMap(null);
        routePolyline = null;
      }

      if (destinationMarker) {
        destinationMarker.setMap(null);
        destinationMarker = null;
      }
    };
  </script>

  <script
    src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=initMap"
    async
    defer
  ></script>
</body>
</html>
`;
}

function formatDistance(
  meters: number
): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(
    meters / 1000
  ).toFixed(1)} km`;
}

function formatDuration(
  seconds: number
): string {
  const totalMinutes =
    Math.max(
      0,
      Math.round(seconds / 60)
    );

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours =
    Math.floor(totalMinutes / 60);

  const minutes =
    totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

/**
 * Convert Google's maneuver value into
 * a simple visual navigation symbol.
 */
function getManeuverSymbol(
  maneuver: string
): string {
  const value =
    maneuver.toUpperCase();

  if (
    value.includes("UTURN") ||
    value.includes("U_TURN")
  ) {
    return "↶";
  }

  if (
    value.includes("LEFT")
  ) {
    return "↰";
  }

  if (
    value.includes("RIGHT")
  ) {
    return "↱";
  }

  if (
    value.includes("ROUNDABOUT")
  ) {
    return "↻";
  }

  if (
    value.includes("MERGE")
  ) {
    return "⇢";
  }

  if (
    value.includes("RAMP")
  ) {
    return "↗";
  }

  if (
    value.includes("FORK")
  ) {
    return "⑂";
  }

  return "↑";
}

/**
 * Convert Google's maneuver value into
 * a short display label.
 */
function getManeuverLabel(
  maneuver: string
): string {
  const value =
    maneuver.toUpperCase();

  if (
    value.includes("UTURN") ||
    value.includes("U_TURN")
  ) {
    return "U-TURN";
  }

  if (
    value.includes("LEFT")
  ) {
    return "TURN LEFT";
  }

  if (
    value.includes("RIGHT")
  ) {
    return "TURN RIGHT";
  }

  if (
    value.includes("ROUNDABOUT")
  ) {
    return "ROUNDABOUT";
  }

  if (
    value.includes("MERGE")
  ) {
    return "MERGE";
  }

  if (
    value.includes("RAMP")
  ) {
    return "RAMP";
  }

  if (
    value.includes("FORK")
  ) {
    return "ROAD FORK";
  }

  return "CONTINUE";
}

/**
 * Convert the maneuver phase into
 * a compact display label.
 */
function getManeuverPhaseLabel(
  phase: "FAR" | "APPROACHING" | "IMMINENT" | "PASSED"
): string {
  switch (phase) {
    case "APPROACHING":
      return "APPROACHING";

    case "IMMINENT":
      return "TURN NOW";

    case "PASSED":
      return "PASSED";

    case "FAR":
    default:
      return "UPCOMING";
  }
}

/**
 * Create a compact instruction suitable
 * for the navigation display.
 */
function formatInstruction(
  step: NavigationStep
): string {
  const instruction =
    step.instruction.trim();

  if (!instruction) {
    return "Continue on route";
  }

  return instruction;
}

export default function NavigationScreen() {
  const webViewRef =
    useRef<WebView>(null);

  const {
  status,
  destination,
  remainingDistanceMeters,
  remainingDurationSeconds,
  progressPercent,
  location,
  offRoute,
  speedKmh,
  gpsError,
  navigationError,
  currentStep,
  distanceToNextManeuverMeters,
  maneuverPhase,
  startNavigation,
  stopNavigation,
} = useNavigationSession();
  const [searchText, setSearchText] =
    useState("");

  const [searching, setSearching] =
    useState(false);

  const [routing, setRouting] =
    useState(false);

  const [searchError, setSearchError] =
    useState<string | null>(null);

  const [searchResults, setSearchResults] =
    useState<Destination[]>([]);

  const [mapReady, setMapReady] =
    useState(false);

  /**
   * Send the latest raw native GPS
   * position to the Google Maps WebView.
   */
  useEffect(() => {
    if (
      !mapReady ||
      !location
    ) {
      return;
    }

    sendLocationToMap({
      latitude:
        location.latitude,

      longitude:
        location.longitude,
    });
  }, [
    location,
    mapReady,
  ]);

  function sendLocationToMap(
    gpsLocation: GpsLocation
  ) {
    webViewRef.current?.injectJavaScript(`
      if (
        typeof window.updateLocation === "function"
      ) {
        window.updateLocation(
          ${gpsLocation.latitude},
          ${gpsLocation.longitude}
        );
      }

      true;
    `);
  }

  function showDestinationOnMap(
    target: Destination
  ) {
    webViewRef.current?.injectJavaScript(`
      if (
        typeof window.setDestination === "function"
      ) {
        window.setDestination(
          ${target.latitude},
          ${target.longitude},
          ${JSON.stringify(target.name)}
        );
      }

      true;
    `);
  }

  function drawRouteOnMap(
    encodedPolyline: string
  ) {
    webViewRef.current?.injectJavaScript(`
      if (
        typeof window.drawRoute === "function"
      ) {
        window.drawRoute(
          ${JSON.stringify(encodedPolyline)}
        );
      }

      true;
    `);
  }

  function centerMapOnLocation() {
    webViewRef.current?.injectJavaScript(`
      if (
        typeof window.centerOnLocation === "function"
      ) {
        window.centerOnLocation();
      }

      true;
    `);
  }

  async function searchDestination() {
    const query =
      searchText.trim();

    if (!query) {
      setSearchError(
        "Enter a destination first."
      );

      return;
    }

    /**
     * Use the raw native GPS location.
     */
    if (!location) {
      setSearchError(
        "Waiting for GPS location."
      );

      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const results =
        await searchPlaces(
          query,
          location.latitude,
          location.longitude
        );

      if (results.length === 0) {
        setSearchError(
          "No destinations found."
        );

        return;
      }

      setSearchResults(results);
    } catch (err) {
      console.error(
        "Destination search failed:",
        err
      );

      setSearchError(
        err instanceof Error
          ? err.message
          : "Unable to search destinations."
      );
    } finally {
      setSearching(false);
    }
  }

  async function selectDestination(
    target: Destination
  ) {
    /**
     * Use raw native GPS here as well.
     */
    if (!location) {
      setSearchError(
        "Waiting for GPS location."
      );

      return;
    }

    setSearchResults([]);
    setSearchText(target.name);
    setSearchError(null);

    showDestinationOnMap(target);

    setRouting(true);

    try {
      const calculatedRoute =
        await calculateRoute({
          origin: {
            latitude:
              location.latitude,

            longitude:
              location.longitude,
          },

          destination: {
            latitude:
              target.latitude,

            longitude:
              target.longitude,
          },
        });

      drawRouteOnMap(
        calculatedRoute.encodedPolyline
      );

      const started =
        startNavigation(
          target,
          calculatedRoute
        );

      if (!started) {
        setSearchError(
          "Unable to start navigation."
        );
      }
    } catch (err) {
      console.error(
        "Route calculation failed:",
        err
      );

      setSearchError(
        err instanceof Error
          ? err.message
          : "Unable to calculate route."
      );
    } finally {
      setRouting(false);
    }
  }

  function handleStopNavigation() {
    stopNavigation();

    webViewRef.current?.injectJavaScript(`
      if (
        typeof window.clearNavigation === "function"
      ) {
        window.clearNavigation();
      }

      true;
    `);

    setSearchResults([]);
    setSearchError(null);
  }

  const gpsStatus = gpsError
    ? "GPS ERROR"
    : location
      ? "GPS READY"
      : "SEARCHING FOR GPS";

  const isNavigating =
    status === "NAVIGATING";

  const isRerouting =
    status === "REROUTING";

  const hasArrived =
    status === "ARRIVED";

  const maneuverSymbol =
    currentStep
      ? getManeuverSymbol(
          currentStep.maneuver
        )
      : "↑";

  const maneuverLabel =
    currentStep
      ? getManeuverLabel(
          currentStep.maneuver
        )
      : "CONTINUE";

  const maneuverPhaseLabel =
  getManeuverPhaseLabel(
    maneuverPhase
  );

  const maneuverDistance =
    formatDistance(
      distanceToNextManeuverMeters
    );

  const maneuverInstruction =
    currentStep
      ? formatInstruction(
          currentStep
        )
      : "Continue on route";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (
              status !== "IDLE" &&
              status !== "ARRIVED"
            ) {
              handleStopNavigation();
            }

            router.back();
          }}
        >
          <Text style={styles.backText}>
            ‹
          </Text>

          <Text style={styles.backLabel}>
            BACK
          </Text>
        </Pressable>

        <View
          style={
            styles.headerTitleContainer
          }
        >
          <Text style={styles.title}>
            NAVIGATION
          </Text>

          <Text style={styles.subtitle}>
            ONLINE NAVIGATION
          </Text>
        </View>
      </View>

      {/* GPS status */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusDot,

            gpsError
              ? styles.statusError
              : location
                ? styles.statusReady
                : styles.statusSearching,
          ]}
        />

        <Text style={styles.statusText}>
          {gpsStatus}
        </Text>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{
            html: GOOGLE_MAPS_API_KEY
              ? createMapHtml(
                  GOOGLE_MAPS_API_KEY
                )
              : "<html><body><h3>Google Maps API key is missing.</h3></body></html>",
          }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={[
            "*",
          ]}
          onMessage={(event) => {
            try {
              const message =
                JSON.parse(
                  event.nativeEvent.data
                );

              if (
                message.type ===
                "MAP_READY"
              ) {
                setMapReady(true);
              }
            } catch {
              // Ignore non-navigation messages.
            }
          }}
          onError={(event) => {
            console.error(
              "Navigation WebView error:",
              event.nativeEvent
            );
          }}
          style={styles.map}
        />

        <Pressable
          style={styles.centerButton}
          onPress={
            centerMapOnLocation
          }
        >
          <Text
            style={
              styles.centerButtonText
            }
          >
            ◎
          </Text>
        </Pressable>
      </View>

      {/* Active navigation information */}
      {(isNavigating ||
        isRerouting ||
        hasArrived) && (
        <View
          style={
            styles.navigationPanel
          }
        >
          {/* Visual turn-by-turn guidance */}
          {!hasArrived && (
            <View
              style={
                styles.maneuverContainer
              }
            >
              <View
                style={
                  styles.maneuverIconContainer
                }
              >
                <Text
                  style={
                    styles.maneuverIcon
                  }
                >
                  {maneuverSymbol}
                </Text>
              </View>

              <View
                style={
                  styles.maneuverContent
                }
              >
                <View
                  style={
                    styles.maneuverTopRow
                  }
                >
                  <View
                    style={
                      styles.maneuverLabelContainer
                    }
                  >
                    <Text
                      style={
                        styles.maneuverLabel
                      }
                    >
                      {maneuverLabel}
                    </Text>

                    <Text
                      style={
                        styles.maneuverPhase
                      }
                    >
                      {maneuverPhase}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.maneuverDistance
                    }
                  >
                    {maneuverDistance}
                  </Text>
                </View>

                <Text
                  style={
                    styles.maneuverInstruction
                  }
                  numberOfLines={2}
                >
                  {maneuverInstruction}
                </Text>
              </View>
            </View>
          )}

          <View
            style={
              styles.navigationStatusRow
            }
          >
            <View>
              <Text
                style={
                  styles.destinationLabel
                }
              >
                DESTINATION
              </Text>

              <Text
                style={
                  styles.destinationName
                }
                numberOfLines={1}
              >
                {destination?.name ??
                  "--"}
              </Text>
            </View>

            <Text
              style={[
                styles.navigationStatus,
                isRerouting &&
                  styles.reroutingText,
                hasArrived &&
                  styles.arrivedText,
              ]}
            >
              {isRerouting
                ? "REROUTING"
                : hasArrived
                  ? "ARRIVED"
                  : "NAVIGATING"}
            </Text>
          </View>

          <View
            style={
              styles.navigationStats
            }
          >
            <View
              style={
                styles.navigationStat
              }
            >
              <Text style={styles.statLabel}>
                DISTANCE
              </Text>

              <Text
                style={
                  styles.statValue
                }
              >
                {formatDistance(
                  remainingDistanceMeters
                )}
              </Text>
            </View>

            <View
              style={
                styles.navigationStat
              }
            >
              <Text style={styles.statLabel}>
                ETA
              </Text>

              <Text
                style={
                  styles.statValue
                }
              >
                {formatDuration(
                  remainingDurationSeconds
                )}
              </Text>
            </View>

            <View
              style={
                styles.navigationStat
              }
            >
              <Text style={styles.statLabel}>
                PROGRESS
              </Text>

              <Text
                style={
                  styles.statValue
                }
              >
                {Math.round(
                  progressPercent
                )}
                %
              </Text>
            </View>
          </View>

          {offRoute &&
            !isRerouting && (
              <Text
                style={
                  styles.offRouteText
                }
              >
                OFF ROUTE — RECALCULATING
              </Text>
            )}

          <View
            style={
              styles.progressTrack
            }
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      progressPercent
                    )
                  )}%`,
                },
              ]}
            />
          </View>

          {!hasArrived && (
            <Pressable
              style={({ pressed }) => [
                styles.stopButton,
                pressed &&
                  styles.buttonPressed,
              ]}
              onPress={
                handleStopNavigation
              }
            >
              <Text
                style={
                  styles.stopButtonText
                }
              >
                STOP NAVIGATION
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Destination search */}
      {status === "IDLE" && (
        <>
          <View
            style={
              styles.searchContainer
            }
          >
            <Text style={styles.label}>
              DESTINATION
            </Text>

            <View
              style={
                styles.searchRow
              }
            >
              <TextInput
                value={searchText}
                onChangeText={(value) => {
                  setSearchText(value);
                  setSearchError(null);
                }}
                placeholder="Search destination"
                placeholderTextColor="#555555"
                style={
                  styles.searchInput
                }
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={
                  searchDestination
                }
              />

              <Pressable
                style={({ pressed }) => [
                  styles.searchButton,
                  pressed &&
                    styles.buttonPressed,
                ]}
                onPress={
                  searchDestination
                }
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                  />
                ) : (
                  <Text
                    style={
                      styles.searchButtonText
                    }
                  >
                    SEARCH
                  </Text>
                )}
              </Pressable>
            </View>

            {searchError && (
              <Text
                style={
                  styles.errorText
                }
              >
                {searchError}
              </Text>
            )}

            {navigationError && (
              <Text
                style={
                  styles.errorText
                }
              >
                {navigationError}
              </Text>
            )}
          </View>

          {/* Search results */}
          {searchResults.length > 0 && (
            <View
              style={
                styles.resultsContainer
              }
            >
              {searchResults.map(
                (result, index) => (
                  <Pressable
                    key={`${result.latitude}-${result.longitude}-${index}`}
                    style={({ pressed }) => [
                      styles.resultItem,
                      pressed &&
                        styles.resultPressed,
                    ]}
                    onPress={() =>
                      selectDestination(
                        result
                      )
                    }
                  >
                    <View
                      style={
                        styles.resultContent
                      }
                    >
                      <Text
                        style={
                          styles.resultName
                        }
                        numberOfLines={1}
                      >
                        {result.name}
                      </Text>

                      <Text
                        style={
                          styles.resultAddress
                        }
                        numberOfLines={2}
                      >
                        {result.address}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.resultArrow
                      }
                    >
                      →
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          )}

          {routing && (
            <View
              style={
                styles.routingContainer
              }
            >
              <ActivityIndicator
                size="small"
                color="#d42b4e"
              />

              <Text
                style={
                  styles.routingText
                }
              >
                CALCULATING MOTORCYCLE ROUTE...
              </Text>
            </View>
          )}
        </>
      )}

      {/* Arrived */}
      {hasArrived && (
        <Pressable
          style={({ pressed }) => [
            styles.newNavigationButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={
            handleStopNavigation
          }
        >
          <Text
            style={
              styles.newNavigationButtonText
            }
          >
            NEW NAVIGATION
          </Text>
        </Pressable>
      )}

      {/* Speed */}
      <View style={styles.speedBar}>
        <Text style={styles.speedLabel}>
          SPEED
        </Text>

        <Text style={styles.speedValue}>
          {speedKmh}
        </Text>

        <Text style={styles.speedUnit}>
          KM/H
        </Text>
      </View>

      <Text style={styles.footer}>
        MOTOPILOT • ONLINE GPS NAVIGATION
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 15,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingRight: 15,
  },

  backText: {
    color: "#ffffff",
    fontSize: 32,
    lineHeight: 32,
    marginRight: 4,
  },

  backLabel: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },

  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    marginRight: 55,
  },

  title: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: 3,
  },

  subtitle: {
    color: "#555555",
    fontSize: 8,
    marginTop: 3,
    letterSpacing: 2,
  },

  statusContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },

  statusReady: {
    backgroundColor: "#d42b4e",
  },

  statusSearching: {
    backgroundColor: "#777777",
  },

  statusError: {
    backgroundColor: "#ff0000",
  },

  statusText: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  mapContainer: {
    flex: 1,
    minHeight: 240,
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#222222",
  },

  map: {
    flex: 1,
  },

  centerButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
  },

  centerButtonText: {
    color: "#ffffff",
    fontSize: 25,
  },

  navigationPanel: {
    marginTop: 10,
    padding: 13,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 10,
  },

  /*
   * Visual turn-by-turn guidance
   */
  maneuverContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#202020",
  },

  maneuverIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: "#d42b4e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  maneuverIcon: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "500",
    lineHeight: 42,
  },

  maneuverContent: {
    flex: 1,
  },

  maneuverTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  maneuverLabelContainer: {
    flex: 1,
    marginRight: 8,
  },

  maneuverLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  maneuverPhase: {
    color: "#777777",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 3,
  },

  maneuverDistance: {
    color: "#d42b4e",
    fontSize: 14,
    fontWeight: "800",
  },

  maneuverInstruction: {
    color: "#777777",
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
    paddingRight: 5,
  },

  navigationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  destinationLabel: {
    color: "#555555",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  destinationName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
    maxWidth: 220,
  },

  navigationStatus: {
    color: "#d42b4e",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  reroutingText: {
    color: "#ffaa55",
  },

  arrivedText: {
    color: "#ffffff",
  },

  navigationStats: {
    flexDirection: "row",
    marginTop: 12,
  },

  navigationStat: {
    flex: 1,
  },

  statLabel: {
    color: "#555555",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
  },

  statValue: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "600",
    marginTop: 3,
  },

  progressTrack: {
    height: 3,
    backgroundColor: "#222222",
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#d42b4e",
  },

  offRouteText: {
    color: "#ff7777",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 8,
  },

  stopButton: {
    alignSelf: "center",
    marginTop: 11,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    borderRadius: 6,
  },

  stopButtonText: {
    color: "#999999",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  searchContainer: {
    marginTop: 10,
  },

  label: {
    color: "#555555",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  searchRow: {
    flexDirection: "row",
    marginTop: 7,
  },

  searchInput: {
    flex: 1,
    height: 43,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#292929",
    borderRadius: 7,
    backgroundColor: "#0b0b0b",
    color: "#ffffff",
    fontSize: 12,
  },

  searchButton: {
    height: 43,
    marginLeft: 7,
    paddingHorizontal: 14,
    borderRadius: 7,
    backgroundColor: "#d42b4e",
    alignItems: "center",
    justifyContent: "center",
  },

  searchButtonText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  errorText: {
    color: "#ff7777",
    fontSize: 9,
    marginTop: 5,
  },

  resultsContainer: {
    marginTop: 8,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 8,
    overflow: "hidden",
  },

  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0b0b0b",
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1c",
  },

  resultPressed: {
    opacity: 0.65,
  },

  resultContent: {
    flex: 1,
    paddingRight: 10,
  },

  resultName: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },

  resultAddress: {
    color: "#666666",
    fontSize: 8,
    marginTop: 3,
  },

  resultArrow: {
    color: "#d42b4e",
    fontSize: 19,
  },

  routingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
  },

  routingText: {
    color: "#777777",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    marginLeft: 8,
  },

  newNavigationButton: {
    alignSelf: "center",
    marginTop: 10,
    backgroundColor: "#d42b4e",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 7,
  },

  newNavigationButtonText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  speedBar: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: 8,
  },

  speedLabel: {
    color: "#555555",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
    marginRight: 7,
  },

  speedValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "500",
  },

  speedUnit: {
    color: "#666666",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
    marginLeft: 4,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  footer: {
    color: "#333333",
    fontSize: 7,
    textAlign: "center",
    letterSpacing: 1.2,
    marginTop: 5,
  },
});