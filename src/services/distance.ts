const EARTH_RADIUS_METERS = 6_371_000;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function calculateDistanceMeters(
  from: Coordinates,
  to: Coordinates
): number {
  const latitudeDifference = toRadians(
    to.latitude - from.latitude
  );

  const longitudeDifference = toRadians(
    to.longitude - from.longitude
  );

  const fromLatitude = toRadians(
    from.latitude
  );

  const toLatitude = toRadians(
    to.latitude
  );

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return EARTH_RADIUS_METERS * c;
}