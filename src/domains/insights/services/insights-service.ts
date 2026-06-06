import { analyticsRequest } from "@/src/shared/lib/api";
import { HateoasResource } from "@/src/domains/hateoas/types/hateoas";

import {
    AnalyticsChartResponse,
    AnalyticsPeriod,
    AnalyticsPeriodSummaryResponse,
    AnalyticsSummaryResponse,
    CustomerSpendingResponse,
    CustomerSummaryResponse,
    InsightAskRequest,
    InsightAskResponse,
    SellerSummaryResponse,
    TopProductResponse,
} from "../types/insights";

export function getMySummary() {
    return analyticsRequest<AnalyticsSummaryResponse>("/analytics/me/summary", { auth: true });
}

export function getSellerSummary() {
    return analyticsRequest<SellerSummaryResponse>("/analytics/seller/summary", { auth: true });
}

export function getCustomerSummary() {
    return analyticsRequest<CustomerSummaryResponse>("/analytics/customer/summary", { auth: true });
}

export function getCustomerSummaryResource() {
    return analyticsRequest<HateoasResource<CustomerSummaryResponse>>("/analytics/customer/summary/resource", { auth: true });
}

export function getSellerTopProducts() {
    return analyticsRequest<TopProductResponse[]>("/analytics/seller/top-products", { auth: true });
}

export function getSellerTopProductsResource() {
    return analyticsRequest<HateoasResource<{ _embedded?: { topProductResponseList?: TopProductResponse[] } }>>(
        "/analytics/seller/top-products/resource",
        { auth: true },
    );
}

export function getCustomerSpending() {
    return analyticsRequest<CustomerSpendingResponse>("/analytics/customer/spending", { auth: true });
}

export function getCustomerSpendingResource() {
    return analyticsRequest<HateoasResource<CustomerSpendingResponse>>("/analytics/customer/spending/resource", { auth: true });
}

export function getSellerSummaryResource() {
    return analyticsRequest<HateoasResource<SellerSummaryResponse>>("/analytics/seller/summary/resource", { auth: true });
}

export function getMyPeriodSummary(period: AnalyticsPeriod) {
    return analyticsRequest<AnalyticsPeriodSummaryResponse>(`/analytics/me/summary/period?period=${period}`, { auth: true });
}

export function getMyPeriodSummaryResource(period: AnalyticsPeriod) {
    return analyticsRequest<HateoasResource<AnalyticsPeriodSummaryResponse>>(
        `/analytics/me/summary/period/resource?period=${period}`,
        { auth: true },
    );
}

export function getMyChart(days = 7) {
    return analyticsRequest<AnalyticsChartResponse>(`/analytics/me/chart?days=${days}`, { auth: true });
}

export function getMyChartResource(days = 7) {
    return analyticsRequest<HateoasResource<AnalyticsChartResponse>>(`/analytics/me/chart/resource?days=${days}`, { auth: true });
}

export function askInsight(question: string) {
    const body: InsightAskRequest = { question };
    return analyticsRequest<InsightAskResponse>("/ai/insights/ask", { method: "POST", auth: true, body });
}
