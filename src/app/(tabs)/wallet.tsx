import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { WalletBalanceCard } from "@/src/domains/payment/components/wallet-balance-card";
import { useWallet } from "@/src/domains/payment/hooks/use-wallet";

function money(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function walletTypeLabel(value: string) {
    if (value === "DEPOSIT") return "Deposito";
    if (value === "PAYMENT_DEBIT") return "Debito de pagamento";
    if (value === "PAYMENT_CREDIT") return "Credito de pagamento";
    return value;
}

function paymentStatusLabel(value: string) {
    if (value === "APPROVED") return "PAID";
    if (value === "REJECTED") return "REJECTED";
    return "PENDING";
}

function paymentStatusClass(value: string) {
    if (value === "APPROVED") return "bg-primary/10 text-primary";
    if (value === "REJECTED") return "bg-red-500/10 text-red-500";
    return "bg-yellow-500/10 text-yellow-600";
}

export default function WalletScreen() {
    const { colorScheme } = useColorScheme();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const { user } = useAuth();
    const { wallet, walletTransactions, paymentTransactions, loading, refreshing, depositing, error, loadWalletData, refreshWalletData, depositFake } = useWallet();

    const isSeller = user?.role === "SELLER";

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
                <Text className="mt-2 text-4xl font-black tracking-[-1px] text-foreground">{isSeller ? "Recebimentos da loja" : "Saldo e extrato"}</Text>
                <Text className="mt-3 text-base leading-7 text-muted-foreground">{isSeller ? "Acompanhe o saldo disponivel da loja e os creditos pendentes de vendas processadas." : "Adicione saldo fake para testar o fluxo e acompanhe cada movimentacao financeira."}</Text>

                <View className="mt-6">
                    <WalletBalanceCard wallet={wallet} isSeller={!!isSeller} />
                </View>

                {!isSeller ? (
                    <Pressable onPress={() => depositFake({ amount: 100, description: "Fake wallet deposit" })} disabled={depositing} className="mt-4 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary disabled:opacity-60">
                        {depositing ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="add-circle-outline" size={18} color="#ffffff" />}
                        <Text className="text-sm font-black uppercase tracking-[1px] text-primary-foreground">Adicionar R$ 100</Text>
                    </Pressable>
                ) : (
                    <View className="mt-4 rounded-2xl bg-muted px-4 py-3">
                        <Text className="text-sm leading-6 text-muted-foreground">Deposito fake fica disponivel apenas para clientes. Para vendedores, a carteira da loja recebe creditos pendentes apos o processamento do pagamento.</Text>
                    </View>
                )}

                {error ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</Text> : null}

                <View className="mt-6 rounded-3xl border border-border bg-card p-5">
                    <Text className="text-lg font-black text-card-foreground">Extrato da carteira</Text>
                    <Text className="mt-1 text-sm text-muted-foreground">Depositos, debitos e creditos vinculados a sua carteira.</Text>

                    <View className="mt-4 gap-3">
                        {walletTransactions.length > 0 ? (
                            walletTransactions.map((transaction) => (
                                <View key={transaction.id} className="rounded-2xl border border-border bg-background p-4">
                                    <View className="flex-row items-start justify-between gap-3">
                                        <View className="flex-1">
                                            <Text className="text-sm font-black text-card-foreground">{walletTypeLabel(transaction.type)}</Text>
                                            <Text className="mt-1 text-sm text-muted-foreground">{transaction.description || transaction.referenceId}</Text>
                                            <Text className="mt-2 text-xs text-muted-foreground">{new Date(transaction.createdAt).toLocaleString("pt-BR")}</Text>
                                        </View>

                                        <Text className="text-sm font-black text-card-foreground">{money(transaction.amount)}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View className="rounded-2xl border border-dashed border-border bg-background p-5">
                                <Text className="text-center text-base font-bold text-card-foreground">Nenhuma movimentacao ainda</Text>
                                <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Assim que houver depositos ou pagamentos processados, o extrato aparecera aqui.</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View className="mt-6 rounded-3xl border border-border bg-card p-5">
                    <Text className="text-lg font-black text-card-foreground">Transacoes de pagamento</Text>
                    <Text className="mt-1 text-sm text-muted-foreground">Historico do payment-service para pedidos processados.</Text>

                    <View className="mt-4 gap-3">
                        {paymentTransactions.length > 0 ? (
                            paymentTransactions.map((transaction) => (
                                <View key={transaction.id} className="rounded-2xl border border-border bg-background p-4">
                                    <View className="flex-row items-start justify-between gap-3">
                                        <View className="flex-1">
                                            <Text className="text-sm font-black text-card-foreground">Pedido #{transaction.localOrderId?.slice(0, 8) ?? transaction.orderId.slice(0, 8)}</Text>
                                            <Text className="mt-1 text-sm text-muted-foreground">{new Date(transaction.createdAt).toLocaleString("pt-BR")}</Text>
                                        </View>

                                        <Text className="text-sm font-black text-card-foreground">{money(transaction.amount)}</Text>
                                    </View>

                                    <View className="mt-3 flex-row flex-wrap gap-2">
                                        <Text className={`rounded-xl px-3 py-2 text-xs font-bold ${paymentStatusClass(transaction.status)}`}>{paymentStatusLabel(transaction.status)}</Text>
                                        {transaction.failureReason ? <Text className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500">{transaction.failureReason}</Text> : null}
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View className="rounded-2xl border border-dashed border-border bg-background p-5">
                                <Text className="text-center text-base font-bold text-card-foreground">Nenhum pagamento processado</Text>
                                <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Quando pedidos forem processados pelo servico de pagamento, eles aparecerao aqui.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
