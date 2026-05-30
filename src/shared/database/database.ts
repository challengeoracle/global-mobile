import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("offpay.db");

export async function initDatabase() {
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
    `);
}
