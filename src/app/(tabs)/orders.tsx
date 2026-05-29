import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { PageHeader } from "@/src/components/ui/page-header";
import { getLocalOrderItems, getLocalOrders, LocalOrderItemRow, LocalOrderRow } from "@/src/database/repositories/order-repository";
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
    if (value === "REJECTED") return "Rejeitado";
    return value;
}

function paymentLabel(value: string) {
    if (value === "PENDING_PAYMENT") return "Pagamento pendente";
    if (value === "PAID") return "Pago";
    if (value === "REJECTED") return "Pagamento rejeitado";
    return value;
}

export default function OrdersScreen() {
    const { colorScheme } = useColorScheme();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";

    const ordersFlow = useOrderFlow();

    const [orders, setOrders] = useState<LocalOrderRow[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<LocalOrderRow | null>(null);
    const [items, setItems] = useState<LocalOrderItemRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    async function loadOrders() {
        try {
            setLoading(true);
            const localOrders = await getLocalOrders();
            setOrders(localOrders);

            if (selectedOrder) {
                const updatedSelected = localOrders.find((order) => order.id === selectedOrder.id) ?? null;
                setSelectedOrder(updatedSelected);

                if (updatedSelected) {
                    setItems(await getLocalOrderItems(updatedSelected.id));
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

    async function handleSync() {
        await ordersFlow.syncPendingOrders(false);
        await loadOrders();
    }

    useFocusEffect(
        useCallback(() => {
            loadOrders();
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
                    <PageHeader eyebrow="Pedidos" title="Histórico" />

                    <View className="mb-5 rounded-3xl border border-border bg-card p-4">
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-sm font-bold text-muted-foreground">Pedidos locais</Text>

                                <Text className="mt-1 text-2xl font-black text-card-foreground">{orders.length}</Text>
                            </View>

                            <Pressable onPress={handleSync} disabled={ordersFlow.syncing} className="h-11 flex-row items-center gap-2 rounded-2xl bg-primary px-4 disabled:opacity-60">
                                {ordersFlow.syncing ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />}

                                <Text className="text-xs font-black uppercase tracking-[1px] text-white">Sync</Text>
                            </Pressable>
                        </View>

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

                                    <View className="mt-4 flex-row gap-2">
                                        <Text className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{statusLabel(order.sync_status)}</Text>

                                        <Text className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{paymentLabel(order.payment_status)}</Text>
                                    </View>
                                </Pressable>
                            ))
                        ) : (
                            <View className="rounded-3xl border border-dashed border-border bg-card p-6">
                                <Text className="text-center text-base font-bold text-card-foreground">Nenhum pedido ainda</Text>

                                <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Os pedidos gerados ou confirmados offline aparecerão aqui.</Text>
                            </View>
                        )}
                    </View>

                    {selectedOrder ? (
                        <View className="mt-6 rounded-3xl border border-border bg-card p-4">
                            <View className="mb-4 flex-row items-center justify-between">
                                <Text className="text-lg font-black text-card-foreground">Detalhes</Text>

                                <Pressable onPress={() => setSelectedOrder(null)}>
                                    <Ionicons name="close-circle" size={22} color={iconColor} />
                                </Pressable>
                            </View>

                            <Text className="text-sm font-bold text-muted-foreground">Pedido #{selectedOrder.local_order_id}</Text>

                            <Text className="mt-2 text-xl font-black text-card-foreground">{money(selectedOrder.total_amount)}</Text>

                            <View className="mt-4 gap-3">
                                {items.map((item) => (
                                    <View key={item.id} className="rounded-2xl bg-muted p-3">
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
