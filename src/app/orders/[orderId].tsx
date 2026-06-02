import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { LocalOrderItemRow, LocalOrderRow, getLocalOrderByAnyId, getLocalOrderItems, getOrderSyncIssue, saveRemoteOrder, updateLocalOrderPaymentStatusByRemoteId } from "@/src/domains/order/repositories/order-repository";
import { getOrderById } from "@/src/domains/order/services/order-service";
import { orderStatusTone, paymentStatusTone, syncStatusTone } from "@/src/domains/order/utils/order-display";
import { PaymentTransactionModal } from "@/src/domains/payment/components/payment-transaction-modal";
import { getPaymentTransactionByOrderId, settlePaymentDebt } from "@/src/domains/payment/services/payment-service";
import { PaymentTransactionResponse } from "@/src/domains/payment/types/payment";
import { ProtectedRoute } from "@/src/shared/components/auth/protected-route";
import { PageHeader } from "@/src/shared/components/ui/page-header";
import { StatusChip } from "@/src/shared/components/ui/status-chip";
import { formatCreditDebtStatus, formatCurrency, formatDateTime, formatOrderStatus, formatPaymentStatus, formatStoreLabel, formatSyncStatus, formatSyncTimestampLabel } from "@/src/shared/lib/formatters";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";

type DetailRowProps = {
    label: string;
    value?: string | null;
    subtle?: boolean;
};

function DetailRow({ label, value, subtle = false }: DetailRowProps) {
    return (
        <View className="flex-row justify-between gap-4 py-2.5">
            <Text className="flex-1 text-sm font-bold text-muted-foreground">{label}</Text>
            <Text className={`max-w-[58%] flex-1 text-right text-sm ${subtle ? "text-muted-foreground" : "text-card-foreground"}`}>{value || "-"}</Text>
        </View>
    );
}

export default function OrderDetailsScreen() {
    return (
        <ProtectedRoute>
            <OrderDetailsContent />
        </ProtectedRoute>
    );
}

function OrderDetailsContent() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { colorScheme } = useColorScheme();
    const { user } = useAuth();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const network = useNetworkStatus();

    const [order, setOrder] = useState<LocalOrderRow | null>(null);
    const [items, setItems] = useState<LocalOrderItemRow[]>([]);
    const [queueMessage, setQueueMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [debtSettling, setDebtSettling] = useState(false);
    const [paymentTransaction, setPaymentTransaction] = useState<PaymentTransactionResponse | null>(null);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const isCustomer = user?.role === "CUSTOMER";
    const hasDebt = (paymentTransaction?.creditDebtAmount ?? 0) > 0;
    const debtSettled = !hasDebt && Boolean(paymentTransaction?.creditDebtSettledAt);
    const shouldShowDebtCallout = hasDebt || debtSettled;

    const debtCallout = useMemo(() => {
        if (hasDebt && paymentTransaction) {
            return {
                containerClassName: "border-red-500/30 bg-red-500/10",
                titleClassName: "text-red-700",
                bodyClassName: "text-red-700",
                title: formatCreditDebtStatus(paymentTransaction.creditDebtAmount, paymentTransaction.creditDebtSettledAt),
                body: `Há um problema financeiro neste pedido: ${formatCurrency(paymentTransaction.creditDebtAmount)} ficou em aberto e deixou a carteira do cliente negativa.`,
                helper: "O cliente concluiu a compra, mas não tinha saldo suficiente. Adicione saldo na carteira e quite este pedido para regularizar a situação.",
            };
        }

        if (debtSettled && paymentTransaction) {
            return {
                containerClassName: "border-emerald-500/20 bg-emerald-500/10",
                titleClassName: "text-emerald-700",
                bodyClassName: "text-muted-foreground",
                title: "Crédito devedor quitado",
                body: "Este pedido já foi regularizado e não existe mais valor pendente na carteira do cliente.",
                helper: paymentTransaction.creditDebtSettledAt ? `Quitado em ${formatDateTime(paymentTransaction.creditDebtSettledAt)}.` : "",
            };
        }

        return null;
    }, [debtSettled, hasDebt, paymentTransaction]);

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

    async function loadPaymentSnapshot(remoteOrderId: string, currentPaymentStatus?: string | null) {
        try {
            const payment = await getPaymentTransactionByOrderId(remoteOrderId);
            setPaymentTransaction(payment);

            const nextStatus = payment.status === "APPROVED" ? "PAID" : payment.status === "REJECTED" ? "REJECTED" : null;

            if (nextStatus && nextStatus !== currentPaymentStatus) {
                await updateLocalOrderPaymentStatusByRemoteId({
                    remoteOrderId,
                    paymentStatus: nextStatus,
                });
                await hydrateLocalState(remoteOrderId);
            }
        } catch {
            setPaymentTransaction(null);
        }
    }

    async function loadOrderDetails() {
        if (!orderId) {
            setMessage("Pedido inválido.");
            setLoading(false);
            return;
        }

        try {
            if (!hasLoadedOnce) {
                setLoading(true);
            }

            setMessage("");
            const localOrder = await hydrateLocalState(orderId);

            if (!network.canAttemptRemote || !localOrder?.remote_order_id) {
                return;
            }

            try {
                const remoteOrder = await getOrderById(localOrder.remote_order_id);

                await saveRemoteOrder(remoteOrder);
                const refreshedLocalOrder = await hydrateLocalState(remoteOrder.id);

                if (refreshedLocalOrder?.remote_order_id) {
                    await loadPaymentSnapshot(refreshedLocalOrder.remote_order_id, refreshedLocalOrder.payment_status);
                }
            } catch (err) {
                setMessage(err instanceof Error ? err.message : "Não foi possível atualizar este pedido com o backend.");
            }
        } finally {
            if (!hasLoadedOnce) {
                setHasLoadedOnce(true);
            }
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

    async function handleSettleDebt() {
        if (!order?.remote_order_id) {
            setMessage("Este pedido ainda não possui um identificador remoto para quitar a dívida.");
            return;
        }

        try {
            setDebtSettling(true);
            setMessage("");
            const updatedTransaction = await settlePaymentDebt(order.remote_order_id);
            setPaymentTransaction(updatedTransaction);
            setMessage("Crédito devedor quitado com sucesso.");
            await loadOrderDetails();
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Não foi possível quitar o crédito devedor.");
        } finally {
            setDebtSettling(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            void loadOrderDetails();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [orderId, network.canAttemptRemote]),
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

                    <PageHeader eyebrow="Recibo" title={formatStoreLabel(order.store_id)} description="Resumo da compra com itens, pagamento e andamento da sincronização." />

                    <View className="overflow-hidden rounded-[32px] border border-border bg-card">
                        <View className="border-b border-dashed border-border/80 px-5 py-5">
                            <View className="flex-row items-start justify-between gap-4">
                                <View className="flex-1">
                                    <Text className="text-xs font-black uppercase tracking-[2px] text-muted-foreground">Data da compra</Text>
                                    <Text className="mt-2 text-base font-bold text-card-foreground">{formatDateTime(order.offline_created_at ?? order.created_at)}</Text>
                                </View>

                                <View className="max-w-[44%] items-end">
                                    <Text className="text-xs font-black uppercase tracking-[2px] text-muted-foreground">Total</Text>
                                    <Text className="mt-2 text-right text-3xl font-black text-card-foreground">{formatCurrency(order.total_amount)}</Text>
                                    <Text className="mt-1 text-right text-sm text-muted-foreground">{totalItems} item(ns)</Text>
                                </View>
                            </View>
                        </View>

                        <View className="px-5 py-4">
                            <View className="flex-row flex-wrap gap-2 overflow-hidden">
                                <StatusChip label={`Pedido: ${formatOrderStatus(order.order_status, order.payment_status, order.sync_status)}`} toneClassName={orderStatusTone(order.order_status, order.payment_status, order.sync_status)} />
                                <StatusChip label={`Pagamento: ${formatPaymentStatus(order.payment_status)}`} toneClassName={paymentStatusTone(order.payment_status)} />
                                <StatusChip label={`Sync: ${formatSyncStatus(order.sync_status)}`} toneClassName={syncStatusTone(order.sync_status)} />
                            </View>
                        </View>
                    </View>

                    {message ? <Text className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{message}</Text> : null}
                    {queueMessage ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{queueMessage}</Text> : null}

                    {shouldShowDebtCallout && debtCallout ? (
                        <View className={`mt-4 rounded-[28px] border p-5 ${debtCallout.containerClassName}`}>
                            <Text className={`text-sm font-black uppercase tracking-[1px] ${debtCallout.titleClassName}`}>{debtCallout.title}</Text>
                            <Text className="mt-2 text-base font-bold text-card-foreground">{debtCallout.body}</Text>
                            {debtCallout.helper ? <Text className={`mt-2 text-sm leading-6 ${debtCallout.bodyClassName}`}>{debtCallout.helper}</Text> : null}
                        </View>
                    ) : null}

                    <Section title="Itens da compra">
                        {items.map((item) => (
                            <View key={item.id} className="rounded-[24px] border border-border bg-background p-4">
                                <View className="flex-row items-start justify-between gap-3">
                                    <View className="flex-1">
                                        <Text className="text-base font-black text-card-foreground">{item.product_name}</Text>
                                        <Text className="mt-1 text-sm text-muted-foreground">
                                            {item.quantity} x {formatCurrency(item.unit_price)}
                                        </Text>
                                    </View>
                                    <Text className="text-base font-black text-card-foreground">{formatCurrency(item.total_price)}</Text>
                                </View>
                            </View>
                        ))}
                    </Section>

                    <Section title="Resumo do pagamento">
                        <DetailRow label="Pagamento" value={formatPaymentStatus(order.payment_status)} />
                        <DetailRow label="Situação do pedido" value={formatOrderStatus(order.order_status, order.payment_status, order.sync_status)} />
                        <DetailRow label="Sincronização" value={formatSyncStatus(order.sync_status)} />
                        <DetailRow label="Crédito devedor" value={paymentTransaction ? formatCreditDebtStatus(paymentTransaction.creditDebtAmount, paymentTransaction.creditDebtSettledAt) : "-"} />
                        <DetailRow label="Valor devedor" value={paymentTransaction ? formatCurrency(paymentTransaction.creditDebtAmount ?? 0) : "-"} />

                        {order.remote_order_id ? (
                            <Pressable onPress={handleViewPayment} disabled={paymentLoading} className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary disabled:opacity-60">
                                {paymentLoading ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="card-outline" size={18} color="#ffffff" />}
                                <Text className="text-sm font-black uppercase tracking-[1px] text-white">Ver comprovante do pagamento</Text>
                            </Pressable>
                        ) : null}

                        {isCustomer && hasDebt && order.remote_order_id ? (
                            <Pressable onPress={handleSettleDebt} disabled={debtSettling} className="mt-3 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-red-600 disabled:opacity-60">
                                {debtSettling ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="warning-outline" size={18} color="#ffffff" />}
                                <Text className="text-sm font-black uppercase tracking-[1px] text-white">Quitar crédito devedor</Text>
                            </Pressable>
                        ) : null}
                    </Section>

                    <Section title="Pessoas e operação">
                        <DetailRow label="Loja" value={formatStoreLabel(order.store_id)} />
                        <DetailRow label="Criado em" value={formatDateTime(order.created_at)} subtle />
                        <DetailRow label="Registrado offline em" value={formatDateTime(order.offline_created_at)} subtle />
                        <DetailRow label={formatSyncTimestampLabel(order.sync_status, order.server_synced_at ?? order.synced_at)} value={formatDateTime(order.server_synced_at ?? order.synced_at)} subtle />
                    </Section>
                </View>
            </ScrollView>

            <PaymentTransactionModal visible={paymentModalVisible} transaction={paymentTransaction} onClose={() => setPaymentModalVisible(false)} />
        </View>
    );
}

function Section({ title, children, subtle = false }: { title: string; children: ReactNode; subtle?: boolean }) {
    return (
        <View className={`mt-5 rounded-[28px] border ${subtle ? "border-border/70" : "border-border"} bg-card p-5`}>
            <Text className={`mb-4 ${subtle ? "text-base" : "text-lg"} font-black text-card-foreground`}>{title}</Text>
            <View className="gap-3">{children}</View>
        </View>
    );
}
