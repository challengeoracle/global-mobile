import { CreateOrderRequest, OrderResponse, PageResponse } from "@/src/domains/order/types/order";
import { salesRequest } from "@/src/shared/lib/api";

const DEFAULT_PAGE_SIZE = 50;

async function fetchOrderPage(path: string, page: number, size = DEFAULT_PAGE_SIZE) {
    return salesRequest<PageResponse<OrderResponse>>(`${path}?page=${page}&size=${size}`, {
        auth: true,
    });
}

async function fetchAllOrderPages(path: string, size = DEFAULT_PAGE_SIZE) {
    const orders: OrderResponse[] = [];
    let page = 0;

    while (true) {
        const response = await fetchOrderPage(path, page, size);
        orders.push(...response.content);

        if (response.last || response.totalPages <= page + 1) {
            break;
        }

        page += 1;
    }

    return orders;
}

export async function createOrder(body: CreateOrderRequest) {
    return salesRequest<OrderResponse>("/order", {
        method: "POST",
        auth: true,
        body,
    });
}

export async function getMyOrders() {
    return fetchAllOrderPages("/order/me/page");
}

export async function getMySales() {
    return fetchAllOrderPages("/order/me/sales/page");
}

export async function getMyPurchases() {
    return fetchAllOrderPages("/order/me/purchases/page");
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
