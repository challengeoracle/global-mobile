import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { OrderConfirmationQrModal } from "@/src/domains/order/components/order-confirmation-qr-modal";
import { buildOrderConfirmationPayloadFromLocal, getLocalOrderItems, getLocalOrders, getOrderSyncIssue, LocalOrderItemRow, LocalOrderRow } from "@/src/domains/order/repositories/order-repository";
import { useOrderFlow } from "@/src/domains/order/hooks/use-order-flow";
import { buildOrderConfirmationQrPayload, encodeOrderQr } from "@/src/domains/order/utils/order-qr";
import { SyncStatusCard } from "@/src/shared/components/sync/sync-status-card";
import { PageHeader } from "@/src/shared/components/ui/page-header";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";
import { useSyncStatus } from "@/src/shared/hooks/use-sync-status";

function money(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function statusLabel(value: string) {
    if (value === "PENDING") return "Aguardando sincronização";
    if (value === "SYNCED") return "Sincronizado";
    if (value === "OFFLINE_SYNCED") return "Sincronizado";
    if (value === "SELLER_CONFIRMED") return "Confirmado offline";
    if (value === "REJECTED") return "Rejeitado";
    return value;
}

function paymentLabel(value: string) {
    if (value === "PENDING_PAYMENT") return "Pagamento pendente";
    if (value === "PAID") return "Pago";
    if (value === "REJECTED") return "Pagamento rejeitado";
    return value;
}

function orderStatusLabel(value: string) {
    if (value === "CREATED") return "Criado";
    if (value === "CONFIRMED") return "Confirmado";
    if (value === "CANCELLED") return "Cancelado";
    return value;
}

function statusClass(value: string) {
    if (value === "REJECTED") return "bg-red-500/10 text-red-500";
    if (value === "PENDING") return "bg-yellow-500/10 text-yellow-600";
    if (value === "SELLER_CONFIRMED") return "bg-blue-500/10 text-blue-500";
    return "bg-primary/10 text-primary";
}

function paymentClass(value: string) {
    if (value === "REJECTED") return "bg-red-500/10 text-red-500";
    if (value === "PAID") return "bg-primary/10 text-primary";
    return "bg-muted text-muted-foreground";
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
    const [selectedOrder, setSelectedOrder] = useState<LocalOrderRow | null>(null);
    const [items, setItems] = useState<LocalOrderItemRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [selectedOrderError, setSelectedOrderError] = useState<string>("");
    const [confirmationQrVisible, setConfirmationQrVisible] = useState(false);
    const [confirmationQrValue, setConfirmationQrValue] = useState<string | null>(null);
    const [confirmationQrMessage, setConfirmationQrMessage] = useState<string | null>(null);
    const [confirmationQrSynced, setConfirmationQrSynced] = useState(false);

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
            {
                total: 0,
                pending: 0,
                rejected: 0,
                synced: 0,
                confirmed: 0,
            },
        );
    }, [orders]);

    async function loadSelectedOrderState(order: LocalOrderRow | null) {
        setSelectedOrder(order);

        if (!order) {
            setItems([]);
            setSelectedOrderError("");
            return;
        }

        const [orderItems, syncIssue] = await Promise.all([getLocalOrderItems(order.id), getOrderSyncIssue(order.local_order_id)]);
        setItems(orderItems);
        setSelectedOrderError(order.sync_status === "REJECTED" ? (syncIssue?.lastError ?? "O servidor rejeitou este pedido.") : "");
    }

    async function loadOrders() {
        try {
            setLoading(true);
            setMessage("");

            const localOrders = await getLocalOrders();
            setOrders(localOrders);

            if (selectedOrder) {
                const updatedSelected = localOrders.find((order) => order.id === selectedOrder.id) ?? null;
                await loadSelectedOrderState(updatedSelected);
            }
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Erro ao carregar pedidos.");
        } finally {
            setLoading(false);
        }
    }

    async function openOrder(order: LocalOrderRow) {
        await loadSelectedOrderState(order);
    }

    async function closeOrder() {
        await loadSelectedOrderState(null);
    }

    async function handleSync() {
        const result = await ordersFlow.syncPendingOrders(false);
        setMessage(result.message);
        await loadOrders();
    }

    async function handleOpenConfirmationQr(order: LocalOrderRow) {
        const confirmation = await buildOrderConfirmationPayloadFromLocal(order.local_order_id);

        if (!confirmation.storeId) {
            setMessage("Pedido sem loja vinculada para gerar confirmação.");
            return;
        }

        const payload = buildOrderConfirmationQrPayload({
            type: "OFFPAY_ORDER_CONFIRMATION",
            version: 1,
            localOrderId: confirmation.localOrderId,
            storeId: confirmation.storeId,
            customerId: confirmation.customerId,
            sellerId: confirmation.sellerId,
            sellerDeviceId: confirmation.sellerDeviceId,
            remoteOrderId: confirmation.remoteOrderId,
            confirmedAt: confirmation.confirmedAt,
            totalAmount: confirmation.totalAmount,
            orderStatus: confirmation.orderStatus,
            paymentStatus: confirmation.paymentStatus,
            syncStatus: confirmation.syncStatus,
            message: confirmation.message,
            items: confirmation.items,
        });

        setConfirmationQrValue(encodeOrderQr(payload));
        setConfirmationQrMessage(confirmation.message ?? null);
        setConfirmationQrSynced(confirmation.syncStatus === "SYNCED" || confirmation.syncStatus === "OFFLINE_SYNCED");
        setConfirmationQrVisible(true);
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
                    <PageHeader eyebrow="Pedidos" title={isSeller ? "Vendas da loja" : "Minhas compras"} />

                    <SyncStatusCard
                        variant="contextual"
                        title="Fila de pedidos"
                        onlineLabel={orderSyncStatus.network.isConnected ? "Online" : "Offline"}
                        onlineColor={orderSyncStatus.network.color}
                        isConnected={orderSyncStatus.network.isConnected}
                        isSyncing={orderSyncStatus.isSyncing}
                        pendingCount={orderSyncStatus.pendingCount}
                        rejectedCount={orderSyncStatus.rejectedCount}
                        pendingLabel="de pedidos"
                        lastError={orderSyncStatus.scopedLastError}
                        syncingNow={orderSyncStatus.syncingNow}
                    />

                    <View className="mb-5 rounded-3xl border border-border bg-card p-4">
                        <View className="flex-row items-start justify-between gap-4">
                            <View className="flex-1">
                                <Text className="text-sm font-bold text-muted-foreground">{isSeller ? "Total vendido localmente" : "Total em pedidos locais"}</Text>

                                <Text className="mt-1 text-3xl font-black text-card-foreground">{money(totals.total)}</Text>

                                <Text className="mt-2 text-sm leading-5 text-muted-foreground">{orders.length} pedido(s) no histórico deste aparelho.</Text>
                            </View>

                            {isSeller ? (
                                <Pressable onPress={handleSync} disabled={!network.isConnected || totals.pending === 0 || ordersFlow.syncing} className="h-11 flex-row items-center gap-2 rounded-2xl bg-primary px-4 disabled:opacity-50">
                                    {ordersFlow.syncing ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />}

                                    <Text className="text-xs font-black uppercase tracking-[1px] text-white">Sync</Text>
                                </Pressable>
                            ) : (
                                <View className="h-11 flex-row items-center gap-2 rounded-2xl border border-border bg-card px-4">
                                    <Ionicons name="shield-checkmark-outline" size={18} color={iconColor} />

                                    <Text className="text-xs font-black uppercase tracking-[1px] text-card-foreground">Local</Text>
                                </View>
                            )}
                        </View>

                        <View className="mt-4 flex-row flex-wrap gap-2">
                            <Text className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{totals.pending} pendente(s)</Text>
                            <Text className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{totals.confirmed} confirmado(s)</Text>
                            <Text className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{totals.synced} sincronizado(s)</Text>
                            <Text className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{totals.rejected} rejeitado(s)</Text>
                        </View>

                        {!isSeller ? <Text className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">Cliente não sincroniza venda. O pedido aparece ou atualiza aqui quando você escaneia o QR do vendedor.</Text> : null}

                        {isSeller && !network.isConnected ? <Text className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">Sem conexão. As vendas confirmadas ficam salvas neste aparelho até voltar a internet.</Text> : null}

                        {ordersFlow.message || message ? <Text className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{ordersFlow.message || message}</Text> : null}
                    </View>

                    <View className="gap-3">
                        {orders.length > 0 ? (
                            orders.map((order) => (
                                <Pressable key={order.id} onPress={() => openOrder(order)} className="rounded-3xl border border-border bg-card p-4">
                                    <View className="flex-row items-start justify-between gap-3">
                                        <View className="flex-1">
                                            <Text className="text-base font-black text-card-foreground">Pedido #{order.local_order_id.slice(0, 8)}</Text>

                                            <Text className="mt-1 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")}</Text>
                                        </View>

                                        <Text className="text-base font-black text-card-foreground">{money(order.total_amount)}</Text>
                                    </View>

                                    <View className="mt-4 flex-row flex-wrap gap-2">
                                        <Text className={`rounded-xl px-3 py-2 text-xs font-bold ${statusClass(order.sync_status)}`}>{statusLabel(order.sync_status)}</Text>
                                        <Text className={`rounded-xl px-3 py-2 text-xs font-bold ${paymentClass(order.payment_status)}`}>{paymentLabel(order.payment_status)}</Text>
                                        <Text className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{orderStatusLabel(order.order_status)}</Text>
                                    </View>

                                    {order.sync_status === "REJECTED" ? <Text className="mt-3 text-sm font-bold text-red-500">Toque para ver o motivo da rejeição.</Text> : null}
                                </Pressable>
                            ))
                        ) : (
                            <View className="rounded-3xl border border-dashed border-border bg-card p-6">
                                <Text className="text-center text-base font-bold text-card-foreground">Nenhum pedido ainda</Text>

                                <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">{isSeller ? "Os pedidos confirmados por QR aparecerão aqui." : "Os pedidos confirmados pelo vendedor aparecerão aqui."}</Text>
                            </View>
                        )}
                    </View>

                    {selectedOrder ? (
                        <View className="mt-6 rounded-3xl border border-border bg-card p-4">
                            <View className="mb-4 flex-row items-center justify-between">
                                <View>
                                    <Text className="text-lg font-black text-card-foreground">Detalhes do pedido</Text>

                                    <Text className="mt-1 text-xs font-bold text-muted-foreground">#{selectedOrder.local_order_id}</Text>
                                </View>

                                <Pressable onPress={closeOrder}>
                                    <Ionicons name="close-circle" size={24} color={iconColor} />
                                </Pressable>
                            </View>

                            <View className="rounded-2xl bg-muted p-4">
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-sm font-bold text-muted-foreground">Total</Text>

                                    <Text className="text-xl font-black text-card-foreground">{money(selectedOrder.total_amount)}</Text>
                                </View>

                                <View className="mt-3 flex-row flex-wrap gap-2">
                                    <Text className={`rounded-xl px-3 py-2 text-xs font-bold ${statusClass(selectedOrder.sync_status)}`}>{statusLabel(selectedOrder.sync_status)}</Text>
                                    <Text className={`rounded-xl px-3 py-2 text-xs font-bold ${paymentClass(selectedOrder.payment_status)}`}>{paymentLabel(selectedOrder.payment_status)}</Text>
                                    <Text className="rounded-xl bg-card px-3 py-2 text-xs font-bold text-card-foreground">{orderStatusLabel(selectedOrder.order_status)}</Text>
                                </View>
                            </View>

                            {selectedOrderError ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{selectedOrderError}</Text> : null}

                            {isSeller ? (
                                <Pressable onPress={() => handleOpenConfirmationQr(selectedOrder)} className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-card">
                                    <Ionicons name="qr-code-outline" size={18} color={iconColor} />
                                    <Text className="text-sm font-black uppercase tracking-[1px] text-card-foreground">Mostrar QR ao cliente</Text>
                                </Pressable>
                            ) : null}

                            <View className="mt-4 gap-3">
                                {items.map((item) => (
                                    <View key={item.id} className="rounded-2xl border border-border bg-card p-3">
                                        <View className="flex-row justify-between gap-3">
                                            <View className="flex-1">
                                                <Text className="text-sm font-black text-card-foreground">{item.product_name}</Text>

                                                <Text className="mt-1 text-xs text-muted-foreground">
                                                    {item.quantity}x {money(item.unit_price)}
                                                </Text>
                                            </View>

                                            <Text className="text-sm font-black text-card-foreground">{money(item.total_price)}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : null}
                </View>
            </ScrollView>

            <OrderConfirmationQrModal visible={confirmationQrVisible} qrValue={confirmationQrValue} synced={confirmationQrSynced} message={confirmationQrMessage} onClose={() => setConfirmationQrVisible(false)} />
        </View>
    );
}
