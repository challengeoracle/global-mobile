import { CatalogSyncRequest, CatalogSyncResponse } from "@/src/domains/catalog/types/catalog";
import { OrderSyncRequest, OrderSyncResponse } from "@/src/domains/order/types/order";
import { salesRequest } from "@/src/shared/lib/api";

export async function syncCatalog(body: CatalogSyncRequest) {
    return salesRequest<CatalogSyncResponse>("/catalog/sync", {
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
