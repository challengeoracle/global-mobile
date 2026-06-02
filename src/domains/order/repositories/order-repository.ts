import { randomUUID } from "expo-crypto";

import { OrderItemRequest, OrderResponse } from "@/src/domains/order/types/order";
import { OrderConfirmationQrPayload, OrderQrPayload } from "@/src/domains/order/utils/order-qr";
import { decreaseLocalProductStock, getProductById, increaseLocalProductStock } from "@/src/domains/catalog/repositories/catalog-repository";
import { enqueueOrderSync } from "@/src/domains/sync/repositories/sync-queue-repository";
import { db } from "@/src/shared/database/database";
import { getLocalSessionContext } from "@/src/shared/lib/local-session-context";

export type LocalOrderRow = {
    id: string;
    remote_order_id: string | null;
    local_order_id: string;
    store_id: string | null;
    customer_id: string | null;
    seller_id: string | null;
    device_id: string | null;
    order_status: string;
    payment_status: string;
    sync_status: string;
    total_amount: number;
    created_at: string;
    updated_at: string | null;
    offline_created_at: string | null;
    confirmed_at: string | null;
    server_synced_at: string | null;
    synced_at: string | null;
    owner_user_id?: string | null;
    owner_store_id?: string | null;
    owner_role?: string | null;
};

export type LocalOrderItemRow = {
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    total_price: number;
};

export type PendingOrderPayload = {
    localOrderId: string;
    storeId: string | null;
    customerId?: string;
    offlineCreatedAt: string;
    items: OrderItemRequest[];
};

export type LocalOrderSyncIssue = {
    queueStatus: string;
    lastError: string | null;
    attempts: number;
    updatedAt: string;
};

type QueuedOrderRepairRow = {
    id: string;
    operation_id: string;
    payload_json: string;
    status: string;
};

type ProductIdRow = {
    id: string;
};

type OrderItemRepairRow = {
    product_name: string;
    unit_price: number;
};

function now() {
    return new Date().toISOString();
}

function getConfirmationTimestamp(order: Pick<LocalOrderRow, "confirmed_at" | "offline_created_at" | "created_at">) {
    return order.confirmed_at ?? order.offline_created_at ?? order.created_at;
}

function getServerSyncTimestamp(syncStatus?: string | null, fallback?: string | null) {
    if (syncStatus === "SYNCED" || syncStatus === "OFFLINE_SYNCED" || syncStatus === "REJECTED") {
        return fallback ?? now();
    }

    return null;
}

function buildOrderSyncMessage(syncStatus: string, issue?: LocalOrderSyncIssue | null) {
    if (syncStatus === "REJECTED") {
        return issue?.lastError ?? "O servidor rejeitou este pedido. Revise os dados e tente novamente.";
    }

    if (issue?.queueStatus === "FAILED") {
        return issue.lastError ?? "Não foi possível sincronizar agora. Uma nova tentativa será feita automaticamente.";
    }

    if (syncStatus === "SYNCED") {
        return "Pedido sincronizado com o servidor.";
    }

    if (syncStatus === "OFFLINE_SYNCED") {
        return "Pedido aceito pelo servidor e aguardando atualização final do fluxo.";
    }

    if (syncStatus === "SELLER_CONFIRMED") {
        return "Pedido confirmado pelo vendedor e salvo offline.";
    }

    if (issue?.queueStatus === "SYNCED") {
        return "Pedido sincronizado com o servidor.";
    }

    return "Pedido salvo localmente aguardando sincronização do vendedor.";
}

export async function getLocalOrderByLocalId(localOrderId: string) {
    const context = await getLocalSessionContext();

    if (!context) {
        return null;
    }

    return db.getFirstAsync<LocalOrderRow>(
        `
        SELECT
            id,
            remote_order_id,
            local_order_id,
            store_id,
            customer_id,
            seller_id,
            device_id,
            order_status,
            payment_status,
            sync_status,
            total_amount,
            created_at,
            updated_at,
            offline_created_at,
            confirmed_at,
            server_synced_at,
            synced_at,
            owner_user_id,
            owner_store_id,
            owner_role
        FROM orders
        WHERE local_order_id = ?
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
        LIMIT 1
        `,
        [localOrderId, context.userId, context.storeId, context.storeId],
    );
}

export async function getLocalOrderByRemoteId(remoteOrderId: string) {
    const context = await getLocalSessionContext();

    if (!context) {
        return null;
    }

    return db.getFirstAsync<LocalOrderRow>(
        `
        SELECT
            id,
            remote_order_id,
            local_order_id,
            store_id,
            customer_id,
            seller_id,
            device_id,
            order_status,
            payment_status,
            sync_status,
            total_amount,
            created_at,
            updated_at,
            offline_created_at,
            confirmed_at,
            server_synced_at,
            synced_at,
            owner_user_id,
            owner_store_id,
            owner_role
        FROM orders
        WHERE remote_order_id = ?
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
        LIMIT 1
        `,
        [remoteOrderId, context.userId, context.storeId, context.storeId],
    );
}

export async function getLocalOrderById(orderId: string) {
    const context = await getLocalSessionContext();

    if (!context) {
        return null;
    }

    return db.getFirstAsync<LocalOrderRow>(
        `
        SELECT
            id,
            remote_order_id,
            local_order_id,
            store_id,
            customer_id,
            seller_id,
            device_id,
            order_status,
            payment_status,
            sync_status,
            total_amount,
            created_at,
            updated_at,
            offline_created_at,
            confirmed_at,
            server_synced_at,
            synced_at,
            owner_user_id,
            owner_store_id,
            owner_role
        FROM orders
        WHERE id = ?
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
        LIMIT 1
        `,
        [orderId, context.userId, context.storeId, context.storeId],
    );
}

export async function getLocalOrderByAnyId(orderId: string) {
    const [byId, byLocalId, byRemoteId] = await Promise.all([getLocalOrderById(orderId), getLocalOrderByLocalId(orderId), getLocalOrderByRemoteId(orderId)]);
    return byId ?? byLocalId ?? byRemoteId ?? null;
}

async function createOrderItem(params: { orderId: string; productId: string; productName: string; unitPrice: number; quantity: number }) {
    const totalPrice = params.unitPrice * params.quantity;

    await db.runAsync(
        `
        INSERT INTO order_items (
            id,
            order_id,
            product_id,
            product_name,
            unit_price,
            quantity,
            total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [randomUUID(), params.orderId, params.productId, params.productName, params.unitPrice, params.quantity, totalPrice],
    );

    return totalPrice;
}

async function resolveProductName(productId: string) {
    const product = await getProductById(productId);
    return product?.name ?? `Produto ${productId.slice(0, 8)}`;
}

export async function createLocalOfflineOrder(params: {
    localOrderId?: string;
    storeId?: string | null;
    customerId?: string | null;
    sellerId?: string | null;
    items: OrderItemRequest[];
    confirmedBySeller?: boolean;
    offlineCreatedAt?: string | null;
    shouldDecreaseStock?: boolean;
    remoteOrderId?: string | null;
    syncStatus?: string | null;
    orderStatus?: string | null;
    paymentStatus?: string | null;
    enqueueSync?: boolean;
}) {
    if (!params.items.length) {
        throw new Error("Pedido precisa ter pelo menos um item.");
    }

    const localOrderId = params.localOrderId ?? randomUUID();
    const existing = await getLocalOrderByLocalId(localOrderId);

    if (existing) {
        return {
            id: existing.id,
            localOrderId: existing.local_order_id,
            totalAmount: existing.total_amount,
            duplicated: true,
        };
    }

    const orderId = randomUUID();
    const createdAt = now();
    const offlineCreatedAt = params.offlineCreatedAt ?? createdAt;
    const context = await getLocalSessionContext();

    let totalAmount = 0;

    await db.withTransactionAsync(async () => {
        await db.runAsync(
            `
            INSERT INTO orders (
                id,
                remote_order_id,
                local_order_id,
                store_id,
                customer_id,
                seller_id,
                device_id,
                order_status,
                payment_status,
                sync_status,
                total_amount,
                created_at,
                updated_at,
                offline_created_at,
                confirmed_at,
                server_synced_at,
                synced_at,
                owner_user_id,
                owner_store_id,
                owner_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [orderId, params.remoteOrderId ?? null, localOrderId, params.storeId ?? null, params.customerId ?? null, params.sellerId ?? null, null, params.orderStatus ?? (params.confirmedBySeller ? "CONFIRMED" : "CREATED"), params.paymentStatus ?? "PENDING_PAYMENT", params.syncStatus ?? "PENDING", 0, createdAt, createdAt, offlineCreatedAt, params.confirmedBySeller ? offlineCreatedAt : null, getServerSyncTimestamp(params.syncStatus, createdAt), getServerSyncTimestamp(params.syncStatus, createdAt), context?.userId ?? params.customerId ?? null, context?.storeId ?? params.storeId ?? null, context?.role ?? null],
        );

        for (const item of params.items) {
            const product = await getProductById(item.productId);
            const unitPrice = item.unitPrice ?? product?.price ?? 0;

            if (unitPrice <= 0) {
                throw new Error("Preço inválido no pedido.");
            }

            if (params.shouldDecreaseStock !== false) {
                if (!product) {
                    throw new Error("Produto não encontrado no catálogo local.");
                }

                if (!product.active) {
                    throw new Error(`Produto ${product.name} está inativo.`);
                }

                if (product.stockQuantity < item.quantity) {
                    throw new Error(`Estoque insuficiente para ${product.name}.`);
                }

                await decreaseLocalProductStock(product.id, item.quantity);
            }

            totalAmount += await createOrderItem({
                orderId,
                productId: item.productId,
                productName: product?.name ?? (await resolveProductName(item.productId)),
                unitPrice,
                quantity: item.quantity,
            });
        }

        await db.runAsync(
            `
            UPDATE orders
            SET total_amount = ?
            WHERE id = ?
            `,
            [totalAmount, orderId],
        );
    });

    if (params.enqueueSync !== false && (params.syncStatus ?? "PENDING") === "PENDING") {
        await enqueueOrderSync(localOrderId, {
            localOrderId,
            customerId: params.customerId ?? undefined,
            offlineCreatedAt,
            items: params.items,
        });
    }

    return {
        id: orderId,
        localOrderId,
        totalAmount,
        duplicated: false,
    };
}

export async function createLocalOrderFromQr(params: { payload: OrderQrPayload; sellerId?: string | null }) {
    const existing = await getLocalOrderByLocalId(params.payload.localOrderId);

    if (existing) {
        return {
            id: existing.id,
            localOrderId: existing.local_order_id,
            totalAmount: existing.total_amount,
            duplicated: true,
        };
    }

    return createLocalOfflineOrder({
        localOrderId: params.payload.localOrderId,
        storeId: params.payload.storeId,
        customerId: params.payload.customerId ?? null,
        sellerId: params.sellerId ?? null,
        items: params.payload.items,
        confirmedBySeller: true,
        offlineCreatedAt: params.payload.createdAt,
        shouldDecreaseStock: true,
        syncStatus: "PENDING",
        orderStatus: "CONFIRMED",
        paymentStatus: "PENDING_PAYMENT",
    });
}

export async function createLocalOrderFromConfirmationQr(params: { payload: OrderConfirmationQrPayload }) {
    const existing = await getLocalOrderByLocalId(params.payload.localOrderId);

    if (existing) {
        await db.runAsync(
            `
            UPDATE orders
            SET remote_order_id = COALESCE(?, remote_order_id),
                seller_id = COALESCE(?, seller_id),
                order_status = ?,
                payment_status = ?,
                sync_status = ?,
                updated_at = ?,
                confirmed_at = COALESCE(confirmed_at, ?),
                server_synced_at = COALESCE(?, server_synced_at),
                synced_at = ?
            WHERE local_order_id = ?
            `,
            [params.payload.remoteOrderId ?? null, params.payload.sellerId ?? null, params.payload.orderStatus, params.payload.paymentStatus, params.payload.syncStatus, params.payload.confirmedAt, params.payload.confirmedAt, params.payload.remoteOrderId ? params.payload.confirmedAt : null, params.payload.remoteOrderId ? params.payload.confirmedAt : null, params.payload.localOrderId],
        );

        return {
            id: existing.id,
            localOrderId: existing.local_order_id,
            totalAmount: existing.total_amount,
            duplicated: true,
        };
    }

    return createLocalOfflineOrder({
        localOrderId: params.payload.localOrderId,
        storeId: params.payload.storeId,
        customerId: params.payload.customerId ?? null,
        sellerId: params.payload.sellerId ?? null,
        items: params.payload.items,
        confirmedBySeller: true,
        offlineCreatedAt: params.payload.confirmedAt,
        shouldDecreaseStock: false,
        remoteOrderId: params.payload.remoteOrderId ?? null,
        syncStatus: params.payload.syncStatus,
        orderStatus: params.payload.orderStatus,
        paymentStatus: params.payload.paymentStatus,
    });
}

export async function getOrderSyncIssue(localOrderId: string) {
    const context = await getLocalSessionContext();

    if (!context) {
        return null;
    }

    return db.getFirstAsync<LocalOrderSyncIssue>(
        `
        SELECT
            status AS queueStatus,
            last_error AS lastError,
            attempts,
            updated_at AS updatedAt
        FROM order_sync_queue
        WHERE operation_id = ?
          AND owner_role = 'SELLER'
          AND ? IS NOT NULL
          AND owner_store_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
        `,
        [localOrderId, context.storeId, context.storeId],
    );
}

export async function getLocalOrders() {
    const context = await getLocalSessionContext();

    if (!context) {
        return [];
    }

    const rows = await db.getAllAsync<LocalOrderRow>(`
        SELECT
            id,
            remote_order_id,
            local_order_id,
            store_id,
            customer_id,
            seller_id,
            device_id,
            order_status,
            payment_status,
            sync_status,
            total_amount,
            created_at,
            updated_at,
            offline_created_at,
            confirmed_at,
            server_synced_at,
            synced_at,
            owner_user_id,
            owner_store_id,
            owner_role
        FROM orders
        WHERE owner_user_id = ?
           OR (? IS NOT NULL AND owner_store_id = ?)
        ORDER BY COALESCE(updated_at, created_at) DESC
    `, [context.userId, context.storeId, context.storeId]);

    return rows;
}

export async function getPendingLocalOrders() {
    const context = await getLocalSessionContext();

    if (!context) {
        return [];
    }

    return db.getAllAsync<LocalOrderRow>(`
        SELECT
            id,
            remote_order_id,
            local_order_id,
            store_id,
            customer_id,
            seller_id,
            device_id,
            order_status,
            payment_status,
            sync_status,
            total_amount,
            created_at,
            updated_at,
            offline_created_at,
            confirmed_at,
            server_synced_at,
            synced_at,
            owner_user_id,
            owner_store_id,
            owner_role
        FROM orders
        WHERE sync_status = 'PENDING'
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
        ORDER BY COALESCE(updated_at, created_at) ASC
    `, [context.userId, context.storeId, context.storeId]);
}

export async function getLocalOrderItems(orderId: string) {
    return db.getAllAsync<LocalOrderItemRow>(
        `
        SELECT
            id,
            order_id,
            product_id,
            product_name,
            unit_price,
            quantity,
            total_price
        FROM order_items
        WHERE order_id = ?
        ORDER BY product_name ASC
        `,
        [orderId],
    );
}

export async function buildPendingOrderPayloads() {
    const pendingOrders = await getPendingLocalOrders();
    const payloads: PendingOrderPayload[] = [];

    for (const order of pendingOrders) {
        const items = await getLocalOrderItems(order.id);

        payloads.push({
            localOrderId: order.local_order_id,
            storeId: order.store_id,
            customerId: order.customer_id ?? undefined,
            offlineCreatedAt: order.offline_created_at ?? order.created_at,
            items: items.map((item) => ({
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: item.unit_price,
            })),
        });
    }

    return payloads;
}

export async function buildOrderConfirmationPayloadFromLocal(localOrderId: string) {
    const order = await getLocalOrderByLocalId(localOrderId);

    if (!order) {
        throw new Error("Pedido confirmado não encontrado.");
    }

    const items = await getLocalOrderItems(order.id);
    const issue = await getOrderSyncIssue(localOrderId);

    return {
        localOrderId: order.local_order_id,
        storeId: order.store_id,
        customerId: order.customer_id,
        sellerId: order.seller_id,
        remoteOrderId: order.remote_order_id,
        confirmedAt: getConfirmationTimestamp(order),
        totalAmount: order.total_amount,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
        syncStatus: order.sync_status,
        message: buildOrderSyncMessage(order.sync_status, issue),
        items: items.map((item) => ({
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: item.unit_price,
        })),
    };
}

export async function markOrderSynced(params: { localOrderId: string; remoteOrderId?: string | null; paymentStatus?: string | null; orderStatus?: string | null; syncStatus?: string | null }) {
    await db.runAsync(
        `
        UPDATE orders
        SET remote_order_id = COALESCE(?, remote_order_id),
            payment_status = COALESCE(?, payment_status),
            order_status = COALESCE(?, order_status),
            sync_status = ?,
            updated_at = ?,
            server_synced_at = ?,
            synced_at = ?
        WHERE local_order_id = ?
        `,
        [params.remoteOrderId ?? null, params.paymentStatus ?? null, params.orderStatus ?? null, params.syncStatus ?? "SYNCED", now(), now(), now(), params.localOrderId],
    );
}

export async function markOrderRejected(params: { localOrderId: string; message?: string }) {
    await db.runAsync(
        `
        UPDATE orders
        SET sync_status = ?,
            updated_at = ?,
            server_synced_at = ?,
            synced_at = ?
        WHERE local_order_id = ?
        `,
        ["REJECTED", now(), now(), now(), params.localOrderId],
    );
}

export async function restoreLocalStockForRejectedOrder(localOrderId: string) {
    const order = await getLocalOrderByLocalId(localOrderId);

    if (!order || order.sync_status === "REJECTED") {
        return;
    }

    const items = await getLocalOrderItems(order.id);

    for (const item of items) {
        await increaseLocalProductStock(item.product_id, item.quantity);
    }
}

async function findLocalProductIdByNameAndPrice(productName: string, unitPrice: number) {
    const context = await getLocalSessionContext();

    if (!context) {
        return null;
    }

    return db.getFirstAsync<ProductIdRow>(
        `
        SELECT id
        FROM products
        WHERE LOWER(name) = LOWER(?)
          AND ABS(price - ?) < 0.01
          AND active = 1
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
        ORDER BY updated_at DESC
        LIMIT 1
        `,
        [productName, unitPrice, context.userId, context.storeId, context.storeId],
    );
}

async function localProductExists(productId: string) {
    const product = await db.getFirstAsync<ProductIdRow>(
        `
        SELECT id
        FROM products
        WHERE id = ?
        LIMIT 1
        `,
        [productId],
    );

    return !!product;
}

export async function repairQueuedOrderProductReferences() {
    const context = await getLocalSessionContext();

    if (!context?.storeId) {
        return;
    }

    const queueRows = await db.getAllAsync<QueuedOrderRepairRow>(
        `
        SELECT id, operation_id, payload_json, status
        FROM order_sync_queue
        WHERE owner_role = 'SELLER'
          AND owner_store_id = ?
          AND status IN ('PENDING', 'FAILED', 'REJECTED', 'SYNCING')
        ORDER BY created_at ASC
        `,
        [context.storeId],
    );

    for (const row of queueRows) {
        const payload = JSON.parse(row.payload_json) as PendingOrderPayload;
        let repaired = false;

        const repairedItems = [];

        for (const item of payload.items) {
            if (await localProductExists(item.productId)) {
                repairedItems.push(item);
                continue;
            }

            const orderItem = await db.getFirstAsync<OrderItemRepairRow>(
                `
                SELECT oi.product_name, oi.unit_price
                FROM order_items oi
                INNER JOIN orders o ON o.id = oi.order_id
                WHERE o.local_order_id = ?
                  AND oi.product_id = ?
                LIMIT 1
                `,
                [payload.localOrderId, item.productId],
            );

            if (!orderItem) {
                repairedItems.push(item);
                continue;
            }

            const repairedProduct = await findLocalProductIdByNameAndPrice(orderItem.product_name, orderItem.unit_price);

            if (!repairedProduct?.id) {
                repairedItems.push(item);
                continue;
            }

            await db.runAsync(`UPDATE order_items SET product_id = ? WHERE product_id = ?`, [repairedProduct.id, item.productId]);
            repairedItems.push({
                ...item,
                productId: repairedProduct.id,
            });
            repaired = true;
        }

        if (!repaired) {
            continue;
        }

        const timestamp = now();

        await db.runAsync(
            `
            UPDATE order_sync_queue
            SET payload_json = ?,
                status = 'PENDING',
                attempts = 0,
                last_error = NULL,
                next_retry_at = NULL,
                synced_at = NULL,
                updated_at = ?
            WHERE id = ?
            `,
            [JSON.stringify({ ...payload, items: repairedItems }), timestamp, row.id],
        );

        await db.runAsync(
            `
            UPDATE orders
            SET sync_status = 'PENDING',
                updated_at = ?,
                server_synced_at = NULL,
                synced_at = NULL
            WHERE local_order_id = ?
              AND sync_status = 'REJECTED'
            `,
            [timestamp, payload.localOrderId],
        );
    }
}

export async function saveRemoteOrder(order: OrderResponse) {
    await db.withTransactionAsync(async () => {
        const context = await getLocalSessionContext();
        const existingByLocalOrderId = order.localOrderId ? await getLocalOrderByLocalId(order.localOrderId) : null;
        const existingByRemoteOrderId = await getLocalOrderByRemoteId(order.id);
        const existingOrder = existingByLocalOrderId ?? existingByRemoteOrderId;
        const targetOrderId = existingOrder?.id ?? order.id;
        const targetLocalOrderId = order.localOrderId ?? existingOrder?.local_order_id ?? order.id;
        const persistedUpdatedAt = order.updatedAt ?? order.createdAt ?? now();
        const confirmedAt = existingOrder?.confirmed_at ?? order.offlineCreatedAt ?? order.createdAt;
        const serverSyncedAt = getServerSyncTimestamp(order.syncStatus, persistedUpdatedAt);

        await db.runAsync(
            `
            INSERT OR REPLACE INTO orders (
                id,
                remote_order_id,
                local_order_id,
                store_id,
                customer_id,
                seller_id,
                device_id,
                order_status,
                payment_status,
                sync_status,
                total_amount,
                created_at,
                updated_at,
                offline_created_at,
                confirmed_at,
                server_synced_at,
                synced_at,
                owner_user_id,
                owner_store_id,
                owner_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [targetOrderId, order.id, targetLocalOrderId, order.storeId, order.customerId ?? null, order.sellerId ?? null, null, order.orderStatus, order.paymentStatus, order.syncStatus, order.totalAmount, order.createdAt, persistedUpdatedAt, order.offlineCreatedAt ?? null, confirmedAt, serverSyncedAt, serverSyncedAt ?? persistedUpdatedAt, context?.userId ?? order.customerId ?? null, context?.storeId ?? order.storeId ?? null, context?.role ?? null],
        );

        if (!order.items?.length) {
            return;
        }

        await db.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [targetOrderId]);

        for (const item of order.items) {
            await db.runAsync(
                `
                INSERT OR REPLACE INTO order_items (
                    id,
                    order_id,
                    product_id,
                    product_name,
                    unit_price,
                    quantity,
                    total_price
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [item.id, targetOrderId, item.productId, item.productName, item.unitPrice, item.quantity, item.totalPrice],
            );
        }
    });
}

export async function saveRemoteOrders(orders: OrderResponse[]) {
    for (const order of orders) {
        await saveRemoteOrder(order);
    }
}

export async function updateLocalOrderPaymentStatusByRemoteId(params: { remoteOrderId: string; paymentStatus: string }) {
    await db.runAsync(
        `
        UPDATE orders
        SET payment_status = ?,
            updated_at = ?
        WHERE remote_order_id = ?
        `,
        [params.paymentStatus, now(), params.remoteOrderId],
    );
}

export async function countPendingLocalOrders() {
    const context = await getLocalSessionContext();

    if (!context) {
        return 0;
    }

    const row = await db.getFirstAsync<{ total: number }>(`
        SELECT COUNT(*) AS total
        FROM orders
        WHERE sync_status = 'PENDING'
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
    `, [context.userId, context.storeId, context.storeId]);

    return row?.total ?? 0;
}
