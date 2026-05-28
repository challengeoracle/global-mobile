import { randomUUID } from "expo-crypto";

import { db } from "../database";

import { CatalogProduct, OrderItemRequest, OrderResponse } from "../../types/sales";
import { decreaseLocalProductStock, getProductById } from "./catalog-repository";

type LocalOrderRow = {
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

type LocalOrderItemRow = {
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    total_price: number;
};

function now() {
    return new Date().toISOString();
}

async function createOrderItemFromProduct(orderId: string, product: CatalogProduct, quantity: number, unitPrice?: number) {
    const price = unitPrice ?? product.price;
    const totalPrice = price * quantity;

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
        [randomUUID(), orderId, product.id, product.name, price, quantity, totalPrice],
    );

    return totalPrice;
}

export async function createLocalOfflineOrder(params: { storeId?: string | null; customerId?: string | null; sellerId?: string | null; deviceId: string; items: OrderItemRequest[] }) {
    if (!params.items.length) {
        throw new Error("Pedido precisa ter pelo menos um item.");
    }

    const orderId = randomUUID();
    const localOrderId = `local-order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const createdAt = now();

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
            [orderId, null, localOrderId, params.storeId ?? null, params.customerId ?? null, params.sellerId ?? null, params.deviceId, "CREATED", "PENDING_PAYMENT", "PENDING", 0, createdAt, createdAt, null],
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

            totalAmount += await createOrderItemFromProduct(orderId, product, item.quantity, item.unitPrice);

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
        localOrderId,
        totalAmount,
    };
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

export async function markOrderSynced(params: { localOrderId: string; remoteOrderId?: string | null; paymentStatus?: string | null; syncStatus?: string | null }) {
    await db.runAsync(
        `
            UPDATE orders
            SET remote_order_id = ?,
                payment_status = COALESCE(?, payment_status),
                sync_status = ?,
                synced_at = ?
            WHERE local_order_id = ?
        `,
        [params.remoteOrderId ?? null, params.paymentStatus ?? null, params.syncStatus ?? "SYNCED", now(), params.localOrderId],
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
