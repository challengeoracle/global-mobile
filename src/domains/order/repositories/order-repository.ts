import { randomUUID } from "expo-crypto";

import { OrderItemRequest, OrderResponse } from "@/src/domains/order/types/order";
import { OrderConfirmationQrPayload, OrderQrPayload } from "@/src/domains/order/utils/order-qr";
import { decreaseLocalProductStock, getProductById } from "@/src/domains/catalog/repositories/catalog-repository";
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

function now() {
    return new Date().toISOString();
}

function buildOrderSyncMessage(syncStatus: string, issue?: LocalOrderSyncIssue | null) {
    if (syncStatus === "REJECTED") {
        return issue?.lastError ?? "O servidor rejeitou este pedido. Revise os dados e tente novamente.";
    }

    if (issue?.queueStatus === "FAILED") {
        return issue.lastError ?? "Não foi possível sincronizar agora. Uma nova tentativa será feita automaticamente.";
    }

    if (syncStatus === "SYNCED" || syncStatus === "OFFLINE_SYNCED") {
        return "Pedido sincronizado com o servidor.";
    }

    if (syncStatus === "SELLER_CONFIRMED") {
        return "Pedido confirmado pelo vendedor e salvo offline.";
    }

    if (issue?.queueStatus === "SYNCED") {
        return "Pedido sincronizado com o servidor.";
    }

    return "Pedido salvo localmente aguardando sincronizacao do vendedor.";
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
    deviceId: string;
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
                synced_at,
                owner_user_id,
                owner_store_id,
                owner_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [orderId, params.remoteOrderId ?? null, localOrderId, params.storeId ?? null, params.customerId ?? null, params.sellerId ?? null, params.deviceId, params.orderStatus ?? (params.confirmedBySeller ? "CONFIRMED" : "CREATED"), params.paymentStatus ?? "PENDING_PAYMENT", params.syncStatus ?? "PENDING", 0, createdAt, createdAt, offlineCreatedAt, params.remoteOrderId ? createdAt : null, context?.userId ?? params.customerId ?? null, context?.storeId ?? params.storeId ?? null, context?.role ?? null],
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

export async function createLocalOrderFromQr(params: { payload: OrderQrPayload; sellerId?: string | null; sellerDeviceId: string }) {
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
        deviceId: params.sellerDeviceId,
        items: params.payload.items,
        confirmedBySeller: true,
        offlineCreatedAt: params.payload.createdAt,
        shouldDecreaseStock: true,
        syncStatus: "PENDING",
        orderStatus: "CONFIRMED",
        paymentStatus: "PENDING_PAYMENT",
    });
}

export async function createLocalOrderFromConfirmationQr(params: { payload: OrderConfirmationQrPayload; customerDeviceId: string }) {
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
                synced_at = ?
            WHERE local_order_id = ?
            `,
            [params.payload.remoteOrderId ?? null, params.payload.sellerId ?? null, params.payload.orderStatus, params.payload.paymentStatus, params.payload.syncStatus, params.payload.confirmedAt, params.payload.confirmedAt, params.payload.localOrderId],
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
        deviceId: params.customerDeviceId,
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
    return db.getFirstAsync<LocalOrderSyncIssue>(
        `
        SELECT
            status AS queueStatus,
            last_error AS lastError,
            attempts,
            updated_at AS updatedAt
        FROM order_sync_queue
        WHERE operation_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
        `,
        [localOrderId],
    );
}

export async function getLocalOrders() {
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
            synced_at,
            owner_user_id,
            owner_store_id,
            owner_role
        FROM orders
        WHERE owner_user_id = ?
           OR (? IS NOT NULL AND owner_store_id = ?)
        ORDER BY COALESCE(updated_at, created_at) DESC
    `, [context.userId, context.storeId, context.storeId]);
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
        sellerDeviceId: order.device_id,
        remoteOrderId: order.remote_order_id,
        confirmedAt: order.synced_at ?? order.created_at,
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
            synced_at = ?
        WHERE local_order_id = ?
        `,
        [params.remoteOrderId ?? null, params.paymentStatus ?? null, params.orderStatus ?? null, params.syncStatus ?? "SYNCED", now(), now(), params.localOrderId],
    );
}

export async function markOrderRejected(params: { localOrderId: string; message?: string }) {
    await db.runAsync(
        `
        UPDATE orders
        SET sync_status = ?,
            updated_at = ?,
            synced_at = ?
        WHERE local_order_id = ?
        `,
        ["REJECTED", now(), now(), params.localOrderId],
    );
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
                synced_at,
                owner_user_id,
                owner_store_id,
                owner_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [targetOrderId, order.id, targetLocalOrderId, order.storeId, order.customerId ?? null, order.sellerId ?? null, order.deviceId ?? null, order.orderStatus, order.paymentStatus, order.syncStatus, order.totalAmount, order.createdAt, persistedUpdatedAt, order.offlineCreatedAt ?? null, now(), context?.userId ?? order.customerId ?? null, context?.storeId ?? order.storeId ?? null, context?.role ?? null],
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
