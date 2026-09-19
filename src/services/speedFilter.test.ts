import {
  createSpeedFilterState,
  filterSpeed,
} from "./speedFilter";

const state = createSpeedFilterState();

function kmhToMs(kmh: number) {
  return kmh / 3.6;
}

const testSpeeds = [
  0,
  0.5,
  1,
  1.5,
  2,
  5,
  10,
  20,
  40,
  60,
  80,
  100,
  150,
  260,
];

console.log("=== MOTO PILOT SPEED FILTER TEST ===");

for (const speedKmh of testSpeeds) {
  const filteredSpeed = filterSpeed(
  kmhToMs(speedKmh),
  5,
  state
);

  console.log(
    `Input: ${speedKmh} km/h → Output: ${filteredSpeed} km/h`
  );
}