import { router } from "expo-router";
import { Text, View } from "react-native";

import { PageHeader } from "@/src/shared/components/ui/page-header";

import { QuickAction } from "./quick-action";

type SellerHomeProps = {
    user: any;
};

export function SellerHome({ user }: SellerHomeProps) {
    return (
        <>
            <PageHeader eyebrow="Início" title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`} description="Acesse rápido o que você mais usa no OffPay." />

            <View className="flex-row flex-wrap gap-3">
                <QuickAction compact icon="cart-outline" title="Registrar venda" description="Abrir catálogo da loja." onPress={() => router.push("/(tabs)/catalog")} />
                <QuickAction compact icon="bag-handle-outline" title="Comprar" description="Escanear catálogo externo." onPress={() => router.push("/seller-buy")} />
                <QuickAction compact icon="receipt-outline" title="Pedidos" description="Acompanhar confirmações." onPress={() => router.push("/(tabs)/orders")} />
                <QuickAction compact icon="wallet-outline" title="Carteira" description="Ver saldo e recebimentos." onPress={() => router.push("/(tabs)/wallet")} />
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-card px-5 py-4">
                <Text className="text-sm leading-6 text-muted-foreground">Seu terminal continua operando em modo local primeiro. Os detalhes de conexão e sincronização ficam em Configurações.</Text>
            </View>
        </>
    );
}
