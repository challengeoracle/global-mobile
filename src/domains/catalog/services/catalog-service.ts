import { salesRequest } from "@/src/shared/lib/api";
import { CatalogResponse } from "@/src/domains/catalog/types/catalog";

export async function getMyCatalog() {
    return salesRequest<CatalogResponse>("/catalog/me", {
        auth: true,
    });
}

export async function getCatalogByStore(storeId: string) {
    return salesRequest<CatalogResponse>(`/catalog/store/${storeId}`, {
        auth: true,
    });
}

