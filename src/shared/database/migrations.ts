import { db } from "./database";

type TableInfoRow = {
    name: string;
};

type LegacyCatalogQueueRow = {
    id: string;
    operation: string;
    product_id: string | null;
    category_id: string | null;
    name: string | null;
    description: string | null;
    price: number | null;
    stock_quantity: number | null;
    quantity_delta: number | null;
    local_updated_at: string | null;
    status: string | null;
    message: string | null;
};

type LegacyOrderQueueRow = {
    id: string;
    local_order_id: string;
    payload: string;
    status: string | null;
    message: string | null;
    created_at: string | null;
    synced_at: string | null;
};

type PendingOrderRow = {
    local_order_id: string;
    customer_id: string | null;
    created_at: string;
    offline_created_at: string | null;
};

type PendingOrderItemRow = {
    product_id: string;
    quantity: number;
    unit_price: number;
};

const STANDARD_SYNC_QUEUE_COLUMNS = ["id", "operation_id", "entity_type", "operation_type", "payload_json", "status", "attempts", "last_error", "created_at", "updated_at", "synced_at", "next_retry_at"] as const;
const VALID_SYNC_STATUSES = new Set(["PENDING", "SYNCING", "SYNCED", "FAILED", "REJECTED"]);

function now() {
    return new Date().toISOString();
}

function normalizeStatus(status?: string | null) {
    if (!status) {
        return "PENDING";
    }

    return VALID_SYNC_STATUSES.has(status) ? status : "PENDING";
}

function getCatalogEntityType(operation: string) {
    return operation.startsWith("CATEGORY_") ? "CATEGORY" : "PRODUCT";
}

function hasStandardSyncQueueSchema(columns: string[]) {
    return STANDARD_SYNC_QUEUE_COLUMNS.every((column) => columns.includes(column));
}

async function getTableColumns(tableName: "catalog_sync_queue" | "order_sync_queue") {
    const rows = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${tableName})`);
    return rows.map((row) => row.name);
}

async function getAnyTableColumns(tableName: string) {
    const rows = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${tableName})`);
    return rows.map((row) => row.name);
}

async function createStandardSyncQueueTable(tableName: "catalog_sync_queue" | "order_sync_queue") {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id TEXT PRIMARY KEY NOT NULL,
            operation_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            operation_type TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            synced_at TEXT,
            next_retry_at TEXT
        );
    `);

    await ensureSyncQueueIndexes(tableName);
}

async function ensureSyncQueueIndexes(tableName: "catalog_sync_queue" | "order_sync_queue") {
    await db.execAsync(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_operation_id
        ON ${tableName}(operation_id);

        CREATE INDEX IF NOT EXISTS idx_${tableName}_status_retry
        ON ${tableName}(status, next_retry_at, created_at);
    `);
}

async function recreateCatalogSyncQueue() {
    const legacyRows = await db.getAllAsync<LegacyCatalogQueueRow>(`
        SELECT
            id,
            operation,
            product_id,
            category_id,
            name,
            description,
            price,
            stock_quantity,
            quantity_delta,
            local_updated_at,
            status,
            message
        FROM catalog_sync_queue
    `);

    await db.execAsync(`
        DROP TABLE catalog_sync_queue;
    `);

    await createStandardSyncQueueTable("catalog_sync_queue");

    for (const row of legacyRows) {
        const createdAt = row.local_updated_at ?? now();
        const status = normalizeStatus(row.status);
        const payload = JSON.stringify({
            productId: row.product_id ?? undefined,
            categoryId: row.category_id ?? undefined,
            name: row.name ?? undefined,
            description: row.description ?? undefined,
            price: row.price ?? undefined,
            stockQuantity: row.stock_quantity ?? undefined,
            quantityDelta: row.quantity_delta ?? undefined,
            localUpdatedAt: row.local_updated_at ?? createdAt,
        });

        await db.runAsync(
            `
                INSERT INTO catalog_sync_queue (
                    id,
                    operation_id,
                    entity_type,
                    operation_type,
                    payload_json,
                    status,
                    attempts,
                    last_error,
                    created_at,
                    updated_at,
                    synced_at,
                    next_retry_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                row.id,
                row.id,
                getCatalogEntityType(row.operation),
                row.operation,
                payload,
                status,
                0,
                status === "FAILED" || status === "REJECTED" ? row.message ?? null : null,
                createdAt,
                createdAt,
                status === "SYNCED" ? createdAt : null,
                null,
            ],
        );
    }
}

async function recreateOrderSyncQueue() {
    const rawLegacyRows = await db.getAllAsync<LegacyOrderQueueRow>(`
        SELECT
            id,
            local_order_id,
            payload,
            status,
            message,
            created_at,
            synced_at
        FROM order_sync_queue
    `);
    const legacyRows = Array.from(new Map(rawLegacyRows.map((row) => [row.local_order_id, row])).values());

    await db.execAsync(`
        DROP TABLE order_sync_queue;
    `);

    await createStandardSyncQueueTable("order_sync_queue");

    for (const row of legacyRows) {
        const createdAt = row.created_at ?? row.synced_at ?? now();
        const updatedAt = row.synced_at ?? createdAt;
        const status = normalizeStatus(row.status);

        await db.runAsync(
            `
                INSERT INTO order_sync_queue (
                    id,
                    operation_id,
                    entity_type,
                    operation_type,
                    payload_json,
                    status,
                    attempts,
                    last_error,
                    created_at,
                    updated_at,
                    synced_at,
                    next_retry_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                row.id,
                row.local_order_id,
                "ORDER",
                "CREATE",
                row.payload,
                status,
                0,
                status === "FAILED" || status === "REJECTED" ? row.message ?? null : null,
                createdAt,
                updatedAt,
                status === "SYNCED" ? row.synced_at ?? updatedAt : null,
                null,
            ],
        );
    }
}

async function backfillPendingOrdersIntoQueue() {
    const orders = await db.getAllAsync<PendingOrderRow>(`
        SELECT
            local_order_id,
            customer_id,
            created_at,
            offline_created_at
        FROM orders
        WHERE sync_status = 'PENDING'
        ORDER BY created_at ASC
    `);

    for (const order of orders) {
        const existing = await db.getFirstAsync<{ id: string }>(
            `
                SELECT id
                FROM order_sync_queue
                WHERE operation_id = ?
                LIMIT 1
            `,
            [order.local_order_id],
        );

        if (existing) {
            continue;
        }

        const items = await db.getAllAsync<PendingOrderItemRow>(
            `
                SELECT
                    product_id,
                    quantity,
                    unit_price
                FROM order_items
                WHERE order_id = (
                    SELECT id
                    FROM orders
                    WHERE local_order_id = ?
                    LIMIT 1
                )
                ORDER BY id ASC
            `,
            [order.local_order_id],
        );

        const createdAt = order.offline_created_at ?? order.created_at;
        const payload = JSON.stringify({
            localOrderId: order.local_order_id,
            customerId: order.customer_id ?? undefined,
            offlineCreatedAt: createdAt,
            items: items.map((item) => ({
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: item.unit_price,
            })),
        });

        await db.runAsync(
            `
                INSERT INTO order_sync_queue (
                    id,
                    operation_id,
                    entity_type,
                    operation_type,
                    payload_json,
                    status,
                    attempts,
                    last_error,
                    created_at,
                    updated_at,
                    synced_at,
                    next_retry_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [order.local_order_id, order.local_order_id, "ORDER", "CREATE", payload, "PENDING", 0, null, createdAt, createdAt, null, null],
        );
    }
}

async function ensureCatalogSyncQueueSchema() {
    const columns = await getTableColumns("catalog_sync_queue");

    if (!columns.length) {
        await createStandardSyncQueueTable("catalog_sync_queue");
        return;
    }

    if (!hasStandardSyncQueueSchema(columns)) {
        await recreateCatalogSyncQueue();
        return;
    }

    await ensureSyncQueueIndexes("catalog_sync_queue");
}

async function ensureOrderSyncQueueSchema() {
    const columns = await getTableColumns("order_sync_queue");

    if (!columns.length) {
        await createStandardSyncQueueTable("order_sync_queue");
        await backfillPendingOrdersIntoQueue();
        return;
    }

    if (!hasStandardSyncQueueSchema(columns)) {
        await recreateOrderSyncQueue();
    } else {
        await ensureSyncQueueIndexes("order_sync_queue");
    }

    await backfillPendingOrdersIntoQueue();
}

async function ensureOrdersTableSchema() {
    const columns = await getAnyTableColumns("orders");

    if (!columns.includes("updated_at")) {
        await db.execAsync(`
            ALTER TABLE orders
            ADD COLUMN updated_at TEXT;
        `);

        await db.execAsync(`
            UPDATE orders
            SET updated_at = COALESCE(updated_at, synced_at, offline_created_at, created_at)
            WHERE updated_at IS NULL;
        `);
    }

    if (!columns.includes("owner_user_id")) {
        await db.execAsync(`
            ALTER TABLE orders
            ADD COLUMN owner_user_id TEXT;
        `);
    }

    if (!columns.includes("owner_store_id")) {
        await db.execAsync(`
            ALTER TABLE orders
            ADD COLUMN owner_store_id TEXT;
        `);
    }

    if (!columns.includes("owner_role")) {
        await db.execAsync(`
            ALTER TABLE orders
            ADD COLUMN owner_role TEXT;
        `);
    }

    if (!columns.includes("confirmed_at")) {
        await db.execAsync(`
            ALTER TABLE orders
            ADD COLUMN confirmed_at TEXT;
        `);

        await db.execAsync(`
            UPDATE orders
            SET confirmed_at = COALESCE(confirmed_at, offline_created_at, created_at)
            WHERE confirmed_at IS NULL
              AND sync_status IN ('CONFIRMED', 'SELLER_CONFIRMED', 'SYNCED', 'OFFLINE_SYNCED', 'REJECTED');
        `);
    }

    if (!columns.includes("server_synced_at")) {
        await db.execAsync(`
            ALTER TABLE orders
            ADD COLUMN server_synced_at TEXT;
        `);

        await db.execAsync(`
            UPDATE orders
            SET server_synced_at = synced_at
            WHERE server_synced_at IS NULL
              AND sync_status IN ('SYNCED', 'OFFLINE_SYNCED', 'REJECTED');
        `);
    }

    await db.execAsync(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_local_order_id
        ON orders(local_order_id);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_remote_order_id
        ON orders(remote_order_id)
        WHERE remote_order_id IS NOT NULL;
    `);
}

async function ensureCatalogTablesSchema() {
    const categoryColumns = await getAnyTableColumns("categories");
    const productColumns = await getAnyTableColumns("products");

    if (!categoryColumns.includes("owner_user_id")) {
        await db.execAsync(`
            ALTER TABLE categories
            ADD COLUMN owner_user_id TEXT;
        `);
    }

    if (!categoryColumns.includes("owner_store_id")) {
        await db.execAsync(`
            ALTER TABLE categories
            ADD COLUMN owner_store_id TEXT;
        `);
    }

    if (!categoryColumns.includes("owner_role")) {
        await db.execAsync(`
            ALTER TABLE categories
            ADD COLUMN owner_role TEXT;
        `);
    }

    if (!productColumns.includes("owner_user_id")) {
        await db.execAsync(`
            ALTER TABLE products
            ADD COLUMN owner_user_id TEXT;
        `);
    }

    if (!productColumns.includes("owner_store_id")) {
        await db.execAsync(`
            ALTER TABLE products
            ADD COLUMN owner_store_id TEXT;
        `);
    }

    if (!productColumns.includes("owner_role")) {
        await db.execAsync(`
            ALTER TABLE products
            ADD COLUMN owner_role TEXT;
        `);
    }
}

async function ensureSyncQueueOwnerSchema(tableName: "catalog_sync_queue" | "order_sync_queue") {
    const columns = await getAnyTableColumns(tableName);

    if (!columns.includes("owner_user_id")) {
        await db.execAsync(`
            ALTER TABLE ${tableName}
            ADD COLUMN owner_user_id TEXT;
        `);
    }

    if (!columns.includes("owner_store_id")) {
        await db.execAsync(`
            ALTER TABLE ${tableName}
            ADD COLUMN owner_store_id TEXT;
        `);
    }

    if (!columns.includes("owner_role")) {
        await db.execAsync(`
            ALTER TABLE ${tableName}
            ADD COLUMN owner_role TEXT;
        `);
    }
}

export async function runMigrations() {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            owner_user_id TEXT,
            owner_store_id TEXT,
            owner_role TEXT
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
            owner_user_id TEXT,
            owner_store_id TEXT,
            owner_role TEXT,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        );

        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY NOT NULL,
            remote_order_id TEXT,
            local_order_id TEXT NOT NULL,
            store_id TEXT,
            customer_id TEXT,
            seller_id TEXT,
            order_status TEXT NOT NULL,
            payment_status TEXT NOT NULL,
            sync_status TEXT NOT NULL,
            total_amount REAL NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            offline_created_at TEXT,
            confirmed_at TEXT,
            server_synced_at TEXT,
            synced_at TEXT,
            owner_user_id TEXT,
            owner_store_id TEXT,
            owner_role TEXT
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
    `);

    await ensureOrdersTableSchema();
    await ensureCatalogTablesSchema();
    await ensureCatalogSyncQueueSchema();
    await ensureOrderSyncQueueSchema();
    await ensureSyncQueueOwnerSchema("catalog_sync_queue");
    await ensureSyncQueueOwnerSchema("order_sync_queue");
}
