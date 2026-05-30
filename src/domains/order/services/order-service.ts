import { CreateOrderRequest, OrderResponse } from "@/src/domains/order/types/order";
import { salesRequest } from "@/src/shared/lib/api";

export async function createOrder(body: CreateOrderRequest) {
    return salesRequest<OrderResponse>("/order", {
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

export async function getMySales() {
    return salesRequest<OrderResponse[]>("/order/me/sales", {
        auth: true,
    });
}

export async function getMyPurchases() {
    return salesRequest<OrderResponse[]>("/order/me/purchases", {
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
