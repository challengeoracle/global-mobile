import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { paymentStatusTone } from "@/src/domains/order/utils/order-display";
import { WalletBalanceCard } from "@/src/domains/payment/components/wallet-balance-card";
import { useWallet } from "@/src/domains/payment/hooks/use-wallet";
import { StatusChip } from "@/src/shared/components/ui/status-chip";
import { formatCurrency, formatDateTime, formatPaymentStatus, formatTransactionType } from "@/src/shared/lib/formatters";

export default function WalletScreen() {
    const { colorScheme } = useColorScheme();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const { user } = useAuth();
    const { storeWallet, personalWallet, storeWalletTransactions, personalWalletTransactions, paymentTransactions, loading, refreshing, depositing, settling, error, loadWalletData, refreshWalletData, depositFake, settlePendingBalance } = useWallet();

    const isSeller = user?.role === "SELLER";
    const canSettleStoreWallet = isSeller && (storeWallet?.pendingBalance ?? 0) > 0;

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

                <Pressable onPress={() => depositFake({ amount: 100, description: "Dep\u00f3sito fake na carteira" })} disabled={depositing} className="mt-4 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary disabled:opacity-60">
                    {depositing ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="add-circle-outline" size={18} color="#ffffff" />}
                    <Text className="text-sm font-black uppercase tracking-[1px] text-primary-foreground">Adicionar R$ 100</Text>
                </Pressable>

                {error ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</Text> : null}

                <WalletTransactionsSection
                    title={isSeller ? "Extrato da carteira pessoal" : "Extrato da carteira"}
                    description={isSeller ? "Depósitos e pagamentos vinculados à sua carteira pessoal." : "Depósitos e pagamentos vinculados à sua carteira."}
                    transactions={personalWalletTransactions}
                />

                {isSeller ? <WalletTransactionsSection title="Extrato da loja" description="Créditos de venda e liberações de saldo da carteira da loja." transactions={storeWalletTransactions} /> : null}

                <View className="mt-6 rounded-3xl border border-border bg-card p-5">
                    <Text className="text-lg font-black text-card-foreground">Transações de pagamento</Text>
                    <Text className="mt-1 text-sm text-muted-foreground">Histórico do serviço de pagamento para pedidos processados.</Text>

                    <View className="mt-4 gap-3">
                        {paymentTransactions.length > 0 ? (
                            paymentTransactions.map((transaction) => (
                                <View key={transaction.id} className="rounded-2xl border border-border bg-background p-4">
                                    <View className="flex-row items-start justify-between gap-3">
                                        <View className="flex-1">
                                            <Text className="text-sm font-black text-card-foreground">Pedido #{transaction.localOrderId?.slice(0, 8) ?? transaction.orderId.slice(0, 8)}</Text>
                                            <Text className="mt-1 text-sm text-muted-foreground">{formatDateTime(transaction.createdAt)}</Text>
                                        </View>

                                        <Text className="text-sm font-black text-card-foreground">{formatCurrency(transaction.amount)}</Text>
                                    </View>

                                    <View className="mt-3 flex-row flex-wrap gap-2 overflow-hidden">
                                        <StatusChip label={formatPaymentStatus(transaction.status)} toneClassName={paymentStatusTone(transaction.status)} compact />
                                        {transaction.failureReason ? <Text className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500">{transaction.failureReason}</Text> : null}
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View className="rounded-2xl border border-dashed border-border bg-background p-5">
                                <Text className="text-center text-base font-bold text-card-foreground">Nenhum pagamento processado</Text>
                                <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Quando pedidos forem processados pelo serviço de pagamento, eles aparecerão aqui.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

function WalletTransactionsSection({ title, description, transactions }: { title: string; description: string; transactions: { id: string; type: string; description: string; referenceId: string; createdAt: string; amount: number }[] }) {
    return (
        <View className="mt-6 rounded-3xl border border-border bg-card p-5">
            <Text className="text-lg font-black text-card-foreground">{title}</Text>
            <Text className="mt-1 text-sm text-muted-foreground">{description}</Text>

            <View className="mt-4 gap-3">
                {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                        <View key={transaction.id} className="rounded-2xl border border-border bg-background p-4">
                            <View className="flex-row items-start justify-between gap-3">
                                <View className="flex-1">
                                    <Text className="text-sm font-black text-card-foreground">{formatTransactionType(transaction.type)}</Text>
                                    <Text className="mt-1 text-sm text-muted-foreground">{transaction.description || transaction.referenceId}</Text>
                                    <Text className="mt-2 text-xs text-muted-foreground">{formatDateTime(transaction.createdAt)}</Text>
                                </View>

                                <Text className="text-sm font-black text-card-foreground">{formatCurrency(transaction.amount)}</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <View className="rounded-2xl border border-dashed border-border bg-background p-5">
                        <Text className="text-center text-base font-bold text-card-foreground">Nenhuma movimentação ainda</Text>
                        <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Assim que houver movimentações nesta carteira, elas aparecerão aqui.</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
