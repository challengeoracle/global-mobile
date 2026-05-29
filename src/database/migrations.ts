import { db } from "./database";

export async function runMigrations() {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY NOT NULL,
            category_id TEXT NOT NULL,
            store_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            stock_quantity INTEGER NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        );

        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY NOT NULL,
            remote_order_id TEXT,
            local_order_id TEXT NOT NULL,
            store_id TEXT,
            customer_id TEXT,
            seller_id TEXT,
            device_id TEXT,
            order_status TEXT NOT NULL,
            payment_status TEXT NOT NULL,
            sync_status TEXT NOT NULL,
            total_amount REAL NOT NULL,
            created_at TEXT NOT NULL,
            offline_created_at TEXT,
            synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY NOT NULL,
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            unit_price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            total_price REAL NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id)
        );

        CREATE TABLE IF NOT EXISTS catalog_sync_queue (
            id TEXT PRIMARY KEY NOT NULL,
            operation TEXT NOT NULL,
            product_id TEXT,
            category_id TEXT,
            name TEXT,
            description TEXT,
            price REAL,
            stock_quantity INTEGER,
            quantity_delta INTEGER,
            local_updated_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            message TEXT
        );

        CREATE TABLE IF NOT EXISTS order_sync_queue (
            id TEXT PRIMARY KEY NOT NULL,
            local_order_id TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            message TEXT,
            created_at TEXT NOT NULL,
            synced_at TEXT
        );

    `);
}
