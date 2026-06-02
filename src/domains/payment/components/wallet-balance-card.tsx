import { Text, View } from "react-native";

import { WalletResponse } from "@/src/domains/payment/types/payment";
import { formatCurrency } from "@/src/shared/lib/formatters";

type WalletBalanceCardProps = {
    wallet: WalletResponse | null;
    isSeller: boolean;
    title?: string;
    description?: string;
};

export function WalletBalanceCard({ wallet, isSeller, title, description }: WalletBalanceCardProps) {
    const hasNegativeBalance = (wallet?.balance ?? 0) < 0;

    return (
        <View className="rounded-3xl border border-border bg-card p-5">
            <Text className="text-sm font-bold text-muted-foreground">{title ?? (isSeller ? "Carteira da loja" : "Sua carteira")}</Text>
            <Text className={`mt-2 text-3xl font-black ${hasNegativeBalance ? "text-red-500" : "text-card-foreground"}`}>{formatCurrency(wallet?.balance ?? 0)}</Text>
            <Text className="mt-2 text-sm leading-6 text-muted-foreground">{description ?? "Saldo disponível para usar agora."}</Text>

            {hasNegativeBalance ? (
                <View className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                    <Text className="text-sm font-black text-red-600">Atenção: há pedidos concluídos com valor em aberto</Text>
                    <Text className="mt-1 text-sm leading-6 text-red-600">
                        Sua carteira ficou negativa por causa de crédito devedor em compras já aprovadas. Adicione saldo e quite os pedidos pendentes para regularizar sua conta.
                    </Text>
                </View>
            ) : null}

            <View className="mt-4 rounded-2xl bg-muted p-4">
                <Text className="text-xs font-bold uppercase tracking-[1px] text-muted-foreground">Saldo pendente</Text>
                <Text className="mt-1 text-xl font-black text-card-foreground">{formatCurrency(wallet?.pendingBalance ?? 0)}</Text>
            </View>
        </View>
    );
}
