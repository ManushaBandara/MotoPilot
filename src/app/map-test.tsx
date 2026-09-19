import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { useLocation } from "../hooks/useLocation";
import { calculateDistanceMeters } from "../services/distance";
import { searchPlaces } from "../services/navigation/placesService";
import {
  calculateRoute as calculateRouteService,
} from "../services/navigation/routesService";
import type {
  Destination,
  RouteInfo,
} from "../services/navigation/navigationTypes";

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const DEFAULT_LATITUDE = 7.8731;
const DEFAULT_LONGITUDE = 80.7718;

type GpsLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function createMapHtml(apiKey: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
  />

  <style>
    html,
    body,
    #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      background: #050505;
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

    let mapReady = false;
    let followLocation = true;

    function sendMessage(type, data = {}) {
      if (
        window.ReactNativeWebView &&
        window.ReactNativeWebView.postMessage
      ) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type,
            ...data
          })
        );
      }
    }

    async function initMap() {
      try {
        if (
          !window.google ||
          !window.google.maps
        ) {
          throw new Error(
            "Google Maps JavaScript API has not loaded."
          );
        }

        const { Map } =
          await google.maps.importLibrary("maps");

        const { Marker } =
          await google.maps.importLibrary("marker");

        map = new Map(
          document.getElementById("map"),
          {
            center: {
              lat: ${DEFAULT_LATITUDE},
              lng: ${DEFAULT_LONGITUDE}
            },

            zoom: 15,

            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,

            zoomControl: true,

            gestureHandling: "greedy"
          }
        );

        currentMarker = new Marker({
          map,

          position: {
            lat: ${DEFAULT_LATITUDE},
            lng: ${DEFAULT_LONGITUDE}
          },

          title: "MotoPilot"
        });

        map.addListener(
          "dragstart",
          () => {
            followLocation = false;
          }
        );

        mapReady = true;

        sendMessage("MAP_READY");
      } catch (error) {
        sendMessage(
          "MAP_ERROR",
          {
            message:
              error && error.message
                ? error.message
                : "Unable to initialize Google Maps."
          }
        );
      }
    }

    function updateLocation(
      latitude,
      longitude
    ) {
      if (
        !mapReady ||
        !map ||
        !currentMarker
      ) {
        return;
      }

      const position = {
        lat: latitude,
        lng: longitude
      };

      currentMarker.setPosition(position);

      if (followLocation) {
        map.panTo(position);
      }
    }

    function centerOnLocation() {
      if (
        !mapReady ||
        !map ||
        !currentMarker
      ) {
        return;
      }

      followLocation = true;

      map.panTo(
        currentMarker.getPosition()
      );

      map.setZoom(17);
    }

    function setDestination(
      latitude,
      longitude,
      name
    ) {
      if (
        !mapReady ||
        !map
      ) {
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
          map,

          position,

          title: name
        });

      followLocation = false;

      const bounds =
        new google.maps.LatLngBounds();

      if (currentMarker) {
        bounds.extend(
          currentMarker.getPosition()
        );
      }

      bounds.extend(position);

      map.fitBounds(
        bounds,
        80
      );

      sendMessage(
        "DESTINATION_SET",
        {
          latitude,
          longitude,
          name
        }
      );
    }

    function drawRoute(
      encodedPolyline
    ) {
      if (
        !mapReady ||
        !map
      ) {
        return;
      }

      if (routePolyline) {
        routePolyline.setMap(null);
      }

      routePolyline =
        new google.maps.Polyline({
          path:
            google.maps.geometry.encoding.decodePath(
              encodedPolyline
            ),

          geodesic: true,

          strokeColor: "#d42b4e",

          strokeOpacity: 0.95,

          strokeWeight: 6,

          map
        });

      const bounds =
        new google.maps.LatLngBounds();

      routePolyline
        .getPath()
        .forEach((point) => {
          bounds.extend(point);
        });

      if (destinationMarker) {
        bounds.extend(
          destinationMarker.getPosition()
        );
      }

      if (currentMarker) {
        bounds.extend(
          currentMarker.getPosition()
        );
      }

      map.fitBounds(
        bounds,
        80
      );
    }

    function clearRoute() {
      if (routePolyline) {
        routePolyline.setMap(null);
        routePolyline = null;
      }
    }

    function clearDestination() {
      clearRoute();

      if (destinationMarker) {
        destinationMarker.setMap(null);
        destinationMarker = null;
      }

      sendMessage(
        "DESTINATION_CLEARED"
      );
    }

    window.updateLocation =
      updateLocation;

    window.centerOnLocation =
      centerOnLocation;

    window.setDestination =
      setDestination;

    window.drawRoute =
      drawRoute;

    window.clearRoute =
      clearRoute;

    window.clearDestination =
      clearDestination;
  </script>

  <script
    async
    src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=weekly&libraries=geometry&callback=initMap"
  ></script>
</body>
</html>
`;
}

export default function MapTestScreen() {
  const {
    location,
    error,
  } = useLocation();

  const webViewRef =
    useRef<WebView>(null);

  const [mapReady, setMapReady] =
    useState(false);

  const [webViewLoaded, setWebViewLoaded] =
    useState(false);

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

  const [destination, setDestination] =
    useState<Destination | null>(null);

  const [routeInfo, setRouteInfo] =
    useState<RouteInfo | null>(null);

  const lastRouteLocationRef =
    useRef<GpsLocation | null>(null);

  const sendLocationToMap = (
    gpsLocation: GpsLocation
  ) => {
    if (
      !webViewRef.current ||
      !webViewLoaded
    ) {
      return;
    }

    const latitude =
      gpsLocation.latitude;

    const longitude =
      gpsLocation.longitude;

    webViewRef.current.injectJavaScript(`
      if (
        typeof window.updateLocation ===
        "function"
      ) {
        window.updateLocation(
          ${latitude},
          ${longitude}
        );
      }

      true;
    `);
  };

  useEffect(() => {
    if (
      !location ||
      !webViewLoaded
    ) {
      return;
    }

    sendLocationToMap(location);
  }, [
    location,
    webViewLoaded,
  ]);

  const calculateRoute = async (
    target: Destination,
    currentLocation: GpsLocation
  ) => {
    setRouting(true);

    try {
      const route =
        await calculateRouteService({
          origin: {
            latitude:
              currentLocation.latitude,
            longitude:
              currentLocation.longitude,
          },

          destination: {
            latitude:
              target.latitude,
            longitude:
              target.longitude,
          },
        });

      console.log(
        "Google Routes result:",
        route
      );

      setRouteInfo({
  distanceMeters: route.distanceMeters,
  durationSeconds: route.durationSeconds,
  encodedPolyline: route.encodedPolyline,
  steps: route.steps,
});

      lastRouteLocationRef.current =
        currentLocation;

      webViewRef.current?.injectJavaScript(`
        if (
          typeof window.drawRoute ===
          "function"
        ) {
          window.drawRoute(
            ${JSON.stringify(
              route.encodedPolyline
            )}
          );
        }

        true;
      `);
    } catch (err) {
      console.error(
        "Route calculation error:",
        err
      );

      setRouteInfo(null);
    } finally {
      setRouting(false);
    }
  };

  async function searchDestination() {
    const query =
      searchText.trim();

    if (!query) {
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const results =
        await searchPlaces(
          query,
          location?.latitude,
          location?.longitude
        );

      if (results.length === 0) {
        setSearchError(
          "No destination was found."
        );
        return;
      }

      const selectedDestination =
        results[0];

      setDestination(
        selectedDestination
      );

      setSearchText(
        selectedDestination.name
      );

      setSearchResults([]);

      webViewRef.current?.injectJavaScript(`
        if (
          typeof window.setDestination ===
          "function"
        ) {
          window.setDestination(
            ${selectedDestination.latitude},
            ${selectedDestination.longitude},
            ${JSON.stringify(
              selectedDestination.name
            )}
          );
        }

        true;
      `);

      if (location) {
        await calculateRoute(
          selectedDestination,
          location
        );
      }
    } catch (err) {
      console.error(
        "Places search failed:",
        err
      );

      setSearchError(
        err instanceof Error
          ? err.message
          : "Unable to search for destination."
      );
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (
      !location ||
      !destination
    ) {
      return;
    }

    const previousLocation =
      lastRouteLocationRef.current;

    if (!previousLocation) {
      return;
    }

    const movedMeters =
      calculateDistanceMeters(
        previousLocation,
        location
      );

    if (movedMeters < 100) {
      return;
    }

    if (routing) {
      return;
    }

    calculateRoute(
      destination,
      location
    );
  }, [
    location,
  ]);

  const clearDestination = () => {
    setDestination(null);

    setRouteInfo(null);

    setSearchText("");

    setSearchError(null);

    setSearchResults([]);

    lastRouteLocationRef.current =
      null;

    webViewRef.current?.injectJavaScript(`
      if (
        typeof window.clearDestination ===
        "function"
      ) {
        window.clearDestination();
      }

      true;
    `);
  };

  const centerMapOnLocation = () => {
    webViewRef.current?.injectJavaScript(`
      if (
        typeof window.centerOnLocation ===
        "function"
      ) {
        window.centerOnLocation();
      }

      true;
    `);
  };

  const formatDistance = (
    meters: number
  ) => {
    if (meters < 1000) {
      return `${Math.round(
        meters
      )} m`;
    }

    return `${(
      meters / 1000
    ).toFixed(1)} km`;
  };

  const formatDuration = (
    seconds: number
  ) => {
    const minutes =
      Math.round(
        seconds / 60
      );

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours =
      Math.floor(
        minutes / 60
      );

    const remainingMinutes =
      minutes % 60;

    if (
      remainingMinutes === 0
    ) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remainingMinutes} min`;
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View
        style={
          styles.container
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          GOOGLE MAPS API KEY MISSING
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          Add
          {" "}
          EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
          {" "}
          to your .env file.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.header
        }
      >
        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            ←
          </Text>
        </Pressable>

        <View>
          <Text
            style={
              styles.title
            }
          >
            MAP TEST
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            MotoPilot GPS navigation test
          </Text>
        </View>

        <View
          style={[
            styles.status,
            error
              ? styles.statusError
              : location
                ? styles.statusConnected
                : styles.statusSearching,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              error
                ? styles.dotError
                : location
                  ? styles.dotConnected
                  : styles.dotSearching,
            ]}
          />

          <Text
            style={
              styles.statusText
            }
          >
            {error
              ? "GPS ERROR"
              : location
                ? "GPS CONNECTED"
                : "SEARCHING FOR GPS"}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.searchContainer
        }
      >
        <TextInput
          value={
            searchText
          }
          onChangeText={(
            text
          ) => {
            setSearchText(text);
            setSearchError(null);
          }}
          placeholder="Search destination..."
          placeholderTextColor="#666666"
          style={
            styles.searchInput
          }
          returnKeyType="search"
          onSubmitEditing={
            searchDestination
          }
          editable={
            !searching &&
            !routing
          }
        />

        <Pressable
          style={({
            pressed,
          }) => [
            styles.searchButton,
            pressed &&
              styles.buttonPressed,
            (searching ||
              routing) &&
              styles.searchButtonDisabled,
          ]}
          onPress={
            searchDestination
          }
          disabled={
            searching ||
            routing
          }
        >
          {searching ||
          routing ? (
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
        <View
          style={
            styles.searchError
          }
        >
          <Text
            style={
              styles.searchErrorText
            }
          >
            {searchError}
          </Text>
        </View>
      )}

      {searchResults.length > 0 && (
        <View
          style={
            styles.searchResults
          }
        >
          {searchResults.map(
            (result, index) => (
              <Pressable
                key={`${result.latitude}-${result.longitude}-${index}`}
                style={({
                  pressed,
                }) => [
                  styles.searchResult,
                  pressed &&
                    styles.buttonPressed,
                ]}
                onPress={async () => {
                  setDestination(
                    result
                  );

                  setSearchText(
                    result.name
                  );

                  setSearchResults(
                    []
                  );

                  setSearchError(
                    null
                  );

                  webViewRef.current?.injectJavaScript(`
                    if (
                      typeof window.setDestination ===
                      "function"
                    ) {
                      window.setDestination(
                        ${result.latitude},
                        ${result.longitude},
                        ${JSON.stringify(
                          result.name
                        )}
                      );
                    }

                    true;
                  `);

                  if (location) {
                    await calculateRoute(
                      result,
                      location
                    );
                  }
                }}
              >
                <Text
                  style={
                    styles.searchResultName
                  }
                  numberOfLines={1}
                >
                  {result.name}
                </Text>

                <Text
                  style={
                    styles.searchResultAddress
                  }
                  numberOfLines={2}
                >
                  {result.address}
                </Text>
              </Pressable>
            )
          )}
        </View>
      )}

      {destination && (
        <View
          style={
            styles.destinationCard
          }
        >
          <View
            style={
              styles.destinationInfo
            }
          >
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
              {destination.name}
            </Text>

            <Text
              style={
                styles.destinationAddress
              }
              numberOfLines={2}
            >
              {destination.address}
            </Text>
          </View>

          <Pressable
            style={
              styles.clearButton
            }
            onPress={
              clearDestination
            }
          >
            <Text
              style={
                styles.clearButtonText
              }
            >
              CLEAR
            </Text>
          </Pressable>
        </View>
      )}

      {routeInfo && (
        <View
          style={
            styles.routeCard
          }
        >
          <View>
            <Text
              style={
                styles.routeLabel
              }
            >
              ROUTE
            </Text>

            <Text
              style={
                styles.routeValue
              }
            >
              {formatDistance(
                routeInfo.distanceMeters
              )}
            </Text>
          </View>

          <View
            style={
              styles.routeDivider
            }
          />

          <View>
            <Text
              style={
                styles.routeLabel
              }
            >
              ETA
            </Text>

            <Text
              style={
                styles.routeValue
              }
            >
              {formatDuration(
                routeInfo.durationSeconds
              )}
            </Text>
          </View>

          {routing && (
            <ActivityIndicator
              size="small"
              color="#d42b4e"
            />
          )}
        </View>
      )}

      <View
        style={
          styles.mapContainer
        }
      >
        <WebView
          ref={
            webViewRef
          }
          source={{
            html:
              createMapHtml(
                GOOGLE_MAPS_API_KEY
              ),
          }}
          style={
            styles.webView
          }
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={[
            "*",
          ]}
          onLoadEnd={() => {
            setWebViewLoaded(
              true
            );
          }}
          onMessage={(
            event
          ) => {
            try {
              const message =
                JSON.parse(
                  event.nativeEvent
                    .data
                );

              if (
                message.type ===
                "MAP_READY"
              ) {
                setMapReady(
                  true
                );

                if (
                  location
                ) {
                  sendLocationToMap(
                    location
                  );
                }

                if (
                  destination
                ) {
                  webViewRef.current?.injectJavaScript(`
                    if (
                      typeof window.setDestination ===
                      "function"
                    ) {
                      window.setDestination(
                        ${destination.latitude},
                        ${destination.longitude},
                        ${JSON.stringify(
                          destination.name
                        )}
                      );
                    }

                    true;
                  `);
                }
              }

              if (
                message.type ===
                "MAP_ERROR"
              ) {
                console.error(
                  "Google Maps error:",
                  message.message
                );
              }

              if (
                message.type ===
                "DESTINATION_SET"
              ) {
                console.log(
                  "Destination set:",
                  message
                );
              }

              if (
                message.type ===
                "DESTINATION_CLEARED"
              ) {
                console.log(
                  "Destination cleared."
                );
              }
            } catch (err) {
              console.error(
                "Map WebView message error:",
                err
              );
            }
          }}
          onError={(
            event
          ) => {
            console.error(
              "Map WebView error:",
              event.nativeEvent
            );
          }}
          onHttpError={(
            event
          ) => {
            console.error(
              "Map WebView HTTP error:",
              event.nativeEvent
            );
          }}
        />

        {!mapReady && (
          <View
            style={
              styles.loadingOverlay
            }
            pointerEvents="none"
          >
            <ActivityIndicator
              size="large"
              color="#d42b4e"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              LOADING MAP
            </Text>
          </View>
        )}

        <View
          style={
            styles.mapControls
          }
        >
          <Pressable
            style={({
              pressed,
            }) => [
              styles.locationButton,
              pressed &&
                styles.buttonPressed,
            ]}
            onPress={
              centerMapOnLocation
            }
          >
            <Text
              style={
                styles.locationButtonText
              }
            >
              ◎
            </Text>

            <Text
              style={
                styles.locationButtonLabel
              }
            >
              MY LOCATION
            </Text>
          </Pressable>
        </View>

        {location && (
          <View
            style={
              styles.gpsInfo
            }
          >
            <Text
              style={
                styles.gpsInfoText
              }
            >
              {location.latitude.toFixed(
                6
              )}
              {"  "}
              {location.longitude.toFixed(
                6
              )}
            </Text>

            <Text
              style={
                styles.gpsAccuracy
              }
            >
              Accuracy:{" "}
              {location.accuracy !=
              null
                ? `${location.accuracy.toFixed(
                    1
                  )} m`
                : "—"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: "#ffffff",
    fontSize: 24,
  },

  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },

  subtitle: {
    color: "#666666",
    fontSize: 10,
    marginTop: 3,
  },

  status: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },

  statusConnected: {
    backgroundColor: "#08130c",
    borderColor: "#183d25",
  },

  statusSearching: {
    backgroundColor: "#141108",
    borderColor: "#3d3218",
  },

  statusError: {
    backgroundColor: "#180909",
    borderColor: "#4a1717",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  dotConnected: {
    backgroundColor: "#35d878",
  },

  dotSearching: {
    backgroundColor: "#d7a832",
  },

  dotError: {
    backgroundColor: "#d42b4e",
  },

  statusText: {
    color: "#aaaaaa",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  searchContainer: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: "row",
    gap: 8,
  },

  searchInput: {
    flex: 1,
    minHeight: 48,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 10,
    paddingHorizontal: 15,
    color: "#ffffff",
    fontSize: 14,
  },

  searchButton: {
    minWidth: 82,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#d42b4e",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  searchButtonDisabled: {
    opacity: 0.6,
  },

  searchButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  searchError: {
    marginHorizontal: 18,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#180909",
    borderWidth: 1,
    borderColor: "#4a1717",
  },

  searchErrorText: {
    color: "#d42b4e",
    fontSize: 10,
  },

  searchResults: {
    marginHorizontal: 18,
    marginBottom: 8,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 10,
    overflow: "hidden",
  },

  searchResult: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1c",
  },

  searchResultName: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },

  searchResultAddress: {
    color: "#777777",
    fontSize: 10,
    marginTop: 4,
  },

  destinationCard: {
    marginHorizontal: 18,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "#242424",
    flexDirection: "row",
    alignItems: "center",
  },

  destinationInfo: {
    flex: 1,
  },

  destinationLabel: {
    color: "#666666",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  destinationName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },

  destinationAddress: {
    color: "#777777",
    fontSize: 10,
    marginTop: 3,
  },

  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3a2026",
    backgroundColor: "#160b0e",
    marginLeft: 10,
  },

  clearButtonText: {
    color: "#d42b4e",
    fontSize: 9,
    fontWeight: "800",
  },

  routeCard: {
    marginHorizontal: 18,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#10080b",
    borderWidth: 1,
    borderColor: "#382028",
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },

  routeLabel: {
    color: "#777777",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  routeValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },

  routeDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#302126",
  },

  mapContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },

  webView: {
    flex: 1,
    backgroundColor: "#050505",
  },

  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
  },

  loadingText: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 12,
  },

  mapControls: {
    position: "absolute",
    right: 14,
    top: 14,
  },

  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#292929",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  locationButtonText: {
    color: "#d42b4e",
    fontSize: 20,
    marginRight: 6,
  },

  locationButtonLabel: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  gpsInfo: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "rgba(5,5,5,0.92)",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  gpsInfoText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },

  gpsAccuracy: {
    color: "#666666",
    fontSize: 8,
    marginTop: 3,
  },

  errorTitle: {
    color: "#d42b4e",
    fontSize: 16,
    fontWeight: "800",
  },

  errorText: {
    color: "#777777",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },

  buttonPressed: {
    opacity: 0.7,
  },
});