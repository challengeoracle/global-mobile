import { salesRequest } from "../lib/api";

import { CatalogResponse, CatalogSyncRequest, CatalogSyncResponse, CreateOrderRequest, OrderResponse, OrderSyncRequest, OrderSyncResponse } from "../types/sales";

export async function getMyCatalog() {
    return salesRequest<CatalogResponse>("/catalog/me", {
        auth: true,
    });
}

export async function getCatalogByStore(storeId: string) {
    return salesRequest<CatalogResponse>(`/catalog/store/${storeId}`, {
        auth: true,
    });
}

export async function syncCatalog(body: CatalogSyncRequest) {
    return salesRequest<CatalogSyncResponse>("/catalog/sync", {
        method: "POST",
        auth: true,
        body,
    });
}

export async function createOrder(body: CreateOrderRequest) {
    return salesRequest<OrderResponse>("/order", {
        method: "POST",
        auth: true,
        body,
    });
}

export async function syncOrders(body: OrderSyncRequest) {
    return salesRequest<OrderSyncResponse>("/order/sync", {
        method: "POST",
        auth: true,
        body,
    });
}

export async function getMyOrders() {
    return salesRequest<OrderResponse[]>("/order/me", {
        auth: true,
    });
}

export async function getOrderById(orderId: string) {
    return salesRequest<OrderResponse>(`/order/${orderId}`, {
        auth: true,
    });
}

export async function getOrdersByStore(storeId: string) {
    return salesRequest<OrderResponse[]>(`/order/store/${storeId}`, {
        auth: true,
    });
}

export async function getOrdersByCustomer(customerId: string) {
    return salesRequest<OrderResponse[]>(`/order/customer/${customerId}`, {
        auth: true,
    });
}
