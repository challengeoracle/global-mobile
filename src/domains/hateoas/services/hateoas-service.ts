import { AnalyticsSummaryResponse } from "@/src/domains/insights/types/insights";
import { OrderResponse } from "@/src/domains/order/types/order";
import { CatalogResponse } from "@/src/domains/catalog/types/catalog";
import { HateoasResource } from "@/src/domains/hateoas/types/hateoas";
import { analyticsRequest, salesRequest } from "@/src/shared/lib/api";

export function getAnalyticsSummaryResource() {
    return analyticsRequest<HateoasResource<AnalyticsSummaryResponse>>("/analytics/me/summary/resource", {
        auth: true,
    });
}

export function getCatalogResource(storeId: string) {
    return salesRequest<HateoasResource<CatalogResponse>>(`/catalog/store/${storeId}/resource`, {
        auth: true,
    });
}

export function getOrderResource(orderId: string) {
    return salesRequest<HateoasResource<OrderResponse>>(`/order/${orderId}/resource`, {
        auth: true,
    });
}
