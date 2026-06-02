import { CatalogCategory, CatalogQrPayload } from "@/src/domains/catalog/types/catalog";

type CompactCatalogQrPayloadV1 = {
    t: "OC";
    v: 1;
    s: string;
    g: string;
    c: {
        i: string;
        n: string;
        p: {
            i: string;
            n: string;
            pr: number;
            q: number;
        }[];
    }[];
};

type CompactCatalogQrPayloadV2 = {
    t: "OC";
    v: 2;
    s: string;
    g: string;
    c: [string, string, [string, string, number, number][]][];
};

type CompactCatalogQrPayload = CompactCatalogQrPayloadV1 | CompactCatalogQrPayloadV2;

function normalizePrice(price: number) {
    return Math.round(price * 100) / 100;
}

function decodeGeneratedAt(value: string) {
    const timestamp = Number.parseInt(value, 36);

    if (Number.isFinite(timestamp) && timestamp > 0) {
        return new Date(timestamp).toISOString();
    }

    return value;
}

export function buildCatalogQrPayload(params: { storeId: string; categories: CatalogCategory[] }): CompactCatalogQrPayloadV2 {
    return {
        t: "OC",
        v: 2,
        s: params.storeId,
        g: Date.now().toString(36),
        c: params.categories
            .filter((category) => category.active)
            .map((category) => [
                category.id,
                category.name,
                category.products
                    .filter((product) => product.active)
                    .map((product) => [product.id, product.name, normalizePrice(product.price), product.stockQuantity]),
            ]),
    };
}

export function encodeCatalogQr(payload: CompactCatalogQrPayload) {
    return JSON.stringify(payload);
}

function decodeCatalogQrV1(payload: CompactCatalogQrPayloadV1): CatalogQrPayload {
    return {
        type: "OFFPAY_CATALOG",
        version: 1,
        storeId: payload.s,
        generatedAt: payload.g,
        categories: payload.c.map((category) => ({
            id: category.i,
            name: category.n,
            description: null,
            products: category.p.map((product) => ({
                id: product.i,
                name: product.n,
                description: null,
                price: product.pr,
                stockQuantity: product.q,
            })),
        })),
    };
}

function decodeCatalogQrV2(payload: CompactCatalogQrPayloadV2): CatalogQrPayload {
    return {
        type: "OFFPAY_CATALOG",
        version: 1,
        storeId: payload.s,
        generatedAt: decodeGeneratedAt(payload.g),
        categories: payload.c.map(([categoryId, categoryName, products]) => ({
            id: categoryId,
            name: categoryName,
            description: null,
            products: products.map(([productId, productName, price, stockQuantity]) => ({
                id: productId,
                name: productName,
                description: null,
                price,
                stockQuantity,
            })),
        })),
    };
}

export function decodeCatalogQr(value: string): CatalogQrPayload {
    const payload = JSON.parse(value) as CompactCatalogQrPayload;

    if (payload.t !== "OC" || ![1, 2].includes(payload.v)) {
        throw new Error("QR Code de catálogo inválido.");
    }

    if (!payload.s || !Array.isArray(payload.c)) {
        throw new Error("Catálogo inválido.");
    }

    if (payload.v === 1) {
        return decodeCatalogQrV1(payload);
    }

    return decodeCatalogQrV2(payload);
}
