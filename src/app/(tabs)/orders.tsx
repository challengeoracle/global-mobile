import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { PageHeader } from "@/src/components/ui/page-header";
import { useAuth } from "@/src/contexts/auth-context";
import { getLocalOrderItems, getLocalOrders, LocalOrderItemRow, LocalOrderRow } from "@/src/database/repositories/order-repository";
import { useNetworkStatus } from "@/src/hooks/use-network-status";
import { useOrderFlow } from "@/src/hooks/use-order-flow";

function money(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function statusLabel(value: string) {
    if (value === "PENDING") return "Pendente";
    if (value === "SYNCED") return "Sincronizado";
    if (value === "OFFLINE_SYNCED") return "Sincronizado";
    if (value === "SELLER_CONFIRMED") return "Confirmado pelo vendedor";
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

    // Puxando os hooks de Autenticação e Rede
    const { user } = useAuth();
    const network = useNetworkStatus();
    const isSeller = user?.role === "SELLER";

    const ordersFlow = useOrderFlow();

    const [orders, setOrders] = useState<LocalOrderRow[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<LocalOrderRow | null>(null);
    const [items, setItems] = useState<LocalOrderItemRow[]>([]);
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
            {
                total: 0,
                pending: 0,
                rejected: 0,
                synced: 0,
                confirmed: 0,
            },
        );
    }, [orders]);

    async function loadOrders() {
        try {
            setLoading(true);
            setMessage("");

            const localOrders = await getLocalOrders();
            setOrders(localOrders);

            if (selectedOrder) {
                const updatedSelected = localOrders.find((order) => order.id === selectedOrder.id) ?? null;
                setSelectedOrder(updatedSelected);

                if (updatedSelected) {
                    setItems(await getLocalOrderItems(updatedSelected.id));
                } else {
                    setItems([]);
                }
            }
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Erro ao carregar pedidos.");
        } finally {
            setLoading(false);
        }
    }

    async function openOrder(order: LocalOrderRow) {
        setSelectedOrder(order);
        setItems(await getLocalOrderItems(order.id));
    }

    async function closeOrder() {
        setSelectedOrder(null);
        setItems([]);
    }

    async function handleSync() {
        await ordersFlow.syncPendingOrders(false);
        await loadOrders();
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

                        {!isSeller ? <Text className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">Cliente não sincroniza venda. O pedido aparece aqui depois que você escaneia a confirmação do vendedor.</Text> : null}

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
        </View>
    );
}
