import { useCallback, useEffect, useState } from "react";

import { getCatalogFromLocal, getCatalogStoreIdFromLocal, saveCatalog } from "../database/repositories/catalog-repository";
import { getCatalogByStore, getMyCatalog } from "../services/sales-service";
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
        const localStoreId = await getCatalogStoreIdFromLocal();

        setCategories(localCatalog);

        if (localStoreId) {
            setCatalogStoreId(localStoreId);
            return;
        }

        if (storeId) {
            setCatalogStoreId(storeId);
        }
    }, [storeId]);

    const pullRemoteCatalog = useCallback(async () => {
        try {
            setRefreshing(true);
            setError(null);

            const remoteCatalog = storeId ? await getCatalogByStore(storeId) : await getMyCatalog();

            await saveCatalog(remoteCatalog);

            setCatalogStoreId(remoteCatalog.storeId);
            setLastSyncAt(remoteCatalog.syncedAt);

            await loadLocalCatalog();

            return remoteCatalog;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro ao baixar catálogo.";

            setError(message);

            await loadLocalCatalog();

            throw err;
        } finally {
            setRefreshing(false);
        }
    }, [storeId, loadLocalCatalog]);

    const loadCatalog = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            await loadLocalCatalog();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro ao carregar catálogo local.";

            setError(message);
        } finally {
            setLoading(false);
        }
    }, [loadLocalCatalog]);

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
        pullRemoteCatalog,
    };
}
