export type CatalogProduct = {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    stockQuantity: number;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type CatalogCategory = {
    id: string;
    storeId?: string | null;
    name: string;
    description?: string | null;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
    products: CatalogProduct[];
};
export type CatalogResponse = {
    storeId: string;
    syncedAt: string;
    categories: CatalogCategory[];
};

export type CatalogSyncOperation = "CATEGORY_CREATE" | "CATEGORY_UPDATE" | "CATEGORY_DEACTIVATE" | "PRODUCT_CREATE" | "PRODUCT_UPDATE" | "PRODUCT_DEACTIVATE" | "STOCK_UPDATE";

export type CatalogSyncItem = {
    operation: CatalogSyncOperation;
    productId?: string;
    categoryId?: string;
    name?: string;
    description?: string;
    price?: number;
    stockQuantity?: number;
    quantityDelta?: number;
    localUpdatedAt: string;
};

export type CatalogSyncRequest = {
    deviceId: string;
    changes: CatalogSyncItem[];
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

export type CatalogSyncItemResponse = {
    productId?: string | null;
    status: "APPLIED" | "DUPLICATE" | "REJECTED";
    message: string;
    currentStockQuantity?: number | null;
};

export type CatalogSyncResponse = {
    storeId: string;
    syncedAt: string;
    results: CatalogSyncItemResponse[];
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
    offlineCreatedAt?: string | null;
    items: OrderItemResponse[];
};

export type OrderSyncItemResponse = {
    localOrderId: string;
    orderId?: string | null;
    status: "APPLIED" | "DUPLICATE" | "REJECTED";
    message: string;
    orderStatus?: string | null;
    paymentStatus?: string | null;
    syncStatus?: string | null;
    totalAmount?: number | null;
};

export type OrderSyncResponse = {
    storeId: string;
    syncedAt: string;
    results: OrderSyncItemResponse[];
};

export type CatalogQrPayload = {
    type: "OFFPAY_CATALOG";
    version: 1;
    storeId: string;
    generatedAt: string;
    categories: {
        id: string;
        name: string;
        description?: string | null;
        products: {
            id: string;
            name: string;
            description?: string | null;
            price: number;
            stockQuantity: number;
        }[];
    }[];
};

export type UpdateCategoryRequest = {
    name: string;
    description?: string | null;
};

export type CreateCategoryRequest = {
    name: string;
    description?: string | null;
};

export type CategoryResponse = {
    id: string;
    name: string;
    description?: string | null;
    active: boolean;
    createdAt?: string | null;
};
