import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { ReactNode, useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { orderStatusTone, paymentStatusTone, syncStatusTone } from "@/src/domains/order/utils/order-display";
import { getLocalOrderByAnyId, getLocalOrderItems, getOrderSyncIssue, LocalOrderItemRow, LocalOrderRow, saveRemoteOrder } from "@/src/domains/order/repositories/order-repository";
import { getOrderById } from "@/src/domains/order/services/order-service";
import { PaymentTransactionModal } from "@/src/domains/payment/components/payment-transaction-modal";
import { getPaymentTransactionByOrderId } from "@/src/domains/payment/services/payment-service";
import { PaymentTransactionResponse } from "@/src/domains/payment/types/payment";
import { PageHeader } from "@/src/shared/components/ui/page-header";
import { formatCurrency, formatDateTime, formatOrderStatus, formatPaymentStatus, formatShortId, formatStoreLabel, formatSyncStatus } from "@/src/shared/lib/formatters";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";

type DetailRowProps = {
    label: string;
    value?: string | null;
    subtle?: boolean;
    selectable?: boolean;
};

function DetailRow({ label, value, subtle = false, selectable = false }: DetailRowProps) {
    return (
        <View className="flex-row justify-between gap-4 py-3">
            <Text className="flex-1 text-sm font-bold text-muted-foreground">{label}</Text>
            <Text selectable={selectable} className={`flex-1 text-right text-sm ${subtle ? "text-muted-foreground" : "text-card-foreground"}`}>
                {value || "-"}
            </Text>
        </View>
    );
}

export default function OrderDetailsScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { colorScheme } = useColorScheme();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const network = useNetworkStatus();

    const [order, setOrder] = useState<LocalOrderRow | null>(null);
    const [items, setItems] = useState<LocalOrderItemRow[]>([]);
    const [queueMessage, setQueueMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentTransaction, setPaymentTransaction] = useState<PaymentTransactionResponse | null>(null);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);

    const totalItems = items.reduce((total, item) => total + item.quantity, 0);

    async function hydrateLocalState(targetId: string) {
        const localOrder = await getLocalOrderByAnyId(targetId);

        if (!localOrder) {
            setOrder(null);
            setItems([]);
            setQueueMessage("");
            return null;
        }

        const [localItems, syncIssue] = await Promise.all([getLocalOrderItems(localOrder.id), getOrderSyncIssue(localOrder.local_order_id)]);

        setOrder(localOrder);
        setItems(localItems);
        setQueueMessage(syncIssue?.lastError ?? "");

        return localOrder;
    }

    async function loadOrderDetails() {
        if (!orderId) {
            setMessage("Pedido inválido.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            const localOrder = await hydrateLocalState(orderId);

            if (!network.isConnected || !localOrder?.remote_order_id) {
                return;
            }

            try {
                const remoteOrder = await getOrderById(localOrder.remote_order_id);
                await saveRemoteOrder(remoteOrder);
                await hydrateLocalState(remoteOrder.id);
            } catch (err) {
                setMessage(err instanceof Error ? err.message : "Não foi possível atualizar este pedido com o backend.");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleViewPayment() {
        if (!order?.remote_order_id) {
            setMessage("Este pedido ainda não possui um identificador remoto para consultar o pagamento.");
            return;
        }

        try {
            setPaymentLoading(true);
            const transaction = await getPaymentTransactionByOrderId(order.remote_order_id);
            setPaymentTransaction(transaction);
            setPaymentModalVisible(true);
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Não foi possível consultar a transação de pagamento.");
        } finally {
            setPaymentLoading(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            loadOrderDetails();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [orderId, network.isConnected]),
    );

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color={iconColor} size="large" />
            </View>
        );
    }

    if (!order) {
        return (
            <View className="flex-1 bg-background px-6 pb-10 pt-14">
                <Pressable onPress={() => router.back()} className="mb-6 h-11 w-11 items-center justify-center rounded-2xl bg-card">
                    <Ionicons name="arrow-back" size={20} color={iconColor} />
                </Pressable>
                <Text className="text-2xl font-black text-foreground">Pedido não encontrado</Text>
                <Text className="mt-3 text-base leading-7 text-muted-foreground">Este pedido não está salvo localmente e não foi possível carregá-lo agora.</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="px-6 pb-10 pt-14">
                    <Pressable onPress={() => router.back()} className="mb-6 h-11 w-11 items-center justify-center rounded-2xl bg-card">
                        <Ionicons name="arrow-back" size={20} color={iconColor} />
                    </Pressable>

                    <PageHeader eyebrow="Recibo" title={formatStoreLabel(order.store_id)} description="Resumo da compra com itens, pagamento e informações complementares do pedido." />

                    <View className="overflow-hidden rounded-[32px] border border-border bg-card">
                        <View className="border-b border-dashed border-border/80 px-5 py-5">
                            <View className="flex-row items-start justify-between gap-4">
                                <View className="flex-1">
                                    <Text className="text-xs font-black uppercase tracking-[2px] text-muted-foreground">Data da compra</Text>
                                    <Text className="mt-2 text-base font-bold text-card-foreground">{formatDateTime(order.offline_created_at ?? order.created_at)}</Text>
                                    <Text className="mt-1 text-sm text-muted-foreground">{order.offline_created_at ? "Registro iniciado offline" : "Registro iniciado online"}</Text>
                                </View>

                                <View className="items-end">
                                    <Text className="text-xs font-black uppercase tracking-[2px] text-muted-foreground">Total</Text>
                                    <Text className="mt-2 text-3xl font-black text-card-foreground">{formatCurrency(order.total_amount)}</Text>
                                    <Text className="mt-1 text-sm text-muted-foreground">{totalItems} item(ns)</Text>
                                </View>
                            </View>
                        </View>

                        <View className="px-5 py-4">
                            <View className="flex-row flex-wrap gap-2">
                                <Text className={`rounded-full px-3 py-2 text-xs font-bold ${orderStatusTone(order.order_status)}`}>{formatOrderStatus(order.order_status)}</Text>
                                <Text className={`rounded-full px-3 py-2 text-xs font-bold ${paymentStatusTone(order.payment_status)}`}>{formatPaymentStatus(order.payment_status)}</Text>
                                <Text className={`rounded-full px-3 py-2 text-xs font-bold ${syncStatusTone(order.sync_status)}`}>{formatSyncStatus(order.sync_status)}</Text>
                            </View>
                        </View>
                    </View>

                    {message ? <Text className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{message}</Text> : null}
                    {queueMessage ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{queueMessage}</Text> : null}

                    <Section title="Itens da compra">
                        {items.map((item) => (
                            <View key={item.id} className="rounded-[24px] border border-border bg-background p-4">
                                <View className="flex-row items-start justify-between gap-3">
                                    <View className="flex-1">
                                        <Text className="text-base font-black text-card-foreground">{item.product_name}</Text>
                                        <Text className="mt-1 text-sm text-muted-foreground">{item.quantity} x {formatCurrency(item.unit_price)}</Text>
                                    </View>
                                    <Text className="text-base font-black text-card-foreground">{formatCurrency(item.total_price)}</Text>
                                </View>
                            </View>
                        ))}
                    </Section>

                    <Section title="Resumo do pagamento">
                        <DetailRow label="Pagamento" value={formatPaymentStatus(order.payment_status)} />
                        <DetailRow label="Situação do pedido" value={formatOrderStatus(order.order_status)} />
                        <DetailRow label="Sincronização" value={formatSyncStatus(order.sync_status)} />

                        {order.remote_order_id ? (
                            <Pressable onPress={handleViewPayment} disabled={paymentLoading} className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary disabled:opacity-60">
                                {paymentLoading ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="card-outline" size={18} color="#ffffff" />}
                                <Text className="text-sm font-black uppercase tracking-[1px] text-white">Ver comprovante do pagamento</Text>
                            </Pressable>
                        ) : null}
                    </Section>

                    <Section title="Pessoas e operação">
                        <DetailRow label="Loja" value={formatStoreLabel(order.store_id)} />
                        <DetailRow label="Vendedor" value={order.seller_id ? `Identificador ${formatShortId(order.seller_id)}` : "Não informado"} subtle />
                        <DetailRow label="Cliente" value={order.customer_id ? `Identificador ${formatShortId(order.customer_id)}` : "Não informado"} subtle />
                        <DetailRow label="Criado em" value={formatDateTime(order.created_at)} subtle />
                        <DetailRow label="Registrado offline em" value={formatDateTime(order.offline_created_at)} subtle />
                        <DetailRow label="Sincronizado em" value={formatDateTime(order.synced_at)} subtle />
                    </Section>

                    <Section title="Informações técnicas">
                        <Text className="mb-2 text-sm leading-6 text-muted-foreground">Toque e segure os identificadores se precisar copiar alguma referência para suporte ou conferência.</Text>
                        <DetailRow label="Pedido remoto" value={order.remote_order_id} subtle selectable />
                        <DetailRow label="Pedido local" value={order.local_order_id} subtle selectable />
                        <DetailRow label="Loja ID" value={order.store_id} subtle selectable />
                        <DetailRow label="Cliente ID" value={order.customer_id} subtle selectable />
                        <DetailRow label="Vendedor ID" value={order.seller_id} subtle selectable />
                        <DetailRow label="Device ID" value={order.device_id} subtle selectable />
                    </Section>
                </View>
            </ScrollView>

            <PaymentTransactionModal visible={paymentModalVisible} transaction={paymentTransaction} onClose={() => setPaymentModalVisible(false)} />
        </View>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View className="mt-6 rounded-[28px] border border-border bg-card p-5">
            <Text className="mb-4 text-lg font-black text-card-foreground">{title}</Text>
            <View className="gap-3">{children}</View>
        </View>
    );
}
