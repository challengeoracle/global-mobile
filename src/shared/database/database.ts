import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("offpay.db");
let databaseReadyPromise: Promise<void> | null = null;

export async function initDatabase() {
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
    `);
}

export function markDatabaseReady(promise: Promise<void>) {
    databaseReadyPromise = promise;
}

export async function waitForDatabaseReady() {
    await databaseReadyPromise;
}
