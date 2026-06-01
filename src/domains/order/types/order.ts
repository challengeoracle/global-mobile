import type { SyncItemStateResponse } from "@/src/domains/catalog/types/catalog";

export type PageResponse<T> = {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
};

export type OrderItemRequest = {
    productId: string;
    quantity: number;
    unitPrice?: number;
};

export type CreateOrderRequest = {
    storeId?: string;
    deviceId?: string;
    items: OrderItemRequest[];
};

export type OrderSyncRequest = {
    deviceId: string;
    orders: {
        localOrderId: string;
        customerId?: string;
        offlineCreatedAt: string;
        items: OrderItemRequest[];
    }[];
};

export type OrderItemResponse = {
    id: string;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
};

export type OrderResponse = {
    id: string;
    localOrderId?: string | null;
    storeId: string;
    customerId?: string | null;
    sellerId?: string | null;
    deviceId?: string | null;
    orderStatus: string;
    paymentStatus: string;
    syncStatus: string;
    totalAmount: number;
    createdAt: string;
    updatedAt?: string | null;
    offlineCreatedAt?: string | null;
    items: OrderItemResponse[];
};

export type OrderSyncItemResponse = {
    localId?: string | null;
    localOrderId?: string | null;
    remoteId?: string | null;
    orderId?: string | null;
    status: "APPLIED" | "DUPLICATE" | "REJECTED";
    message: string;
    orderStatus?: string | null;
    paymentStatus?: string | null;
    syncStatus?: string | null;
    totalAmount?: number | null;
    currentState?: SyncItemStateResponse | null;
    syncedAt?: string | null;
};

export type OrderSyncResponse = {
    storeId: string;
    syncedAt: string;
    results: OrderSyncItemResponse[];
};
