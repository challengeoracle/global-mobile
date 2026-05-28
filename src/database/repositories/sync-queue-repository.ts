import { randomUUID } from "expo-crypto";

import { db } from "../database";

import { CatalogSyncItem, OrderSyncRequest } from "../../types/sales";

type CatalogQueueRow = {
    id: string;
    operation: string;
    product_id: string | null;
    category_id: string | null;
    name: string | null;
    description: string | null;
    price: number | null;
    stock_quantity: number | null;
    quantity_delta: number | null;
    local_updated_at: string;
    status: string;
    message: string | null;
};

type OrderQueueRow = {
    id: string;
    local_order_id: string;
    payload: string;
    status: string;
    message: string | null;
    created_at: string;
    synced_at: string | null;
};

function now() {
    return new Date().toISOString();
}

export async function enqueueCatalogChange(change: CatalogSyncItem) {
    const id = randomUUID();

    await db.runAsync(
        `
            INSERT INTO catalog_sync_queue (
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [id, change.operation, change.productId ?? null, change.categoryId ?? null, change.name ?? null, change.description ?? null, change.price ?? null, change.stockQuantity ?? null, change.quantityDelta ?? null, change.localUpdatedAt, "PENDING", null],
    );

    return id;
}

export async function getPendingCatalogChanges() {
    const rows = await db.getAllAsync<CatalogQueueRow>(`
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
        WHERE status = 'PENDING'
        ORDER BY local_updated_at ASC
    `);

    return rows.map((row) => ({
        queueId: row.id,
        operation: row.operation as CatalogSyncItem["operation"],
        productId: row.product_id ?? undefined,
        categoryId: row.category_id ?? undefined,
        name: row.name ?? undefined,
        description: row.description ?? undefined,
        price: row.price ?? undefined,
        stockQuantity: row.stock_quantity ?? undefined,
        quantityDelta: row.quantity_delta ?? undefined,
        localUpdatedAt: row.local_updated_at,
    }));
}

export async function markCatalogChangeSynced(queueId: string, message?: string | null) {
    await db.runAsync(
        `
            UPDATE catalog_sync_queue
            SET status = 'SYNCED',
                message = ?
            WHERE id = ?
        `,
        [message ?? null, queueId],
    );
}

export async function markCatalogChangeRejected(queueId: string, message?: string | null) {
    await db.runAsync(
        `
            UPDATE catalog_sync_queue
            SET status = 'REJECTED',
                message = ?
            WHERE id = ?
        `,
        [message ?? null, queueId],
    );
}

export async function enqueueOrderSync(localOrderId: string, payload: OrderSyncRequest["orders"][number]) {
    const id = randomUUID();

    await db.runAsync(
        `
            INSERT INTO order_sync_queue (
                id,
                local_order_id,
                payload,
                status,
                message,
                created_at,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [id, localOrderId, JSON.stringify(payload), "PENDING", null, now(), null],
    );

    return id;
}

export async function getPendingOrderSyncQueue() {
    return db.getAllAsync<OrderQueueRow>(`
        SELECT
            id,
            local_order_id,
            payload,
            status,
            message,
            created_at,
            synced_at
        FROM order_sync_queue
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
    `);
}

export async function markOrderQueueSynced(localOrderId: string, message?: string | null) {
    await db.runAsync(
        `
            UPDATE order_sync_queue
            SET status = 'SYNCED',
                message = ?,
                synced_at = ?
            WHERE local_order_id = ?
        `,
        [message ?? null, now(), localOrderId],
    );
}

export async function markOrderQueueRejected(localOrderId: string, message?: string | null) {
    await db.runAsync(
        `
            UPDATE order_sync_queue
            SET status = 'REJECTED',
                message = ?,
                synced_at = ?
            WHERE local_order_id = ?
        `,
        [message ?? null, now(), localOrderId],
    );
}

export async function parseOrderQueuePayload(row: OrderQueueRow) {
    return JSON.parse(row.payload) as OrderSyncRequest["orders"][number];
}
