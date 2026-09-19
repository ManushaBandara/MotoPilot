import * as SQLite from "expo-sqlite";

import type {
  DashcamClip,
  DashcamClipStatus,
} from "./camera/dashcamTypes";

const DATABASE_NAME = "motopilot.db";
const DATABASE_VERSION = 5;

let database: SQLite.SQLiteDatabase | null = null;

let databaseInitializationPromise:
  Promise<SQLite.SQLiteDatabase> | null = null;

/* ============================================================
   TYPES
   ============================================================ */

export type RideRoutePoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

export type Ride = {
  id: number;
  startedAt: string;
  durationSeconds: number;
  distanceKm: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  route: RideRoutePoint[];
};

export type FuelEntry = {
  id: number;
  addedAt: string;
  amountLitres: number;
  pricePerLitre: number | null;
  amountSpent: number | null;
  odometerKm: number | null;
  isFullTank: boolean;
};

export type MaintenanceItem = {
  id: number;
  title: string;
  notes: string | null;
  intervalKm: number | null;
  lastCompletedKm: number | null;
  createdAt: string;
};

export type AppSetting = {
  key: string;
  value: string;
};

/* ============================================================
   DATABASE INITIALIZATION
   ============================================================ */

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db =
    await SQLite.openDatabaseAsync(
      DATABASE_NAME
    );

  await db.execAsync(`
  CREATE TABLE IF NOT EXISTS rides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    distance_km REAL NOT NULL,
    average_speed_kmh REAL NOT NULL,
    max_speed_kmh REAL NOT NULL,
    route TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS fuel_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    added_at TEXT NOT NULL,
    amount_litres REAL NOT NULL,
    price_per_litre REAL,
    amount_spent REAL,
    odometer_km REAL,
    is_full_tank INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    notes TEXT,
    interval_km REAL,
    last_completed_km REAL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dashcam_clips (
    id TEXT PRIMARY KEY NOT NULL,
    file_uri TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds REAL NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    status TEXT NOT NULL,
    start_latitude REAL,
    start_longitude REAL,
    end_latitude REAL,
    end_longitude REAL
  );
`);

  /* ============================================================
     RIDES MIGRATION
     ============================================================ */

  const rideColumns =
    await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(rides);`
    );

  const hasRouteColumn =
    rideColumns.some(
      (column) =>
        column.name === "route"
    );

  if (!hasRouteColumn) {
    await db.execAsync(`
      ALTER TABLE rides
      ADD COLUMN route TEXT NOT NULL DEFAULT '[]';
    `);
  }

  /* ============================================================
     FUEL MIGRATIONS
     ============================================================ */

  const fuelColumns =
    await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(fuel_entries);`
    );

  const hasPriceColumn =
    fuelColumns.some(
      (column) =>
        column.name ===
        "price_per_litre"
    );

  const hasAmountSpentColumn =
    fuelColumns.some(
      (column) =>
        column.name ===
        "amount_spent"
    );

  const hasFullTankColumn =
    fuelColumns.some(
      (column) =>
        column.name ===
        "is_full_tank"
    );

  if (!hasPriceColumn) {
    await db.execAsync(`
      ALTER TABLE fuel_entries
      ADD COLUMN price_per_litre REAL;
    `);
  }

  if (!hasAmountSpentColumn) {
    await db.execAsync(`
      ALTER TABLE fuel_entries
      ADD COLUMN amount_spent REAL;
    `);
  }

  if (!hasFullTankColumn) {
    await db.execAsync(`
      ALTER TABLE fuel_entries
      ADD COLUMN is_full_tank INTEGER NOT NULL DEFAULT 0;
    `);
  }

  /* ============================================================
     DATABASE VERSION
     ============================================================ */

  await db.execAsync(`
    PRAGMA user_version = ${DATABASE_VERSION};
  `);

  return db;
}

/* ============================================================
   GET DATABASE
   ============================================================ */

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  if (databaseInitializationPromise) {
    return databaseInitializationPromise;
  }

  databaseInitializationPromise =
    initializeDatabase();

  try {
    database =
      await databaseInitializationPromise;

    return database;
  } catch (error) {
    databaseInitializationPromise = null;
    database = null;
    throw error;
  } finally {
    databaseInitializationPromise = null;
  }
}

/* ============================================================
   RIDES
   ============================================================ */

export async function saveRide(ride: {
  startedAt: string;
  durationSeconds: number;
  distanceKm: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  route?: RideRoutePoint[];
}): Promise<void> {
  const db = await getDatabase();

  const route = ride.route ?? [];

  await db.runAsync(
    `
      INSERT INTO rides (
        started_at,
        duration_seconds,
        distance_km,
        average_speed_kmh,
        max_speed_kmh,
        route
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ride.startedAt,
    ride.durationSeconds,
    ride.distanceKm,
    ride.averageSpeedKmh,
    ride.maxSpeedKmh,
    JSON.stringify(route)
  );
}

export async function getRides(): Promise<Ride[]> {
  const db = await getDatabase();

  const rows =
    await db.getAllAsync<{
      id: number;
      started_at: string;
      duration_seconds: number;
      distance_km: number;
      average_speed_kmh: number;
      max_speed_kmh: number;
      route: string;
    }>(
      `
        SELECT
          id,
          started_at,
          duration_seconds,
          distance_km,
          average_speed_kmh,
          max_speed_kmh,
          route
        FROM rides
        ORDER BY started_at DESC
      `
    );

  return rows.map((row) => {
    let route: RideRoutePoint[] = [];

    try {
      const parsed = JSON.parse(row.route);

      if (Array.isArray(parsed)) {
        route = parsed;
      }
    } catch {
      route = [];
    }

    return {
      id: row.id,
      startedAt: row.started_at,
      durationSeconds:
        row.duration_seconds,
      distanceKm: row.distance_km,
      averageSpeedKmh:
        row.average_speed_kmh,
      maxSpeedKmh:
        row.max_speed_kmh,
      route,
    };
  });
}

export async function deleteRide(
  rideId: number
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM rides
      WHERE id = ?
    `,
    rideId
  );
}

export async function deleteAllRides(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    DELETE FROM rides
  `);
}

export async function getRidesForDateRange(
  startDate: string,
  endDate: string
): Promise<Ride[]> {
  const db = await getDatabase();

  const rows =
    await db.getAllAsync<{
      id: number;
      started_at: string;
      duration_seconds: number;
      distance_km: number;
      average_speed_kmh: number;
      max_speed_kmh: number;
      route: string;
    }>(
      `
        SELECT
          id,
          started_at,
          duration_seconds,
          distance_km,
          average_speed_kmh,
          max_speed_kmh,
          route
        FROM rides
        WHERE started_at >= ?
          AND started_at < ?
        ORDER BY started_at ASC
      `,
      startDate,
      endDate
    );

  return rows.map((row) => {
    let route: RideRoutePoint[] = [];

    try {
      const parsed = JSON.parse(row.route);

      if (Array.isArray(parsed)) {
        route = parsed;
      }
    } catch {
      route = [];
    }

    return {
      id: row.id,
      startedAt: row.started_at,
      durationSeconds:
        row.duration_seconds,
      distanceKm:
        row.distance_km,
      averageSpeedKmh:
        row.average_speed_kmh,
      maxSpeedKmh:
        row.max_speed_kmh,
      route,
    };
  });
}

/* ============================================================
   FUEL
   ============================================================ */

export async function saveFuelEntry(entry: {
  addedAt: string;
  amountLitres: number;
  pricePerLitre?: number | null;
  amountSpent?: number | null;
  odometerKm?: number | null;
  isFullTank?: boolean;
}): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO fuel_entries (
        added_at,
        amount_litres,
        price_per_litre,
        amount_spent,
        odometer_km,
        is_full_tank
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    entry.addedAt,
    entry.amountLitres,
    entry.pricePerLitre ?? null,
    entry.amountSpent ?? null,
    entry.odometerKm ?? null,
    entry.isFullTank ? 1 : 0
  );
}

export async function getFuelEntries(): Promise<FuelEntry[]> {
  const db = await getDatabase();

  const rows =
    await db.getAllAsync<{
      id: number;
      added_at: string;
      amount_litres: number;
      price_per_litre: number | null;
      amount_spent: number | null;
      odometer_km: number | null;
      is_full_tank: number;
    }>(
      `
        SELECT
          id,
          added_at,
          amount_litres,
          price_per_litre,
          amount_spent,
          odometer_km,
          is_full_tank
        FROM fuel_entries
        ORDER BY added_at DESC
      `
    );

  return rows.map((row) => ({
    id: row.id,
    addedAt: row.added_at,
    amountLitres: row.amount_litres,
    pricePerLitre:
      row.price_per_litre,
    amountSpent:
      row.amount_spent,
    odometerKm:
      row.odometer_km,
    isFullTank:
      row.is_full_tank === 1,
  }));
}

export async function getFuelEntriesForDateRange(
  startDate: string,
  endDate: string
): Promise<FuelEntry[]> {
  const db = await getDatabase();

  const rows =
    await db.getAllAsync<{
      id: number;
      added_at: string;
      amount_litres: number;
      price_per_litre: number | null;
      amount_spent: number | null;
      odometer_km: number | null;
      is_full_tank: number;
    }>(
      `
        SELECT
          id,
          added_at,
          amount_litres,
          price_per_litre,
          amount_spent,
          odometer_km,
          is_full_tank
        FROM fuel_entries
        WHERE added_at >= ?
          AND added_at < ?
        ORDER BY added_at ASC
      `,
      startDate,
      endDate
    );

  return rows.map((row) => ({
    id: row.id,
    addedAt: row.added_at,
    amountLitres: row.amount_litres,
    pricePerLitre:
      row.price_per_litre,
    amountSpent:
      row.amount_spent,
    odometerKm:
      row.odometer_km,
    isFullTank:
      row.is_full_tank === 1,
  }));
}

/* ============================================================
   MAINTENANCE
   ============================================================ */

export async function saveMaintenanceItem(item: {
  title: string;
  notes?: string | null;
  intervalKm?: number | null;
  lastCompletedKm?: number | null;
}): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO maintenance (
        title,
        notes,
        interval_km,
        last_completed_km,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    item.title,
    item.notes ?? null,
    item.intervalKm ?? null,
    item.lastCompletedKm ?? null,
    new Date().toISOString()
  );
}

export async function updateMaintenanceItem(
  id: number,
  item: {
    title?: string;
    notes?: string | null;
    intervalKm?: number | null;
    lastCompletedKm?: number | null;
  }
): Promise<void> {
  const db = await getDatabase();

  const existingItem =
    await db.getFirstAsync<{
      id: number;
    }>(
      `
        SELECT id
        FROM maintenance
        WHERE id = ?
      `,
      id
    );

  if (!existingItem) {
    throw new Error(
      "Maintenance item was not found."
    );
  }

  await db.runAsync(
    `
      UPDATE maintenance
      SET
        title = COALESCE(?, title),
        notes = ?,
        interval_km = COALESCE(?, interval_km),
        last_completed_km = COALESCE(?, last_completed_km)
      WHERE id = ?
    `,
    item.title ?? null,
    item.notes ?? null,
    item.intervalKm ?? null,
    item.lastCompletedKm ?? null,
    id
  );
}

export async function getMaintenanceItems(): Promise<
  MaintenanceItem[]
> {
  const db = await getDatabase();

  const rows =
    await db.getAllAsync<{
      id: number;
      title: string;
      notes: string | null;
      interval_km: number | null;
      last_completed_km: number | null;
      created_at: string;
    }>(
      `
        SELECT
          id,
          title,
          notes,
          interval_km,
          last_completed_km,
          created_at
        FROM maintenance
        ORDER BY created_at DESC
      `
    );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    notes: row.notes,
    intervalKm:
      row.interval_km,
    lastCompletedKm:
      row.last_completed_km,
    createdAt:
      row.created_at,
  }));
}

/* ============================================================
   DASHCAM
   ============================================================ */

export async function saveDashcamClip(
  clip: DashcamClip
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT OR REPLACE INTO dashcam_clips (
        id,
        file_uri,
        started_at,
        ended_at,
        duration_seconds,
        file_size_bytes,
        status,
        start_latitude,
        start_longitude,
        end_latitude,
        end_longitude
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    clip.id,
    clip.fileUri,
    clip.startedAt,
    clip.endedAt,
    clip.durationSeconds,
    clip.fileSizeBytes,
    clip.status,
    clip.startLatitude,
    clip.startLongitude,
    clip.endLatitude,
    clip.endLongitude
  );
}

export async function getDashcamClips(): Promise<
  DashcamClip[]
> {
  const db = await getDatabase();

  const rows =
    await db.getAllAsync<{
      id: string;
      file_uri: string;
      started_at: string;
      ended_at: string | null;
      duration_seconds: number;
      file_size_bytes: number;
      status: string;
      start_latitude: number | null;
      start_longitude: number | null;
      end_latitude: number | null;
      end_longitude: number | null;
    }>(
      `
        SELECT
          id,
          file_uri,
          started_at,
          ended_at,
          duration_seconds,
          file_size_bytes,
          status,
          start_latitude,
          start_longitude,
          end_latitude,
          end_longitude
        FROM dashcam_clips
        ORDER BY started_at DESC
      `
    );

  return rows.map((row) => ({
    id: row.id,
    fileUri: row.file_uri,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds:
      row.duration_seconds,
    fileSizeBytes:
      row.file_size_bytes,
    status:
      row.status as DashcamClipStatus,
    startLatitude:
      row.start_latitude,
    startLongitude:
      row.start_longitude,
    endLatitude:
      row.end_latitude,
    endLongitude:
      row.end_longitude,
  }));
}

export async function updateDashcamClipStatus(
  clipId: string,
  status: DashcamClipStatus
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      UPDATE dashcam_clips
      SET status = ?
      WHERE id = ?
    `,
    status,
    clipId
  );
}

export async function updateDashcamClipFile(
  clipId: string,
  fileUri: string,
  status: DashcamClipStatus
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      UPDATE dashcam_clips
      SET
        file_uri = ?,
        status = ?
      WHERE id = ?
    `,
    fileUri,
    status,
    clipId
  );
}

export async function deleteDashcamClip(
  clipId: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM dashcam_clips
      WHERE id = ?
    `,
    clipId
  );
}

export async function deleteAllDashcamClips(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    DELETE FROM dashcam_clips
  `);
}

/* ============================================================
   SETTINGS
   ============================================================ */

export async function setSetting(
  key: string,
  value: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO settings (
        key,
        value
      )
      VALUES (?, ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value
    `,
    key,
    value
  );
}

export async function getSetting(
  key: string
): Promise<string | null> {
  const db = await getDatabase();

  const row =
    await db.getFirstAsync<{
      value: string;
    }>(
      `
        SELECT value
        FROM settings
        WHERE key = ?
      `,
      key
    );

  return row?.value ?? null;
}