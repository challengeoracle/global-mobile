import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { countRejectedCatalogChanges, countRejectedOrderSyncQueue, getLatestCatalogQueueError, getLatestOrderQueueError } from "@/src/domains/sync/repositories/sync-queue-repository";
import { getSyncSummary, syncAll, syncCatalog, syncOrders, type SyncSummary } from "@/src/domains/sync/services/sync-engine";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";

type SyncScope = "all" | "catalog" | "orders";

type SyncStatusState = SyncSummary & {
    pendingCount: number;
    rejectedCount: number;
    scopedLastError: string | null;
};

const INITIAL_STATE: SyncStatusState = {
    isSyncing: false,
    pendingCatalogChanges: 0,
    pendingOrders: 0,
    lastSyncAt: null,
    lastError: null,
    pendingCount: 0,
    rejectedCount: 0,
    scopedLastError: null,
};

export function useSyncStatus(scope: SyncScope = "all") {
    const { user } = useAuth();
    const network = useNetworkStatus();
    const [status, setStatus] = useState<SyncStatusState>(INITIAL_STATE);
    const [loading, setLoading] = useState(true);
    const [syncingNow, setSyncingNow] = useState(false);

    const canSync = user?.role === "SELLER";

    const refresh = useCallback(async () => {
        const summary = await getSyncSummary();

        const [catalogRejected, orderRejected, latestCatalogError, latestOrderError] = await Promise.all([
            countRejectedCatalogChanges(),
            countRejectedOrderSyncQueue(),
            getLatestCatalogQueueError(),
            getLatestOrderQueueError(),
        ]);

        const pendingCount = scope === "catalog" ? summary.pendingCatalogChanges : scope === "orders" ? summary.pendingOrders : summary.pendingCatalogChanges + summary.pendingOrders;
        const rejectedCount = scope === "catalog" ? catalogRejected : scope === "orders" ? orderRejected : catalogRejected + orderRejected;
        const scopedLastError = scope === "catalog" ? latestCatalogError?.last_error ?? null : scope === "orders" ? latestOrderError?.last_error ?? null : summary.lastError ?? latestCatalogError?.last_error ?? latestOrderError?.last_error ?? null;

        setStatus({
            ...summary,
            pendingCount,
            rejectedCount,
            scopedLastError,
        });
        setLoading(false);
    }, [scope]);

    const syncNow = useCallback(async () => {
        if (!canSync) {
            await refresh();
            return {
                ok: false,
                message: "Sincronização disponível apenas para vendedor.",
            };
        }

        setSyncingNow(true);

        try {
            if (scope === "catalog") {
                const result = await syncCatalog({
                    isConnected: network.isConnected,
                    canSync,
                    pullCatalogAfterSync: true,
                    forceRetry: true,
                });
                await refresh();
                return result;
            }

            if (scope === "orders") {
                const result = await syncOrders({
                    isConnected: network.isConnected,
                    canSync,
                    forceRetry: true,
                });
                await refresh();
                return result;
            }

            const result = await syncAll({
                isConnected: network.isConnected,
                canSync,
                pullCatalogAfterSync: true,
                forceRetry: true,
            });
            await refresh();
            return result;
        } finally {
            setSyncingNow(false);
        }
    }, [canSync, network.isConnected, refresh, scope]);

    useEffect(() => {
        void refresh();

        const interval = setInterval(() => {
            void refresh();
        }, 2000);

        return () => clearInterval(interval);
    }, [refresh]);

    return {
        ...status,
        canSync,
        network,
        loading,
        syncingNow,
        refresh,
        syncNow,
    };
}
