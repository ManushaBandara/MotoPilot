import {
  MaintenanceItem,
  getMaintenanceItems,
  saveMaintenanceItem,
  updateMaintenanceItem,
} from "./database";

export type MaintenanceStatus =
  | "COMPLETED"
  | "UPCOMING"
  | "DUE"
  | "OVERDUE";

export type MaintenanceItemWithStatus =
  MaintenanceItem & {
    currentOdometerKm: number;
    nextDueKm: number | null;
    remainingKm: number | null;
    status: MaintenanceStatus;
  };

function validateNonNegativeNumber(
  value: number,
  fieldName: string
): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `${fieldName} must be zero or greater.`
    );
  }
}

function calculateMaintenanceStatus(
  item: MaintenanceItem,
  currentOdometerKm: number
): MaintenanceItemWithStatus {
  const currentKm = Math.max(
    0,
    currentOdometerKm
  );

  if (
    item.intervalKm == null ||
    item.intervalKm <= 0 ||
    item.lastCompletedKm == null
  ) {
    return {
      ...item,
      currentOdometerKm: currentKm,
      nextDueKm: null,
      remainingKm: null,
      status: "UPCOMING",
    };
  }

  const nextDueKm =
    item.lastCompletedKm +
    item.intervalKm;

  const remainingKm =
    nextDueKm - currentKm;

  let status: MaintenanceStatus;

  if (remainingKm < 0) {
    status = "OVERDUE";
  } else if (remainingKm <= 250) {
    status = "DUE";
  } else {
    status = "UPCOMING";
  }

  return {
    ...item,
    currentOdometerKm: currentKm,
    nextDueKm,
    remainingKm,
    status,
  };
}

export async function createMaintenanceItem({
  title,
  notes,
  intervalKm,
  lastCompletedKm,
}: {
  title: string;
  notes?: string | null;
  intervalKm?: number | null;
  lastCompletedKm?: number | null;
}): Promise<void> {
  const cleanedTitle = title.trim();

  if (!cleanedTitle) {
    throw new Error(
      "Maintenance title is required."
    );
  }

  if (intervalKm != null) {
    validateNonNegativeNumber(
      intervalKm,
      "Maintenance interval"
    );

    if (intervalKm === 0) {
      throw new Error(
        "Maintenance interval must be greater than zero."
      );
    }
  }

  if (lastCompletedKm != null) {
    validateNonNegativeNumber(
      lastCompletedKm,
      "Last completed odometer"
    );
  }

  await saveMaintenanceItem({
    title: cleanedTitle,
    notes:
      notes?.trim()
        ? notes.trim()
        : null,
    intervalKm:
      intervalKm ?? null,
    lastCompletedKm:
      lastCompletedKm ?? null,
  });
}

export async function loadMaintenanceItems(
  currentOdometerKm: number
): Promise<MaintenanceItemWithStatus[]> {
  validateNonNegativeNumber(
    currentOdometerKm,
    "Current odometer"
  );

  const items =
    await getMaintenanceItems();

  return items.map((item) =>
    calculateMaintenanceStatus(
      item,
      currentOdometerKm
    )
  );
}

export async function completeMaintenanceItem(
  item: MaintenanceItem,
  completedAtOdometerKm: number
): Promise<void> {
  validateNonNegativeNumber(
    completedAtOdometerKm,
    "Completed odometer"
  );

  await updateMaintenanceItem(
    item.id,
    {
      title: item.title,
      notes: item.notes,
      intervalKm: item.intervalKm,
      lastCompletedKm:
        completedAtOdometerKm,
    }
  );
}