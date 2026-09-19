import type { Destination } from "./navigationTypes";

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

type PlacesApiResponse = {
  places?: Array<{
    displayName?: {
      text?: string;
    };
    formattedAddress?: string;
    location?: {
      latitude?: number;
      longitude?: number;
    };
  }>;
};

export async function searchPlaces(
  query: string,
  latitude?: number,
  longitude?: number
): Promise<Destination[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not configured."
    );
  }

  const body: Record<string, unknown> = {
    textQuery: trimmedQuery,
    maxResultCount: 5,
  };

  if (
    latitude != null &&
    longitude != null
  ) {
    body.locationBias = {
      circle: {
        center: {
          latitude,
          longitude,
        },
        radius: 50000,
      },
    };
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key":
          GOOGLE_MAPS_API_KEY,

        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location",
      },

      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Places search failed (${response.status}): ${errorText}`
    );
  }

  const data =
    (await response.json()) as PlacesApiResponse;

  return (data.places ?? [])
    .filter(
      (place) =>
        place.location?.latitude != null &&
        place.location?.longitude != null
    )
    .map((place) => ({
      name:
        place.displayName?.text ??
        "Unknown destination",

      address:
        place.formattedAddress ??
        "",

      latitude:
        place.location!.latitude!,

      longitude:
        place.location!.longitude!,
    }));
}