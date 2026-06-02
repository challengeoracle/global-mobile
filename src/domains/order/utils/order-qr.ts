import { OrderItemRequest } from "@/src/domains/order/types/order";

export type OrderQrPayload = {
    type: "OFFPAY_ORDER";
    version: 1;
    localOrderId: string;
    storeId: string;
    customerId?: string | null;
    createdAt: string;
    totalAmount: number;
    items: OrderItemRequest[];
};

export type OrderConfirmationQrPayload = {
    type: "OFFPAY_ORDER_CONFIRMATION";
    version: 1;
    localOrderId: string;
    storeId: string;
    customerId?: string | null;
    sellerId?: string | null;
    remoteOrderId?: string | null;
    confirmedAt: string;
    totalAmount: number;
    orderStatus: string;
    paymentStatus: string;
    syncStatus: string;
    message?: string | null;
    items: OrderItemRequest[];
};

type CompactOrderQrPayload = {
    t: "OO";
    v: 1;
    id: string;
    s: string;
    c?: string | null;
    at: string;
    total: number;
    items: {
        p: string;
        q: number;
        u?: number;
    }[];
};

type CompactOrderConfirmationQrPayload = {
    t: "OC";
    v: 1;
    id: string;
    s: string;
    c?: string | null;
    seller?: string | null;
    rid?: string | null;
    at: string;
    total: number;
    os: string;
    ps: string;
    ss: string;
    msg?: string | null;
    items: {
        p: string;
        q: number;
        u?: number;
    }[];
};

export function buildOrderQrPayload(params: OrderQrPayload): CompactOrderQrPayload {
    return {
        t: "OO",
        v: 1,
        id: params.localOrderId,
        s: params.storeId,
        c: params.customerId ?? null,
        at: params.createdAt,
        total: params.totalAmount,
        items: params.items.map((item) => ({
            p: item.productId,
            q: item.quantity,
            u: item.unitPrice,
        })),
    };
}

export function buildOrderConfirmationQrPayload(params: OrderConfirmationQrPayload): CompactOrderConfirmationQrPayload {
    return {
        t: "OC",
        v: 1,
        id: params.localOrderId,
        s: params.storeId,
        c: params.customerId ?? null,
        seller: params.sellerId ?? null,
        rid: params.remoteOrderId ?? null,
        at: params.confirmedAt,
        total: params.totalAmount,
        os: params.orderStatus,
        ps: params.paymentStatus,
        ss: params.syncStatus,
        msg: params.message ?? null,
        items: params.items.map((item) => ({
            p: item.productId,
            q: item.quantity,
            u: item.unitPrice,
        })),
    };
}

export function encodeOrderQr(payload: CompactOrderQrPayload | CompactOrderConfirmationQrPayload) {
    return JSON.stringify(payload);
}

export function decodeOrderQr(value: string): OrderQrPayload {
    const payload = JSON.parse(value) as CompactOrderQrPayload;

    if (payload.t !== "OO" || payload.v !== 1) {
        throw new Error("QR Code de pedido inválido.");
    }

    if (!payload.id || !payload.s || !Array.isArray(payload.items) || payload.items.length === 0) {
        throw new Error("Pedido inválido.");
    }

    return {
        type: "OFFPAY_ORDER",
        version: 1,
        localOrderId: payload.id,
        storeId: payload.s,
        customerId: payload.c ?? null,
        createdAt: payload.at,
        totalAmount: payload.total,
        items: payload.items.map((item) => ({
            productId: item.p,
            quantity: item.q,
            unitPrice: item.u,
        })),
    };
}

export function decodeOrderConfirmationQr(value: string): OrderConfirmationQrPayload {
    const payload = JSON.parse(value) as CompactOrderConfirmationQrPayload;

    if (payload.t !== "OC" || payload.v !== 1) {
        throw new Error("QR Code de confirmação inválido.");
    }

    if (!payload.id || !payload.s || !Array.isArray(payload.items) || payload.items.length === 0) {
        throw new Error("Confirmação inválida.");
    }

    return {
        type: "OFFPAY_ORDER_CONFIRMATION",
        version: 1,
        localOrderId: payload.id,
        storeId: payload.s,
        customerId: payload.c ?? null,
        sellerId: payload.seller ?? null,
        remoteOrderId: payload.rid ?? null,
        confirmedAt: payload.at,
        totalAmount: payload.total,
        orderStatus: payload.os,
        paymentStatus: payload.ps,
        syncStatus: payload.ss,
        message: payload.msg ?? null,
        items: payload.items.map((item) => ({
            productId: item.p,
            quantity: item.q,
            unitPrice: item.u,
        })),
    };
}
