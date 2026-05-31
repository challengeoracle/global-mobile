import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { paymentStatusTone } from "@/src/domains/order/utils/order-display";
import { WalletBalanceCard } from "@/src/domains/payment/components/wallet-balance-card";
import { useWallet } from "@/src/domains/payment/hooks/use-wallet";
import { PaymentTransactionResponse, WalletTransactionResponse } from "@/src/domains/payment/types/payment";
import { StatusChip } from "@/src/shared/components/ui/status-chip";
import { formatCurrency, formatDateTime, formatPaymentStatus, formatTransactionType } from "@/src/shared/lib/formatters";

type WalletMovement = {
    id: string;
    title: string;
    description: string;
    amount: number;
    createdAt: string;
    badge?: string;
    paymentStatus?: string;
    failureReason?: string | null;
};

export default function WalletScreen() {
    const { colorScheme } = useColorScheme();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const { user } = useAuth();
    const { storeWallet, personalWallet, storeWalletTransactions, personalWalletTransactions, paymentTransactions, loading, refreshing, depositing, settling, error, loadWalletData, refreshWalletData, depositFake, settlePendingBalance } = useWallet();

    const isSeller = user?.role === "SELLER";
    const canSettleStoreWallet = isSeller && (storeWallet?.pendingBalance ?? 0) > 0;

    const movements = useMemo(
        () => buildWalletMovements({
            isSeller,
            personalWalletTransactions,
            storeWalletTransactions,
            paymentTransactions,
        }),
        [isSeller, paymentTransactions, personalWalletTransactions, storeWalletTransactions],
    );

    useFocusEffect(
        useCallback(() => {
            loadWalletData();
        }, [loadWalletData]),
    );

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color={iconColor} size="large" />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshWalletData} tintColor={iconColor} />}
        >
            <View className="px-6 pb-10 pt-14">
                <Text className="text-sm font-bold uppercase tracking-[3px] text-primary">Carteira</Text>
                <Text className="mt-2 text-4xl font-black tracking-[-1px] text-foreground">{isSeller ? "Carteiras e recebimentos" : "Saldo e extrato"}</Text>
                <Text className="mt-3 text-base leading-7 text-muted-foreground">{isSeller ? "Acompanhe a carteira da loja, sua carteira pessoal e libere o saldo pendente quando quiser." : "Adicione saldo fictício para testar o fluxo e acompanhe cada movimentação financeira."}</Text>

                {isSeller ? (
                    <View className="mt-6 gap-4">
                        <WalletBalanceCard wallet={storeWallet} isSeller title="Carteira da loja" description="Recebimentos da loja, incluindo saldo pendente das vendas." />

                        {canSettleStoreWallet ? (
                            <Pressable onPress={settlePendingBalance} disabled={settling} className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary disabled:opacity-60">
                                {settling ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="swap-vertical-outline" size={18} color="#ffffff" />}
                                <Text className="text-sm font-black uppercase tracking-[1px] text-primary-foreground">Liberar saldo</Text>
                            </Pressable>
                        ) : null}

                        <Text className="rounded-2xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">Mover saldo pendente para saldo disponível.</Text>

                        <WalletBalanceCard wallet={personalWallet} isSeller={false} title="Carteira pessoal" description="Use seu saldo pessoal para comprar de outras lojas no app." />
                    </View>
                ) : (
                    <View className="mt-6">
                        <WalletBalanceCard wallet={personalWallet} isSeller={false} title="Sua carteira" description="Saldo disponível para suas compras." />
                    </View>
                )}

                <Pressable onPress={() => depositFake({ amount: 100, description: "Depósito fake na carteira" })} disabled={depositing} className="mt-4 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary disabled:opacity-60">
                    {depositing ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="add-circle-outline" size={18} color="#ffffff" />}
                    <Text className="text-sm font-black uppercase tracking-[1px] text-primary-foreground">Adicionar R$ 100</Text>
                </Pressable>

                {error ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</Text> : null}

                <WalletMovementsSection isSeller={isSeller} movements={movements} />
            </View>
        </ScrollView>
    );
}

function buildWalletMovements({
    isSeller,
    personalWalletTransactions,
    storeWalletTransactions,
    paymentTransactions,
}: {
    isSeller: boolean;
    personalWalletTransactions: WalletTransactionResponse[];
    storeWalletTransactions: WalletTransactionResponse[];
    paymentTransactions: PaymentTransactionResponse[];
}) {
    const walletMovements: WalletMovement[] = [
        ...personalWalletTransactions.map((transaction) => ({
            id: `personal-${transaction.id}`,
            title: formatTransactionType(transaction.type),
            description: transaction.description || transaction.referenceId,
            amount: transaction.amount,
            createdAt: transaction.createdAt,
            badge: isSeller ? "Carteira pessoal" : "Sua carteira",
        })),
        ...storeWalletTransactions.map((transaction) => ({
            id: `store-${transaction.id}`,
            title: formatTransactionType(transaction.type),
            description: transaction.description || transaction.referenceId,
            amount: transaction.amount,
            createdAt: transaction.createdAt,
            badge: "Carteira da loja",
        })),
    ];

    const paymentMovements: WalletMovement[] = paymentTransactions.map((transaction) => ({
        id: `payment-${transaction.id}`,
        title: `Pedido #${(transaction.localOrderId || transaction.orderId).slice(0, 8)}`,
        description: transaction.failureReason || "Pagamento vinculado a um pedido processado.",
        amount: transaction.amount,
        createdAt: transaction.processedAt || transaction.createdAt,
        badge: "Pagamento",
        paymentStatus: transaction.status,
        failureReason: transaction.failureReason,
    }));

    return [...walletMovements, ...paymentMovements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function WalletMovementsSection({ isSeller, movements }: { isSeller: boolean; movements: WalletMovement[] }) {
    return (
        <View className="mt-6 rounded-3xl border border-border bg-card p-5">
            <Text className="text-lg font-black text-card-foreground">Movimentações</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
                {isSeller ? "Lista completa com depósitos, recebimentos, liberações de saldo e pagamentos vinculados aos pedidos." : "Lista completa com depósitos, débitos da carteira e pagamentos vinculados aos pedidos."}
            </Text>

            <View className="mt-4 gap-3">
                {movements.length > 0 ? (
                    movements.map((movement) => (
                        <View key={movement.id} className="rounded-2xl border border-border bg-background p-4">
                            <View className="flex-row items-start justify-between gap-3">
                                <View className="flex-1">
                                    <View className="flex-row flex-wrap items-center gap-2">
                                        <Text className="text-sm font-black text-card-foreground">{movement.title}</Text>
                                        {movement.badge ? <Text className="rounded-xl bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">{movement.badge}</Text> : null}
                                    </View>
                                    <Text className="mt-1 text-sm text-muted-foreground">{movement.description}</Text>
                                    <Text className="mt-2 text-xs text-muted-foreground">{formatDateTime(movement.createdAt)}</Text>
                                </View>

                                <Text className="text-sm font-black text-card-foreground">{formatCurrency(movement.amount)}</Text>
                            </View>

                            {movement.paymentStatus ? (
                                <View className="mt-3 flex-row flex-wrap gap-2 overflow-hidden">
                                    <StatusChip label={formatPaymentStatus(movement.paymentStatus)} toneClassName={paymentStatusTone(movement.paymentStatus)} compact />
                                    {movement.failureReason ? <Text className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500">{movement.failureReason}</Text> : null}
                                </View>
                            ) : null}
                        </View>
                    ))
                ) : (
                    <View className="rounded-2xl border border-dashed border-border bg-background p-5">
                        <Text className="text-center text-base font-bold text-card-foreground">Nenhuma movimentação ainda</Text>
                        <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Assim que houver saldo entrando, saindo ou pagamentos processados, eles aparecerão aqui.</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
