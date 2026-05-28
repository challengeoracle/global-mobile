import { CatalogCategory, CatalogQrPayload } from "@/src/types/sales";

type CompactCatalogQrPayload = {
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

export function buildCatalogQrPayload(params: { storeId: string; categories: CatalogCategory[] }): CompactCatalogQrPayload {
    return {
        t: "OC",
        v: 1,
        s: params.storeId,
        g: new Date().toISOString(),
        c: params.categories.map((category) => ({
            i: category.id,
            n: category.name,
            p: category.products
                .filter((product) => product.active)
                .map((product) => ({
                    i: product.id,
                    n: product.name,
                    pr: product.price,
                    q: product.stockQuantity,
                })),
        })),
    };
}

export function encodeCatalogQr(payload: CompactCatalogQrPayload) {
    return JSON.stringify(payload);
}

export function decodeCatalogQr(value: string): CatalogQrPayload {
    const payload = JSON.parse(value) as CompactCatalogQrPayload;

    if (payload.t !== "OC" || payload.v !== 1) {
        throw new Error("QR Code de catálogo inválido.");
    }

    if (!payload.s || !Array.isArray(payload.c)) {
        throw new Error("Catálogo inválido.");
    }

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
