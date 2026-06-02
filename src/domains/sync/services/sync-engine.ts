import { normalizeLegacyCatalogIds, reconcileProductIdReference, saveCatalog } from "@/src/domains/catalog/repositories/catalog-repository";
import { getMyCatalog } from "@/src/domains/catalog/services/catalog-service";
import { markOrderRejected, markOrderSynced, repairQueuedOrderProductReferences, restoreLocalStockForRejectedOrder } from "@/src/domains/order/repositories/order-repository";
import { countPendingCatalogChanges, countPendingOrderSyncQueue, getPendingCatalogChanges, getPendingOrderSyncQueue, markCatalogChangeFailed, markCatalogChangeRejected, markCatalogChangeSynced, markCatalogChangesSyncing, markOrderQueueFailed, markOrderQueueRejected, markOrderQueueSynced, markOrderQueueSyncing } from "@/src/domains/sync/repositories/sync-queue-repository";
import { syncCatalog as syncCatalogRequest, syncOrders as syncOrdersRequest } from "@/src/domains/sync/services/sync-service";

type SyncScope = "catalog" | "orders";

type SyncOptions = {
    isConnected?: boolean;
    canSync?: boolean;
    pullCatalogAfterSync?: boolean;
    forceRetry?: boolean;
};

type ScheduleSyncOptions = SyncOptions & {
    scopes?: SyncScope[];
    debounceMs?: number;
    onComplete?: (summary: SyncSummary) => void | Promise<void>;
};

type ScopeResult = {
    ok: boolean;
    skipped: boolean;
    pendingBefore: number;
    pendingAfter: number;
    synced: number;
    rejected: number;
    message: string;
    error?: string;
};

export type SyncSummary = {
    isSyncing: boolean;
    pendingCatalogChanges: number;
    pendingOrders: number;
    lastSyncAt: string | null;
    lastError: string | null;
};

export type SyncAllResult = {
    ok: boolean;
    skipped: boolean;
    catalog: ScopeResult;
    orders: ScopeResult;
    summary: SyncSummary;
};

const DEFAULT_DEBOUNCE_MS = 1200;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 700;
const QUEUE_RETRY_BASE_MS = 15_000;
const QUEUE_RETRY_MAX_MS = 5 * 60 * 1000;

let isSyncingNow = false;
let lastSyncAt: string | null = null;
let lastError: string | null = null;
let scheduledTimer: ReturnType<typeof setTimeout> | null = null;
let scheduledScopes = new Set<SyncScope>();
let scheduledOptions: ScheduleSyncOptions = {};
let scheduledCallbacks: NonNullable<ScheduleSyncOptions["onComplete"]>[] = [];

function emptyScopeResult(message: string, pending = 0, skipped = true): ScopeResult {
    return {
        ok: skipped,
        skipped,
        pendingBefore: pending,
        pendingAfter: pending,
        synced: 0,
        rejected: 0,
        message,
    };
}

function getErrorMessage(err: unknown, fallback: string) {
    return err instanceof Error ? err.message : fallback;
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildNextRetryAt(attempts: number) {
    const delayMs = Math.min(QUEUE_RETRY_BASE_MS * 2 ** Math.max(0, attempts), QUEUE_RETRY_MAX_MS);
    return new Date(Date.now() + delayMs).toISOString();
}

function logSync(scope: "catalog" | "orders", message: string, details?: Record<string, unknown>) {
    if (details) {
        console.log(`[sync:${scope}] ${message}`, details);
        return;
    }

    console.log(`[sync:${scope}] ${message}`);
}

async function withRetry<T>(operation: () => Promise<T>, attempts = MAX_RETRIES): Promise<T> {
    let lastCaught: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await operation();
        } catch (err) {
            lastCaught = err;

            if (attempt === attempts) {
                break;
            }

            await delay(RETRY_DELAY_MS * attempt);
        }
    }

    throw lastCaught;
}

function shouldSkip(options?: SyncOptions) {
    if (options?.isConnected === false) {
        return "Sem conexão. Dados seguem salvos localmente.";
    }

    if (options?.canSync === false) {
        return "Sincronização indisponível para este contexto.";
    }

    return null;
}

async function getPendingCounts() {
    const [catalogChanges, orders] = await Promise.all([countPendingCatalogChanges(), countPendingOrderSyncQueue()]);

    return {
        pendingCatalogChanges: catalogChanges,
        pendingOrders: orders,
    };
}

async function getSyncSummary(): Promise<SyncSummary> {
    const counts = await getPendingCounts();

    return {
        isSyncing: isSyncingNow,
        pendingCatalogChanges: counts.pendingCatalogChanges,
        pendingOrders: counts.pendingOrders,
        lastSyncAt,
        lastError,
    };
}

function isSyncing() {
    return isSyncingNow;
}

async function runExclusive<T>(fallback: () => Promise<T>, operation: () => Promise<T>) {
    if (isSyncingNow) {
        return fallback();
    }

    isSyncingNow = true;

    try {
        const result = await operation();
        lastSyncAt = new Date().toISOString();
        lastError = null;
        return result;
    } catch (err) {
        lastError = getErrorMessage(err, "Erro ao sincronizar.");
        throw err;
    } finally {
        isSyncingNow = false;
    }
}

async function syncCatalogInternal(options: SyncOptions = {}): Promise<ScopeResult> {
    const pendingBefore = await countPendingCatalogChanges();
    const skipMessage = shouldSkip(options);
    let queueItems = await getPendingCatalogChanges(options.forceRetry);

    if (skipMessage) {
        if (options?.isConnected === false && queueItems.length > 0) {
            const nextRetryAt = buildNextRetryAt(0);
            await Promise.all(queueItems.map((item) => markCatalogChangeFailed(item.queueId, skipMessage, nextRetryAt)));
        }

        return emptyScopeResult(skipMessage, pendingBefore);
    }

    try {
        await normalizeLegacyCatalogIds();

        queueItems = await getPendingCatalogChanges(options.forceRetry);

        if (!queueItems.length) {
            if (options.pullCatalogAfterSync) {
                logSync("catalog", "No local catalog queue. Pulling remote snapshot.");
                const remoteCatalog = await withRetry(() => getMyCatalog());
                await saveCatalog(remoteCatalog);
            }

            return {
                ...emptyScopeResult("Catálogo sem alterações pendentes.", 0, false),
                pendingBefore,
            };
        }

        await markCatalogChangesSyncing(queueItems.map((item) => item.queueId));
        logSync("catalog", "Sending pending catalog changes", {
            total: queueItems.length,
            operations: queueItems.map((item) => ({
                queueId: item.queueId,
                operationId: item.operationId,
                operation: item.operation,
                categoryId: item.categoryId ?? null,
                productId: item.productId ?? null,
            })),
        });

        const response = await withRetry(() =>
            syncCatalogRequest({
                changes: queueItems.map(({ queueId: _queueId, entityType: _entityType, status: _status, attempts: _attempts, lastError: _lastError, ...change }) => ({
                    ...change,
                })),
            }),
        );
        logSync("catalog", "Received catalog sync response", {
            total: response.results.length,
            results: response.results.map((item) => ({
                operationId: item.operationId ?? null,
                remoteId: item.remoteId ?? null,
                status: item.status,
                message: item.message,
                productId: item.currentState?.productId ?? null,
                categoryId: item.currentState?.categoryId ?? null,
            })),
        });

        let synced = 0;
        let rejected = 0;

        for (let index = 0; index < queueItems.length; index++) {
            const queueItem = queueItems[index];
            const result = response.results.find((item: { operationId?: string | null }) => item.operationId === queueItem.operationId) ?? response.results[index];

            if (!result) {
                await markCatalogChangeFailed(queueItem.queueId, "Resposta ausente para operação de catálogo.", buildNextRetryAt(queueItem.attempts));
                continue;
            }

            if (result.status === "APPLIED" || result.status === "DUPLICATE") {
                synced += 1;
                await markCatalogChangeSynced(queueItem.queueId);

                const localProductId = queueItem.productId;
                const remoteProductId = result.currentState?.productId ?? null;

                if (localProductId && remoteProductId && localProductId !== remoteProductId) {
                    logSync("catalog", "Reconciling local product id with remote id", {
                        operationId: queueItem.operationId,
                        localProductId,
                        remoteProductId,
                    });
                    await reconcileProductIdReference(localProductId, remoteProductId);
                }
            } else {
                rejected += 1;
                logSync("catalog", "Catalog change rejected", {
                    operationId: queueItem.operationId,
                    productId: queueItem.productId ?? null,
                    categoryId: queueItem.categoryId ?? null,
                    message: result.message,
                });
                await markCatalogChangeRejected(queueItem.queueId, result.message);
            }
        }

        if (options.pullCatalogAfterSync && rejected === 0) {
            logSync("catalog", "Catalog queue resolved. Pulling remote snapshot.");
            const remoteCatalog = await withRetry(() => getMyCatalog());
            await saveCatalog(remoteCatalog);
        } else if (options.pullCatalogAfterSync && rejected > 0) {
            logSync("catalog", "Skipping remote catalog pull because there are rejected local changes", {
                rejected,
            });
        }

        const pendingAfter = await countPendingCatalogChanges();

        return {
            ok: rejected === 0,
            skipped: false,
            pendingBefore,
            pendingAfter,
            synced,
            rejected,
            message: rejected > 0 ? "Algumas alterações de catálogo foram rejeitadas e exigem ação." : "Catálogo sincronizado.",
        };
    } catch (err) {
        const error = getErrorMessage(err, "Erro ao sincronizar catálogo.");
        lastError = error;

        await Promise.all(queueItems.map((item) => markCatalogChangeFailed(item.queueId, error, buildNextRetryAt(item.attempts))));

        const pendingAfter = await countPendingCatalogChanges();

        return {
            ok: false,
            skipped: false,
            pendingBefore,
            pendingAfter,
            synced: 0,
            rejected: 0,
            message: error,
            error,
        };
    }
}

async function syncOrdersInternal(options: SyncOptions = {}): Promise<ScopeResult> {
    const pendingBefore = await countPendingOrderSyncQueue();
    const skipMessage = shouldSkip(options);
    let queueItems = await getPendingOrderSyncQueue(options.forceRetry);

    if (skipMessage) {
        if (options?.isConnected === false && queueItems.length > 0) {
            const nextRetryAt = buildNextRetryAt(0);
            await Promise.all(queueItems.map((item) => markOrderQueueFailed(item.queueId, skipMessage, nextRetryAt)));
        }

        return emptyScopeResult(skipMessage, pendingBefore);
    }

    try {
        await repairQueuedOrderProductReferences();
        queueItems = await getPendingOrderSyncQueue(options.forceRetry);

        if (!queueItems.length) {
            return {
                ...emptyScopeResult("Nenhum pedido pendente.", 0, false),
                pendingBefore,
            };
        }

        await markOrderQueueSyncing(queueItems.map((item) => item.queueId));
        logSync("orders", "Sending pending offline orders", {
            total: queueItems.length,
            orders: queueItems.map((item) => ({
                queueId: item.queueId,
                localOrderId: item.localOrderId,
                items: item.items.map((orderItem) => ({
                    productId: orderItem.productId,
                    quantity: orderItem.quantity,
                    unitPrice: orderItem.unitPrice ?? null,
                })),
            })),
        });

        const response = await withRetry(() =>
            syncOrdersRequest({
                orders: queueItems.map(({ queueId: _queueId, operationId: _operationId, entityType: _entityType, status: _status, attempts: _attempts, lastError: _lastError, ...order }) => order),
            }),
        );
        logSync("orders", "Received order sync response", {
            total: response.results.length,
            results: response.results.map((item) => ({
                localOrderId: item.localOrderId ?? item.localId ?? null,
                remoteId: item.orderId ?? item.remoteId ?? null,
                status: item.status,
                message: item.message,
                orderStatus: item.currentState?.orderStatus ?? item.orderStatus ?? null,
                paymentStatus: item.currentState?.paymentStatus ?? item.paymentStatus ?? null,
                syncStatus: item.currentState?.syncStatus ?? item.syncStatus ?? null,
            })),
        });

        let synced = 0;
        let rejected = 0;

        for (const queuedOrder of queueItems) {
            const result = response.results.find((item) => (item.localOrderId ?? item.localId) === queuedOrder.localOrderId);
            const localOrderId = result?.localOrderId ?? result?.localId ?? queuedOrder.localOrderId;

            if (!result || !localOrderId) {
                await markOrderQueueFailed(queuedOrder.queueId, "Resposta ausente para pedido offline.", buildNextRetryAt(queuedOrder.attempts));
                continue;
            }

            if (result.status === "APPLIED" || result.status === "DUPLICATE") {
                synced += 1;

                await markOrderSynced({
                    localOrderId,
                    remoteOrderId: result.orderId ?? result.remoteId ?? null,
                    orderStatus: result.orderStatus ?? result.currentState?.orderStatus ?? null,
                    paymentStatus: result.paymentStatus ?? result.currentState?.paymentStatus ?? null,
                    syncStatus: result.syncStatus ?? result.currentState?.syncStatus ?? "OFFLINE_SYNCED",
                });
                await markOrderQueueSynced(queuedOrder.queueId);
            } else {
                rejected += 1;
                logSync("orders", "Offline order rejected", {
                    localOrderId,
                    items: queuedOrder.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                    message: result.message,
                });

                await restoreLocalStockForRejectedOrder(localOrderId);
                await markOrderRejected({
                    localOrderId,
                    message: result.message,
                });
                await markOrderQueueRejected(queuedOrder.queueId, result.message);
            }
        }

        const pendingAfter = await countPendingOrderSyncQueue();

        return {
            ok: rejected === 0,
            skipped: false,
            pendingBefore,
            pendingAfter,
            synced,
            rejected,
            message: rejected > 0 ? "Alguns pedidos foram rejeitados e exigem ação." : "Pedidos sincronizados.",
        };
    } catch (err) {
        const error = getErrorMessage(err, "Erro ao sincronizar pedidos.");
        lastError = error;

        await Promise.all(queueItems.map((item) => markOrderQueueFailed(item.queueId, error, buildNextRetryAt(item.attempts))));

        const pendingAfter = await countPendingOrderSyncQueue();

        return {
            ok: false,
            skipped: false,
            pendingBefore,
            pendingAfter,
            synced: 0,
            rejected: 0,
            message: error,
            error,
        };
    }
}

async function syncCatalog(options: SyncOptions = {}) {
    return runExclusive(
        async () => emptyScopeResult("Sincronização já em andamento.", await countPendingCatalogChanges()),
        () => syncCatalogInternal(options),
    );
}

async function syncOrders(options: SyncOptions = {}) {
    return runExclusive(
        async () => emptyScopeResult("Sincronização já em andamento.", await countPendingOrderSyncQueue()),
        () => syncOrdersInternal(options),
    );
}

async function syncAll(options: SyncOptions = {}): Promise<SyncAllResult> {
    return runExclusive(
        async () => {
            const summary = await getSyncSummary();

            return {
                ok: false,
                skipped: true,
                catalog: emptyScopeResult("Sincronização já em andamento.", summary.pendingCatalogChanges),
                orders: emptyScopeResult("Sincronização já em andamento.", summary.pendingOrders),
                summary,
            };
        },
        async () => {
            const catalog = await syncCatalogInternal({
                ...options,
                pullCatalogAfterSync: options.pullCatalogAfterSync ?? true,
            });

            if (!catalog.ok || catalog.pendingAfter > 0 || catalog.rejected > 0) {
                logSync("orders", "Skipping order sync until catalog queue is fully resolved", {
                    catalogOk: catalog.ok,
                    catalogPendingAfter: catalog.pendingAfter,
                    catalogRejected: catalog.rejected,
                });

                const summary = await getSyncSummary();

                return {
                    ok: false,
                    skipped: false,
                    catalog,
                    orders: {
                        ok: false,
                        skipped: true,
                        pendingBefore: await countPendingOrderSyncQueue(),
                        pendingAfter: await countPendingOrderSyncQueue(),
                        synced: 0,
                        rejected: 0,
                        message: "Pedidos aguardando sincronizacao do catalogo primeiro.",
                    },
                    summary,
                };
            }

            const orders = await syncOrdersInternal(options);
            const summary = await getSyncSummary();

            return {
                ok: catalog.ok && orders.ok,
                skipped: catalog.skipped && orders.skipped,
                catalog,
                orders,
                summary,
            };
        },
    );
}

function scheduleSync(options: ScheduleSyncOptions = {}) {
    const scopes = options.scopes?.length ? options.scopes : (["catalog", "orders"] satisfies SyncScope[]);

    for (const scope of scopes) {
        scheduledScopes.add(scope);
    }

    if (options.onComplete) {
        scheduledCallbacks.push(options.onComplete);
    }

    scheduledOptions = {
        ...scheduledOptions,
        ...options,
        onComplete: undefined,
    };

    if (scheduledTimer) {
        clearTimeout(scheduledTimer);
    }

    scheduledTimer = setTimeout(async () => {
        const scopesToRun = new Set(scheduledScopes);
        const runOptions = scheduledOptions;
        const callbacks = [...scheduledCallbacks];

        scheduledScopes = new Set();
        scheduledOptions = {};
        scheduledCallbacks = [];
        scheduledTimer = null;

        if (scopesToRun.has("catalog") && scopesToRun.has("orders")) {
            await syncAll(runOptions);
        } else if (scopesToRun.has("catalog")) {
            await syncCatalog(runOptions);
        } else if (scopesToRun.has("orders")) {
            await syncOrders(runOptions);
        }

        const summary = await getSyncSummary();

        for (const callback of callbacks) {
            await callback(summary);
        }
    }, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
}

export const syncEngine = {
    syncAll,
    syncCatalog,
    syncOrders,
    scheduleSync,
    getSyncSummary,
    isSyncing,
};

export { getSyncSummary, isSyncing, scheduleSync, syncAll, syncCatalog, syncOrders };
