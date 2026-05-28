import { useCallback, useEffect, useState } from "react";

import { getCatalogByStore, getMyCatalog } from "../services/sales-service";

import { getCatalogFromLocal, saveCatalog } from "../database/repositories/catalog-repository";

import { CatalogCategory } from "../types/sales";

type UseCatalogOptions = {
    storeId?: string;
    autoLoad?: boolean;
};

export function useCatalog(options: UseCatalogOptions = {}) {
    const { storeId, autoLoad = true } = options;

    const [categories, setCategories] = useState<CatalogCategory[]>([]);
    const [catalogStoreId, setCatalogStoreId] = useState<string | null>(storeId ?? null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

    const loadLocalCatalog = useCallback(async () => {
        const localCatalog = await getCatalogFromLocal();

        setCategories(localCatalog);
    }, []);

    const syncCatalogFromApi = useCallback(async () => {
        try {
            setRefreshing(true);
            setError(null);

            const catalog = storeId ? await getCatalogByStore(storeId) : await getMyCatalog();

            await saveCatalog(catalog);

            setCatalogStoreId(catalog.storeId);
            setLastSyncAt(catalog.syncedAt);

            await loadLocalCatalog();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro ao sincronizar catálogo.";

            setError(message);

            await loadLocalCatalog();
        } finally {
            setRefreshing(false);
        }
    }, [storeId, loadLocalCatalog]);

    const loadCatalog = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            await loadLocalCatalog();
            await syncCatalogFromApi();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro ao carregar catálogo.";

            setError(message);
        } finally {
            setLoading(false);
        }
    }, [loadLocalCatalog, syncCatalogFromApi]);

    useEffect(() => {
        if (autoLoad) {
            loadCatalog();
        }
    }, [autoLoad, loadCatalog]);

    return {
        categories,
        catalogStoreId,
        loading,
        refreshing,
        error,
        lastSyncAt,
        loadCatalog,
        loadLocalCatalog,
        syncCatalogFromApi,
    };
}
