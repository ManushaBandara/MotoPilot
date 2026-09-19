export type FuelTransaction = {
  amountSpent: number;
  pricePerLitre: number;
  litres: number;
  distanceKm?: number;
};

export type FuelSummary = {
  totalMoneySpent: number;
  totalLitresPurchased: number;
  averageFuelPrice: number;
  refuelCount: number;
  estimatedKmPerLitre: number | null;
  estimatedCostPerKm: number | null;
};

export type FuelState = {
  tankCapacityLitres: number;
  estimatedFuelRemainingLitres: number;
  estimatedKmPerLitre: number;
};

/**
 * Calculate how many litres were purchased
 * from the amount of money spent and the fuel price.
 *
 * Example:
 * Rs. 3000 / Rs. 300 per litre = 10 litres
 */
export function calculateLitresFromSpending(
  amountSpent: number,
  pricePerLitre: number
): number {
  if (
    !Number.isFinite(amountSpent) ||
    !Number.isFinite(pricePerLitre) ||
    amountSpent <= 0 ||
    pricePerLitre <= 0
  ) {
    return 0;
  }

  return amountSpent / pricePerLitre;
}

/**
 * Calculate money spent from litres purchased
 * and the price per litre.
 */
export function calculateSpendingFromLitres(
  litres: number,
  pricePerLitre: number
): number {
  if (
    !Number.isFinite(litres) ||
    !Number.isFinite(pricePerLitre) ||
    litres <= 0 ||
    pricePerLitre <= 0
  ) {
    return 0;
  }

  return litres * pricePerLitre;
}

/**
 * Calculate the weighted average fuel price.
 *
 * This is more accurate than simply averaging
 * the recorded prices because each refuel can
 * contain a different amount of fuel.
 */
export function calculateAverageFuelPrice(
  transactions: FuelTransaction[]
): number {
  if (transactions.length === 0) {
    return 0;
  }

  let totalMoney = 0;
  let totalLitres = 0;

  for (const transaction of transactions) {
    if (
      transaction.amountSpent <= 0 ||
      transaction.pricePerLitre <= 0 ||
      transaction.litres <= 0
    ) {
      continue;
    }

    totalMoney += transaction.amountSpent;
    totalLitres += transaction.litres;
  }

  if (totalLitres === 0) {
    return 0;
  }

  return totalMoney / totalLitres;
}

/**
 * Calculate estimated fuel efficiency.
 *
 * distance / fuel consumed = km/L
 */
export function calculateKmPerLitre(
  distanceKm: number,
  fuelConsumedLitres: number
): number | null {
  if (
    !Number.isFinite(distanceKm) ||
    !Number.isFinite(fuelConsumedLitres) ||
    distanceKm <= 0 ||
    fuelConsumedLitres <= 0
  ) {
    return null;
  }

  return distanceKm / fuelConsumedLitres;
}

/**
 * Calculate estimated fuel consumed from distance
 * and the motorcycle's fuel efficiency.
 */
export function calculateFuelConsumed(
  distanceKm: number,
  estimatedKmPerLitre: number
): number {
  if (
    !Number.isFinite(distanceKm) ||
    !Number.isFinite(estimatedKmPerLitre) ||
    distanceKm <= 0 ||
    estimatedKmPerLitre <= 0
  ) {
    return 0;
  }

  return distanceKm / estimatedKmPerLitre;
}

/**
 * Add newly purchased fuel to the estimated tank.
 *
 * The result can never exceed the configured
 * tank capacity.
 */
export function addFuelToTank(
  currentFuelLitres: number,
  addedFuelLitres: number,
  tankCapacityLitres: number
): number {
  if (
    !Number.isFinite(currentFuelLitres) ||
    !Number.isFinite(addedFuelLitres) ||
    !Number.isFinite(tankCapacityLitres) ||
    tankCapacityLitres <= 0
  ) {
    return 0;
  }

  const newFuelLevel =
    currentFuelLitres + Math.max(addedFuelLitres, 0);

  return Math.min(
    Math.max(newFuelLevel, 0),
    tankCapacityLitres
  );
}

/**
 * Remove estimated fuel consumed during a ride.
 *
 * The result can never fall below zero.
 */
export function consumeFuelFromTank(
  currentFuelLitres: number,
  distanceKm: number,
  estimatedKmPerLitre: number
): number {
  if (
    !Number.isFinite(currentFuelLitres) ||
    currentFuelLitres <= 0
  ) {
    return 0;
  }

  const fuelConsumed = calculateFuelConsumed(
    distanceKm,
    estimatedKmPerLitre
  );

  return Math.max(
    currentFuelLitres - fuelConsumed,
    0
  );
}

/**
 * Calculate estimated remaining range.
 */
export function calculateRemainingRange(
  remainingFuelLitres: number,
  estimatedKmPerLitre: number
): number {
  if (
    !Number.isFinite(remainingFuelLitres) ||
    !Number.isFinite(estimatedKmPerLitre) ||
    remainingFuelLitres <= 0 ||
    estimatedKmPerLitre <= 0
  ) {
    return 0;
  }

  return (
    remainingFuelLitres *
    estimatedKmPerLitre
  );
}

/**
 * Calculate estimated fuel cost per kilometre.
 */
export function calculateCostPerKm(
  fuelPricePerLitre: number,
  estimatedKmPerLitre: number
): number | null {
  if (
    !Number.isFinite(fuelPricePerLitre) ||
    !Number.isFinite(estimatedKmPerLitre) ||
    fuelPricePerLitre <= 0 ||
    estimatedKmPerLitre <= 0
  ) {
    return null;
  }

  return (
    fuelPricePerLitre /
    estimatedKmPerLitre
  );
}

/**
 * Create a summary from a collection of
 * fuel transactions.
 */
export function calculateFuelSummary(
  transactions: FuelTransaction[]
): FuelSummary {
  if (transactions.length === 0) {
    return {
      totalMoneySpent: 0,
      totalLitresPurchased: 0,
      averageFuelPrice: 0,
      refuelCount: 0,
      estimatedKmPerLitre: null,
      estimatedCostPerKm: null,
    };
  }

  let totalMoneySpent = 0;
  let totalLitresPurchased = 0;
  let totalDistanceKm = 0;

  let hasDistanceData = false;

  for (const transaction of transactions) {
    if (
      !Number.isFinite(transaction.amountSpent) ||
      !Number.isFinite(transaction.litres)
    ) {
      continue;
    }

    if (
      transaction.amountSpent > 0 &&
      transaction.litres > 0
    ) {
      totalMoneySpent +=
        transaction.amountSpent;

      totalLitresPurchased +=
        transaction.litres;
    }

    if (
      transaction.distanceKm != null &&
      Number.isFinite(transaction.distanceKm) &&
      transaction.distanceKm > 0
    ) {
      totalDistanceKm +=
        transaction.distanceKm;

      hasDistanceData = true;
    }
  }

  const averageFuelPrice =
    totalLitresPurchased > 0
      ? totalMoneySpent /
        totalLitresPurchased
      : 0;

  const estimatedKmPerLitre =
    hasDistanceData &&
    totalLitresPurchased > 0
      ? calculateKmPerLitre(
          totalDistanceKm,
          totalLitresPurchased
        )
      : null;

  const estimatedCostPerKm =
    estimatedKmPerLitre != null &&
    estimatedKmPerLitre > 0
      ? calculateCostPerKm(
          averageFuelPrice,
          estimatedKmPerLitre
        )
      : null;

  return {
    totalMoneySpent,
    totalLitresPurchased,
    averageFuelPrice,
    refuelCount: transactions.length,
    estimatedKmPerLitre,
    estimatedCostPerKm,
  };
}

/**
 * Calculate the complete current fuel state.
 */
export function calculateFuelState(
  currentFuelLitres: number,
  tankCapacityLitres: number,
  estimatedKmPerLitre: number
): FuelState {
  const safeTankCapacity =
    Math.max(tankCapacityLitres, 0);

  const safeFuel =
    Math.min(
      Math.max(currentFuelLitres, 0),
      safeTankCapacity
    );

  return {
    tankCapacityLitres:
      safeTankCapacity,

    estimatedFuelRemainingLitres:
      safeFuel,

    estimatedKmPerLitre:
      Math.max(
        estimatedKmPerLitre,
        0
      ),
  };
}