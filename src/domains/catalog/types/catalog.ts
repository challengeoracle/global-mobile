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

export type CatalogSyncOperation = "CATEGORY_CREATE" | "CATEGORY_UPDATE" | "CATEGORY_DEACTIVATE" | "PRODUCT_CREATE" | "PRODUCT_UPDATE" | "PRODUCT_DEACTIVATE" | "STOCK_UPDATE";

export type CatalogSyncItem = {
    operation: CatalogSyncOperation;
    operationId?: string;
    productId?: string;
    categoryId?: string;
    name?: string;
    description?: string;
    price?: number;
    stockQuantity?: number;
    quantityDelta?: number;
    localUpdatedAt: string;
};

export type CatalogSyncRequestItem = CatalogSyncItem & {
    operationId: string;
};

export type SyncItemStateResponse = {
    orderStatus?: string | null;
    paymentStatus?: string | null;
    syncStatus?: string | null;
    totalAmount?: number | null;
    productId?: string | null;
    categoryId?: string | null;
    stockQuantity?: number | null;
    operation?: string | null;
    active?: boolean | null;
};

export type CatalogSyncItemResponse = {
    localId?: string | null;
    operationId?: string | null;
    remoteId?: string | null;
    productId?: string | null;
    categoryId?: string | null;
    status: "APPLIED" | "DUPLICATE" | "REJECTED";
    message: string;
    currentStockQuantity?: number | null;
    currentState?: SyncItemStateResponse | null;
    syncedAt?: string | null;
};

export type CatalogSyncRequest = {
    changes: CatalogSyncRequestItem[];
};

export type CatalogSyncResponse = {
    storeId: string;
    syncedAt: string;
    results: CatalogSyncItemResponse[];
};
