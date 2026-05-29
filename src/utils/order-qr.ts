import { OrderItemRequest } from "@/src/types/sales";

export type OrderQrPayload = {
    type: "OFFPAY_ORDER";
    version: 1;
    localOrderId: string;
    storeId: string;
    customerId?: string | null;
    deviceId?: string | null;
    createdAt: string;
    totalAmount: number;
    items: OrderItemRequest[];
};

type CompactOrderQrPayload = {
    t: "OO";
    v: 1;
    id: string;
    s: string;
    c?: string | null;
    d?: string | null;
    at: string;
    total: number;
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
        d: params.deviceId ?? null,
        at: params.createdAt,
        total: params.totalAmount,
        items: params.items.map((item) => ({
            p: item.productId,
            q: item.quantity,
            u: item.unitPrice,
        })),
    };
}

export function encodeOrderQr(payload: CompactOrderQrPayload) {
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
        deviceId: payload.d ?? null,
        createdAt: payload.at,
        totalAmount: payload.total,
        items: payload.items.map((item) => ({
            productId: item.p,
            quantity: item.q,
            unitPrice: item.u,
        })),
    };
}
