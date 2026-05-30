import { randomUUID } from "expo-crypto";

import { CatalogSyncItem } from "@/src/domains/catalog/types/catalog";
import { OrderSyncRequest } from "@/src/domains/order/types/order";
import { db } from "@/src/shared/database/database";

type SyncQueueStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "REJECTED";

type SyncQueueRow = {
    id: string;
    operation_id: string;
    entity_type: string;
    operation_type: string;
    payload_json: string;
    status: SyncQueueStatus;
    attempts: number;
    last_error: string | null;
    created_at: string;
    updated_at: string;
    synced_at: string | null;
    next_retry_at: string | null;
};

type CountRow = {
    total: number;
};

type ErrorRow = {
    last_error: string | null;
    updated_at: string;
};

type PendingCatalogChange = CatalogSyncItem & {
    queueId: string;
    operationId: string;
    entityType: string;
    status: SyncQueueStatus;
    attempts: number;
    lastError?: string | null;
};

type PendingOrderSync = OrderSyncRequest["orders"][number] & {
    queueId: string;
    operationId: string;
    entityType: string;
    status: SyncQueueStatus;
    attempts: number;
    lastError?: string | null;
};

function now() {
    return new Date().toISOString();
}

function buildCatalogPayload(change: CatalogSyncItem) {
    return JSON.stringify({
        productId: change.productId ?? undefined,
        categoryId: change.categoryId ?? undefined,
        name: change.name ?? undefined,
        description: change.description ?? undefined,
        price: change.price ?? undefined,
        stockQuantity: change.stockQuantity ?? undefined,
        quantityDelta: change.quantityDelta ?? undefined,
        localUpdatedAt: change.localUpdatedAt,
    });
}

function getCatalogEntityType(operation: CatalogSyncItem["operation"]) {
    return operation.startsWith("CATEGORY_") ? "CATEGORY" : "PRODUCT";
}

function parseCatalogRow(row: SyncQueueRow): PendingCatalogChange {
    const payload = JSON.parse(row.payload_json) as Omit<CatalogSyncItem, "operation" | "operationId">;

    return {
        queueId: row.id,
        operationId: row.operation_id,
        entityType: row.entity_type,
        operation: row.operation_type as CatalogSyncItem["operation"],
        productId: payload.productId,
        categoryId: payload.categoryId,
        name: payload.name,
        description: payload.description,
        price: payload.price,
        stockQuantity: payload.stockQuantity,
        quantityDelta: payload.quantityDelta,
        localUpdatedAt: payload.localUpdatedAt,
        status: row.status,
        attempts: row.attempts,
        lastError: row.last_error,
    };
}

function parseOrderRow(row: SyncQueueRow): PendingOrderSync {
    const payload = JSON.parse(row.payload_json) as OrderSyncRequest["orders"][number];

    return {
        queueId: row.id,
        operationId: row.operation_id,
        entityType: row.entity_type,
        localOrderId: payload.localOrderId,
        customerId: payload.customerId,
        offlineCreatedAt: payload.offlineCreatedAt,
        items: payload.items,
        status: row.status,
        attempts: row.attempts,
        lastError: row.last_error,
    };
}

function getReadyQueueQuery(tableName: "catalog_sync_queue" | "order_sync_queue") {
    return `
        SELECT
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
        FROM ${tableName}
        WHERE status IN ('PENDING', 'SYNCING')
           OR (status = 'FAILED' AND (next_retry_at IS NULL OR next_retry_at <= ?))
        ORDER BY created_at ASC
    `;
}

function getPendingCountQuery(tableName: "catalog_sync_queue" | "order_sync_queue") {
    return `
        SELECT COUNT(*) AS total
        FROM ${tableName}
        WHERE status IN ('PENDING', 'FAILED', 'SYNCING')
    `;
}

function getRejectedCountQuery(tableName: "catalog_sync_queue" | "order_sync_queue") {
    return `
        SELECT COUNT(*) AS total
        FROM ${tableName}
        WHERE status = 'REJECTED'
    `;
}

function getLatestErrorQuery(tableName: "catalog_sync_queue" | "order_sync_queue") {
    return `
        SELECT last_error, updated_at
        FROM ${tableName}
        WHERE status IN ('FAILED', 'REJECTED')
          AND last_error IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 1
    `;
}

async function markQueueItemsSyncing(tableName: "catalog_sync_queue" | "order_sync_queue", queueIds: string[]) {
    if (!queueIds.length) {
        return;
    }

    const placeholders = queueIds.map(() => "?").join(", ");
    const timestamp = now();

    await db.runAsync(
        `
            UPDATE ${tableName}
            SET status = 'SYNCING',
                updated_at = ?,
                last_error = NULL
            WHERE id IN (${placeholders})
        `,
        [timestamp, ...queueIds],
    );
}

async function markQueueItemStatus(params: {
    tableName: "catalog_sync_queue" | "order_sync_queue";
    queueId: string;
    status: Extract<SyncQueueStatus, "SYNCED" | "REJECTED">;
    lastError?: string | null;
}) {
    const timestamp = now();

    await db.runAsync(
        `
            UPDATE ${params.tableName}
            SET status = ?,
                updated_at = ?,
                synced_at = ?,
                next_retry_at = NULL,
                last_error = ?
            WHERE id = ?
        `,
        [params.status, timestamp, params.status === "SYNCED" ? timestamp : null, params.status === "REJECTED" ? params.lastError ?? null : null, params.queueId],
    );
}

async function markQueueItemFailed(params: {
    tableName: "catalog_sync_queue" | "order_sync_queue";
    queueId: string;
    lastError: string;
    nextRetryAt: string;
}) {
    const timestamp = now();

    await db.runAsync(
        `
            UPDATE ${params.tableName}
            SET status = 'FAILED',
                attempts = attempts + 1,
                updated_at = ?,
                next_retry_at = ?,
                last_error = ?,
                synced_at = NULL
            WHERE id = ?
        `,
        [timestamp, params.nextRetryAt, params.lastError, params.queueId],
    );
}

export async function enqueueCatalogChange(change: CatalogSyncItem) {
    const id = randomUUID();
    const operationId = change.operationId ?? randomUUID();
    const timestamp = now();

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
        [id, operationId, getCatalogEntityType(change.operation), change.operation, buildCatalogPayload(change), "PENDING", 0, null, timestamp, timestamp, null, null],
    );

    return operationId;
}

export async function getPendingCatalogChanges() {
    const rows = await db.getAllAsync<SyncQueueRow>(getReadyQueueQuery("catalog_sync_queue"), [now()]);
    return rows.map(parseCatalogRow);
}

export async function countPendingCatalogChanges() {
    const row = await db.getFirstAsync<CountRow>(getPendingCountQuery("catalog_sync_queue"));
    return row?.total ?? 0;
}

export async function countRejectedCatalogChanges() {
    const row = await db.getFirstAsync<CountRow>(getRejectedCountQuery("catalog_sync_queue"));
    return row?.total ?? 0;
}

export async function getLatestCatalogQueueError() {
    return db.getFirstAsync<ErrorRow>(getLatestErrorQuery("catalog_sync_queue"));
}

export async function markCatalogChangesSyncing(queueIds: string[]) {
    await markQueueItemsSyncing("catalog_sync_queue", queueIds);
}

export async function markCatalogChangeSynced(queueId: string) {
    await markQueueItemStatus({
        tableName: "catalog_sync_queue",
        queueId,
        status: "SYNCED",
    });
}

export async function markCatalogChangeRejected(queueId: string, message?: string | null) {
    await markQueueItemStatus({
        tableName: "catalog_sync_queue",
        queueId,
        status: "REJECTED",
        lastError: message ?? null,
    });
}

export async function markCatalogChangeFailed(queueId: string, message: string, nextRetryAt: string) {
    await markQueueItemFailed({
        tableName: "catalog_sync_queue",
        queueId,
        lastError: message,
        nextRetryAt,
    });
}

export async function enqueueOrderSync(localOrderId: string, payload: OrderSyncRequest["orders"][number]) {
    const id = randomUUID();
    const timestamp = now();

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
        [id, localOrderId, "ORDER", "CREATE", JSON.stringify(payload), "PENDING", 0, null, timestamp, timestamp, null, null],
    );

    return localOrderId;
}

export async function getPendingOrderSyncQueue() {
    const rows = await db.getAllAsync<SyncQueueRow>(getReadyQueueQuery("order_sync_queue"), [now()]);
    return rows.map(parseOrderRow);
}

export async function countPendingOrderSyncQueue() {
    const row = await db.getFirstAsync<CountRow>(getPendingCountQuery("order_sync_queue"));
    return row?.total ?? 0;
}

export async function countRejectedOrderSyncQueue() {
    const row = await db.getFirstAsync<CountRow>(getRejectedCountQuery("order_sync_queue"));
    return row?.total ?? 0;
}

export async function getLatestOrderQueueError() {
    return db.getFirstAsync<ErrorRow>(getLatestErrorQuery("order_sync_queue"));
}

export async function markOrderQueueSyncing(queueIds: string[]) {
    await markQueueItemsSyncing("order_sync_queue", queueIds);
}

export async function markOrderQueueSynced(queueId: string) {
    await markQueueItemStatus({
        tableName: "order_sync_queue",
        queueId,
        status: "SYNCED",
    });
}

export async function markOrderQueueRejected(queueId: string, message?: string | null) {
    await markQueueItemStatus({
        tableName: "order_sync_queue",
        queueId,
        status: "REJECTED",
        lastError: message ?? null,
    });
}

export async function markOrderQueueFailed(queueId: string, message: string, nextRetryAt: string) {
    await markQueueItemFailed({
        tableName: "order_sync_queue",
        queueId,
        lastError: message,
        nextRetryAt,
    });
}
