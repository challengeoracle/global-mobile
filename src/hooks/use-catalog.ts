import { useCallback, useEffect, useState } from "react";

import { getCatalogFromLocal, saveCatalog, saveCategories } from "../database/repositories/catalog-repository";
import { getCatalogByStore, getMyCatalog, getMyCategories } from "../services/sales-service";
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

            if (storeId) {
                const catalog = await getCatalogByStore(storeId);

                await saveCatalog(catalog);

                setCatalogStoreId(catalog.storeId);
                setLastSyncAt(catalog.syncedAt);

                await loadLocalCatalog();
                return;
            }

            const [catalog, remoteCategories] = await Promise.all([getMyCatalog(), getMyCategories()]);

            await saveCatalog(catalog);
            await saveCategories(remoteCategories);

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
