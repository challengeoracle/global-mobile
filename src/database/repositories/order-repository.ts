import { randomUUID } from "expo-crypto";

import { OrderItemRequest, OrderResponse } from "@/src/types/sales";
import { OrderQrPayload } from "@/src/utils/order-qr";
import { db } from "../database";
import { decreaseLocalProductStock, getProductById } from "./catalog-repository";

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
    offline_created_at: string | null;
    synced_at: string | null;
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

function now() {
    return new Date().toISOString();
}

async function findLocalOrderByLocalId(localOrderId: string) {
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
            offline_created_at,
            synced_at
        FROM orders
        WHERE local_order_id = ?
        LIMIT 1
        `,
        [localOrderId],
    );
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

export async function createLocalOfflineOrder(params: { localOrderId?: string; storeId?: string | null; customerId?: string | null; sellerId?: string | null; deviceId: string; items: OrderItemRequest[]; confirmedBySeller?: boolean; offlineCreatedAt?: string | null }) {
    if (!params.items.length) {
        throw new Error("Pedido precisa ter pelo menos um item.");
    }

    const existingLocalOrderId = params.localOrderId ?? randomUUID();
    const existing = await findLocalOrderByLocalId(existingLocalOrderId);

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
                offline_created_at,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [orderId, null, existingLocalOrderId, params.storeId ?? null, params.customerId ?? null, params.sellerId ?? null, params.deviceId, params.confirmedBySeller ? "CONFIRMED" : "CREATED", "PENDING_PAYMENT", "PENDING", 0, createdAt, offlineCreatedAt, null],
        );

        for (const item of params.items) {
            const product = await getProductById(item.productId);

            if (!product) {
                throw new Error("Produto não encontrado no catálogo local.");
            }

            if (!product.active) {
                throw new Error(`Produto ${product.name} está inativo.`);
            }

            if (product.stockQuantity < item.quantity) {
                throw new Error(`Estoque insuficiente para ${product.name}.`);
            }

            const unitPrice = item.unitPrice ?? product.price;

            totalAmount += await createOrderItem({
                orderId,
                productId: product.id,
                productName: product.name,
                unitPrice,
                quantity: item.quantity,
            });

            await decreaseLocalProductStock(product.id, item.quantity);
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

    return {
        id: orderId,
        localOrderId: existingLocalOrderId,
        totalAmount,
        duplicated: false,
    };
}

export async function createLocalOrderFromQr(params: { payload: OrderQrPayload; sellerId?: string | null; sellerDeviceId: string }) {
    const existing = await findLocalOrderByLocalId(params.payload.localOrderId);

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
    });
}

export async function getLocalOrders() {
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
            offline_created_at,
            synced_at
        FROM orders
        ORDER BY created_at DESC
    `);
}

export async function getPendingLocalOrders() {
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
            offline_created_at,
            synced_at
        FROM orders
        WHERE sync_status = 'PENDING'
        ORDER BY created_at ASC
    `);
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

export async function markOrderSynced(params: { localOrderId: string; remoteOrderId?: string | null; paymentStatus?: string | null; orderStatus?: string | null; syncStatus?: string | null }) {
    await db.runAsync(
        `
        UPDATE orders
        SET remote_order_id = COALESCE(?, remote_order_id),
            payment_status = COALESCE(?, payment_status),
            order_status = COALESCE(?, order_status),
            sync_status = ?,
            synced_at = ?
        WHERE local_order_id = ?
        `,
        [params.remoteOrderId ?? null, params.paymentStatus ?? null, params.orderStatus ?? null, params.syncStatus ?? "SYNCED", now(), params.localOrderId],
    );
}

export async function markOrderRejected(params: { localOrderId: string; message?: string }) {
    await db.runAsync(
        `
        UPDATE orders
        SET sync_status = ?,
            synced_at = ?
        WHERE local_order_id = ?
        `,
        ["REJECTED", now(), params.localOrderId],
    );
}

export async function saveRemoteOrder(order: OrderResponse) {
    await db.withTransactionAsync(async () => {
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
                offline_created_at,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [order.id, order.id, order.localOrderId ?? order.id, order.storeId, order.customerId ?? null, order.sellerId ?? null, order.deviceId ?? null, order.orderStatus, order.paymentStatus, order.syncStatus, order.totalAmount, order.createdAt, order.offlineCreatedAt ?? null, now()],
        );

        await db.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [order.id]);

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
                [item.id, order.id, item.productId, item.productName, item.unitPrice, item.quantity, item.totalPrice],
            );
        }
    });
}

export async function countPendingLocalOrders() {
    const row = await db.getFirstAsync<{ total: number }>(`
        SELECT COUNT(*) AS total
        FROM orders
        WHERE sync_status = 'PENDING'
    `);

    return row?.total ?? 0;
}
