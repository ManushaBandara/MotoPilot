import {
  getSetting,
  setSetting,
} from "./database";

export type FuelSettings = {
  tankCapacityLitres: number;
  currentFuelPrice: number;
  estimatedKmPerLitre: number;
  estimatedFuelRemainingLitres: number;
};

const SETTING_KEYS = {
  tankCapacity:
    "fuel.tankCapacityLitres",

  currentFuelPrice:
    "fuel.currentFuelPrice",

  estimatedKmPerLitre:
    "fuel.estimatedKmPerLitre",

  estimatedFuelRemaining:
    "fuel.estimatedFuelRemainingLitres",
} as const;

export const DEFAULT_FUEL_SETTINGS: FuelSettings = {
  tankCapacityLitres: 12,
  currentFuelPrice: 300,
  estimatedKmPerLitre: 40,
  estimatedFuelRemainingLitres: 0,
};

function parsePositiveNumber(
  value: string | null,
  fallback: number
): number {
  if (value == null) {
    return fallback;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return fallback;
  }

  return parsed;
}

export async function getFuelSettings(): Promise<FuelSettings> {
  const [
    tankCapacity,
    currentFuelPrice,
    estimatedKmPerLitre,
    estimatedFuelRemaining,
  ] = await Promise.all([
    getSetting(
      SETTING_KEYS.tankCapacity
    ),

    getSetting(
      SETTING_KEYS.currentFuelPrice
    ),

    getSetting(
      SETTING_KEYS.estimatedKmPerLitre
    ),

    getSetting(
      SETTING_KEYS.estimatedFuelRemaining
    ),
  ]);

  const parsedTankCapacity =
    parsePositiveNumber(
      tankCapacity,
      DEFAULT_FUEL_SETTINGS.tankCapacityLitres
    );

  const parsedFuelRemaining =
    parsePositiveNumber(
      estimatedFuelRemaining,
      DEFAULT_FUEL_SETTINGS.estimatedFuelRemainingLitres
    );

  return {
    tankCapacityLitres:
      parsedTankCapacity,

    currentFuelPrice:
      parsePositiveNumber(
        currentFuelPrice,
        DEFAULT_FUEL_SETTINGS.currentFuelPrice
      ),

    estimatedKmPerLitre:
      parsePositiveNumber(
        estimatedKmPerLitre,
        DEFAULT_FUEL_SETTINGS.estimatedKmPerLitre
      ),

    estimatedFuelRemainingLitres:
      Math.min(
        parsedFuelRemaining,
        parsedTankCapacity
      ),
  };
}

export async function saveFuelSettings(
  settings: FuelSettings
): Promise<void> {
  if (
    !Number.isFinite(
      settings.tankCapacityLitres
    ) ||
    settings.tankCapacityLitres <= 0
  ) {
    throw new Error(
      "Tank capacity must be greater than zero."
    );
  }

  if (
    !Number.isFinite(
      settings.currentFuelPrice
    ) ||
    settings.currentFuelPrice <= 0
  ) {
    throw new Error(
      "Fuel price must be greater than zero."
    );
  }

  if (
    !Number.isFinite(
      settings.estimatedKmPerLitre
    ) ||
    settings.estimatedKmPerLitre <= 0
  ) {
    throw new Error(
      "Estimated fuel efficiency must be greater than zero."
    );
  }

  if (
    !Number.isFinite(
      settings.estimatedFuelRemainingLitres
    ) ||
    settings.estimatedFuelRemainingLitres < 0
  ) {
    throw new Error(
      "Estimated remaining fuel cannot be negative."
    );
  }

  if (
    settings.estimatedFuelRemainingLitres >
    settings.tankCapacityLitres
  ) {
    throw new Error(
      "Estimated remaining fuel cannot exceed tank capacity."
    );
  }

  await Promise.all([
    setSetting(
      SETTING_KEYS.tankCapacity,
      settings.tankCapacityLitres.toString()
    ),

    setSetting(
      SETTING_KEYS.currentFuelPrice,
      settings.currentFuelPrice.toString()
    ),

    setSetting(
      SETTING_KEYS.estimatedKmPerLitre,
      settings.estimatedKmPerLitre.toString()
    ),

    setSetting(
      SETTING_KEYS.estimatedFuelRemaining,
      settings.estimatedFuelRemainingLitres.toString()
    ),
  ]);
}

export async function updateCurrentFuelPrice(
  pricePerLitre: number
): Promise<void> {
  if (
    !Number.isFinite(pricePerLitre) ||
    pricePerLitre <= 0
  ) {
    throw new Error(
      "Fuel price must be greater than zero."
    );
  }

  await setSetting(
    SETTING_KEYS.currentFuelPrice,
    pricePerLitre.toString()
  );
}

export async function updateEstimatedFuelRemaining(
  fuelLitres: number,
  tankCapacityLitres: number
): Promise<void> {
  if (
    !Number.isFinite(fuelLitres) ||
    fuelLitres < 0
  ) {
    throw new Error(
      "Estimated fuel cannot be negative."
    );
  }

  if (
    !Number.isFinite(tankCapacityLitres) ||
    tankCapacityLitres <= 0
  ) {
    throw new Error(
      "Tank capacity must be greater than zero."
    );
  }

  if (fuelLitres > tankCapacityLitres) {
    throw new Error(
      "Estimated fuel cannot exceed tank capacity."
    );
  }

  await setSetting(
    SETTING_KEYS.estimatedFuelRemaining,
    fuelLitres.toString()
  );
}