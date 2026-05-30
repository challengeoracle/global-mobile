import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { useOrderFlow } from "@/src/domains/order/hooks/use-order-flow";
import { getLocalOrderItems, getLocalOrders, getOrderSyncIssue, LocalOrderRow, saveRemoteOrders, updateLocalOrderPaymentStatusByRemoteId } from "@/src/domains/order/repositories/order-repository";
import { getMyOrders, getMyPurchases, getMySales, getOrdersByCustomer } from "@/src/domains/order/services/order-service";
import { OrderResponse } from "@/src/domains/order/types/order";
import { orderStatusTone, paymentStatusTone, syncStatusTone } from "@/src/domains/order/utils/order-display";
import { getPaymentTransactionByOrderId } from "@/src/domains/payment/services/payment-service";
import { SyncStatusCard } from "@/src/shared/components/sync/sync-status-card";
import { PageHeader } from "@/src/shared/components/ui/page-header";
import { formatCurrency, formatDateTime, formatOrderStatus, formatPaymentStatus, formatStoreLabel, formatSyncStatus } from "@/src/shared/lib/formatters";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";
import { useSyncStatus } from "@/src/shared/hooks/use-sync-status";

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function queueIssueMessage(syncStatus: string, queueStatus?: string, lastError?: string | null) {
    if (syncStatus === "REJECTED") {
        return lastError ?? "Não foi possível concluir este pedido.";
    }

    if (queueStatus === "FAILED") {
        return lastError ?? "Houve uma falha temporária. Tente novamente em instantes.";
    }

    return "";
}

function getPrimaryOrderDate(order: LocalOrderRow) {
    return order.offline_created_at ?? order.created_at;
}

function dedupeRemoteOrders(orders: OrderResponse[]) {
    const ordersMap = new Map<string, OrderResponse>();

    for (const order of orders) {
        ordersMap.set(order.id, order);
    }

    return Array.from(ordersMap.values());
}

export default function OrdersScreen() {
    const { colorScheme } = useColorScheme();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";

    const { user } = useAuth();
    const network = useNetworkStatus();
    const isSeller = user?.role === "SELLER";

    const ordersFlow = useOrderFlow();
    const orderSyncStatus = useSyncStatus("orders");

    const [orders, setOrders] = useState<LocalOrderRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const totals = useMemo(() => {
        return orders.reduce(
            (acc, order) => {
                acc.total += order.total_amount;

                if (order.sync_status === "PENDING") acc.pending += 1;
                if (order.sync_status === "REJECTED") acc.rejected += 1;
                if (order.sync_status === "SYNCED" || order.sync_status === "OFFLINE_SYNCED") acc.synced += 1;
                if (order.sync_status === "SELLER_CONFIRMED") acc.confirmed += 1;

                return acc;
            },
            { total: 0, pending: 0, rejected: 0, synced: 0, confirmed: 0 },
        );
    }, [orders]);

    async function loadLocalOrders() {
        const localOrders = await getLocalOrders();
        console.log("[Orders] SQLite carregado", {
            quantidade: localOrders.length,
            ids: localOrders.map((order) => order.local_order_id),
        });
        setOrders(localOrders);
        return localOrders;
    }

    async function refreshOrdersFromBackend(options?: { delayedRetry?: boolean; silent?: boolean }) {
        if (!network.canAttemptRemote) {
            console.log("[Orders] Sem conexão. Mantendo apenas pedidos locais.", {
                isConnected: network.isConnected,
                isInternetReachable: network.isInternetReachable,
                source: network.source,
                type: network.type,
            });
            return;
        }

        try {
            console.log("[Orders] Iniciando refresh remoto", {
                delayedRetry: Boolean(options?.delayedRetry),
                usuario: user?.id,
                role: user?.role,
                isConnected: network.isConnected,
                isInternetReachable: network.isInternetReachable,
                source: network.source,
                type: network.type,
            });
            const remoteOrders = await loadRemoteOrders();
            console.log("[Orders] Pedidos recebidos da API", {
                quantidade: remoteOrders.length,
                ids: remoteOrders.map((order) => order.id),
            });
            await saveRemoteOrders(remoteOrders);
            console.log("[Orders] Pedidos remotos salvos no SQLite");
            await loadLocalOrders();

            if (options?.delayedRetry) {
                console.log("[Orders] Aguardando novo refresh para reconciliar pagamento");
                await wait(1800);
                const refreshedOrders = await loadRemoteOrders();
                console.log("[Orders] Segundo refresh remoto concluído", {
                    quantidade: refreshedOrders.length,
                    ids: refreshedOrders.map((order) => order.id),
                });
                await saveRemoteOrders(refreshedOrders);
                const refreshedLocalOrders = await loadLocalOrders();
                await reconcilePendingPayments(refreshedLocalOrders);
                await loadLocalOrders();
            }
        } catch (err) {
            console.log("[Orders] Erro ao atualizar pedidos", err);
            if (!options?.silent) {
                setMessage(err instanceof Error ? err.message : "Não foi possível atualizar os pedidos agora.");
            }
        }
    }

    async function reconcilePendingPayments(sourceOrders?: LocalOrderRow[]) {
        const ordersToCheck = (sourceOrders ?? orders).filter((order) => {
            return Boolean(order.remote_order_id) && (order.payment_status === "PENDING" || order.payment_status === "PENDING_PAYMENT");
        });

        await Promise.all(
            ordersToCheck.map(async (order) => {
                if (!order.remote_order_id) {
                    return;
                }

                try {
                    console.log("[Orders] Consultando transação de pagamento", {
                        localOrderId: order.local_order_id,
                        remoteOrderId: order.remote_order_id,
                        paymentStatusAtual: order.payment_status,
                    });
                    const transaction = await getPaymentTransactionByOrderId(order.remote_order_id);
                    const nextStatus = transaction.status === "APPROVED" ? "PAID" : transaction.status === "REJECTED" ? "REJECTED" : null;

                    console.log("[Orders] Retorno da transação de pagamento", {
                        remoteOrderId: order.remote_order_id,
                        statusTransacao: transaction.status,
                        paymentStatusAplicado: nextStatus,
                    });

                    if (!nextStatus) {
                        return;
                    }

                    await updateLocalOrderPaymentStatusByRemoteId({
                        remoteOrderId: order.remote_order_id,
                        paymentStatus: nextStatus,
                    });
                } catch {
                    // If payment data is not ready yet, we keep the persisted order state.
                }
            }),
        );
    }

    async function loadRemoteOrders() {
        if (!user) {
            console.log("[Orders] Usuário ausente. Não foi possível buscar pedidos remotos.");
            return [];
        }

        if (user.role === "SELLER") {
            const [sales, purchases] = await Promise.all([getMySales(), getMyPurchases()]);
            console.log("[Orders] SELLER buscou vendas e compras", {
                vendas: sales.length,
                compras: purchases.length,
            });
            return dedupeRemoteOrders([...sales, ...purchases]);
        }

        const purchases = await getMyPurchases();
        console.log("[Orders] CUSTOMER buscou /order/me/purchases", {
            quantidade: purchases.length,
        });

        if (purchases.length > 0) {
            return purchases;
        }

        const remoteOrders = await getMyOrders();
        console.log("[Orders] CUSTOMER fallback /order/me", {
            quantidade: remoteOrders.length,
        });

        if (remoteOrders.length > 0) {
            return remoteOrders;
        }

        console.log("[Orders] CUSTOMER fallback final /order/customer/{id}", {
            customerId: user.id,
        });
        return getOrdersByCustomer(user.id);
    }

    async function loadOrders() {
        try {
            setLoading(true);
            setMessage("");
            console.log("[Orders] Carregando tela de pedidos");
            await loadLocalOrders();
            await refreshOrdersFromBackend({ silent: false });
        } catch (err) {
            console.log("[Orders] Erro no carregamento inicial", err);
            setMessage(err instanceof Error ? err.message : "Erro ao carregar pedidos.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSync() {
        console.log("[Orders] Sincronização manual iniciada");
        const result = await ordersFlow.syncPendingOrders(false);
        console.log("[Orders] Resultado da sincronização manual", result);
        setMessage(result.message);
        await loadLocalOrders();
        await refreshOrdersFromBackend({ delayedRetry: true, silent: false });
    }

    useFocusEffect(
        useCallback(() => {
            loadOrders();
            ordersFlow.refreshPendingOrderCount();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []),
    );

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color={iconColor} size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="px-6 pb-10 pt-14">
                    <PageHeader eyebrow="Pedidos" title={isSeller ? "Recibos da loja" : "Meus recibos"} description="Veja rapidamente loja, horário, valor total, pagamento e sincronização de cada compra." />

                    <SyncStatusCard
                        variant="contextual"
                        title="Andamento dos pedidos"
                        onlineLabel={orderSyncStatus.network.isConnected ? "Online" : "Offline"}
                        onlineColor={orderSyncStatus.network.color}
                        isConnected={orderSyncStatus.network.isConnected}
                        isSyncing={orderSyncStatus.isSyncing}
                        pendingCount={orderSyncStatus.pendingCount}
                        rejectedCount={orderSyncStatus.rejectedCount}
                        pendingLabel="pedido(s) aguardando envio"
                        lastError={orderSyncStatus.scopedLastError}
                        syncingNow={orderSyncStatus.syncingNow}
                    />

                    <View className="mb-5 rounded-[28px] border border-border bg-card p-5">
                        <View className="flex-row items-start justify-between gap-4">
                            <View className="flex-1">
                                <Text className="text-sm font-bold text-muted-foreground">{isSeller ? "Total recebido em pedidos" : "Total em compras"}</Text>
                                <Text className="mt-2 text-3xl font-black text-card-foreground">{formatCurrency(totals.total)}</Text>
                                <Text className="mt-2 text-sm leading-5 text-muted-foreground">{orders.length} recibo(s) disponíveis no histórico.</Text>
                            </View>

                            {isSeller ? (
                                <Pressable onPress={handleSync} disabled={!network.canAttemptRemote || totals.pending === 0 || ordersFlow.syncing} className="h-12 flex-row items-center gap-2 rounded-2xl bg-primary px-4 disabled:opacity-50">
                                    {ordersFlow.syncing ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />}
                                    <Text className="text-xs font-black uppercase tracking-[1px] text-white">Sincronizar</Text>
                                </Pressable>
                            ) : null}
                        </View>

                        <View className="mt-4 flex-row flex-wrap gap-2">
                            <SummaryPill label={`${totals.pending} pendente(s)`} />
                            <SummaryPill label={`${totals.confirmed} confirmado(s)`} />
                            <SummaryPill label={`${totals.synced} sincronizado(s)`} />
                            <SummaryPill label={`${totals.rejected} com problema`} />
                        </View>

                        {ordersFlow.message || message ? <Text className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{ordersFlow.message || message}</Text> : null}
                    </View>

                    <View className="gap-4">
                        {orders.length > 0 ? (
                            orders.map((order) => <ReceiptCard key={order.id} order={order} />)
                        ) : (
                            <View className="rounded-3xl border border-dashed border-border bg-card p-6">
                                <Text className="text-center text-base font-bold text-card-foreground">Nenhum pedido ainda</Text>
                                <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">{isSeller ? "Quando você confirmar uma compra, o recibo aparecerá aqui." : "Seus pedidos confirmados aparecerão aqui em formato de recibo."}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

function ReceiptCard({ order }: { order: LocalOrderRow }) {
    const [itemCount, setItemCount] = useState<number | null>(null);
    const [syncIssue, setSyncIssue] = useState("");

    useFocusEffect(
        useCallback(() => {
            let active = true;

            (async () => {
                const [items, issue] = await Promise.all([getLocalOrderItems(order.id), getOrderSyncIssue(order.local_order_id)]);

                if (!active) {
                    return;
                }

                setItemCount(items.reduce((total, item) => total + item.quantity, 0));
                setSyncIssue(queueIssueMessage(order.sync_status, issue?.queueStatus, issue?.lastError));
            })();

            return () => {
                active = false;
            };
        }, [order.id, order.local_order_id, order.sync_status]),
    );

    return (
        <Pressable onPress={() => router.push({ pathname: "/orders/[orderId]", params: { orderId: order.id } })} className="overflow-hidden rounded-[30px] border border-border bg-card active:opacity-90">
            <View className="border-b border-dashed border-border/80 px-5 py-4">
                <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                        <Text className="text-xs font-black uppercase tracking-[2px] text-muted-foreground">Recibo</Text>
                        <Text className="mt-2 text-xl font-black text-card-foreground">{formatStoreLabel(order.store_id)}</Text>
                        <Text className="mt-1 text-sm text-muted-foreground">{formatDateTime(getPrimaryOrderDate(order))}</Text>
                    </View>

                    <View className="items-end">
                        <Text className="text-xs font-bold uppercase tracking-[1px] text-muted-foreground">Total</Text>
                        <Text className="mt-1 text-2xl font-black text-card-foreground">{formatCurrency(order.total_amount)}</Text>
                    </View>
                </View>
            </View>

            <View className="gap-4 px-5 py-4">
                <View className="flex-row flex-wrap gap-2">
                    <Text className={`rounded-full px-3 py-2 text-xs font-bold ${orderStatusTone(order.order_status)}`}>{formatOrderStatus(order.order_status)}</Text>
                    <Text className={`rounded-full px-3 py-2 text-xs font-bold ${paymentStatusTone(order.payment_status)}`}>{formatPaymentStatus(order.payment_status)}</Text>
                    <Text className={`rounded-full px-3 py-2 text-xs font-bold ${syncStatusTone(order.sync_status)}`}>{formatSyncStatus(order.sync_status)}</Text>
                </View>

                <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">{itemCount === null ? "Carregando itens..." : `${itemCount} item(ns)`}</Text>
                    <Text className="text-sm text-muted-foreground">{order.offline_created_at ? "Compra criada offline" : "Compra criada online"}</Text>
                </View>

                {syncIssue ? <Text className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{syncIssue}</Text> : null}

                <View className="flex-row items-center justify-between border-t border-dashed border-border/80 pt-4">
                    <Text className="text-sm font-medium text-muted-foreground">Ver detalhes</Text>
                    <Ionicons name="chevron-forward" size={18} color="#71717a" />
                </View>
            </View>
        </Pressable>
    );
}

function SummaryPill({ label }: { label: string }) {
    return <Text className="rounded-full bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{label}</Text>;
}
