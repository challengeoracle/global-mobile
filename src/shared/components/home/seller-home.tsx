import { router } from "expo-router";
import { Text, View } from "react-native";

import { PageHeader } from "@/src/shared/components/ui/page-header";

import { ConnectionStatusCard } from "./connection-status-card";
import { OfflineStatusCard } from "./offline-status-card";
import { QuickAction } from "./quick-action";

type SellerHomeProps = {
    user: any;
    networkInfo: any;
};

export function SellerHome({ user, networkInfo }: SellerHomeProps) {
    return (
        <>
            <PageHeader eyebrow="Terminal" title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`} description="Seu terminal salva local primeiro e sincroniza quando houver conexão." />

            <View className="mb-6 flex-row gap-3">
                <ConnectionStatusCard networkInfo={networkInfo} />

                <OfflineStatusCard title="Operação local" />
            </View>

            <View className="rounded-3xl border border-border bg-card p-5">
                <Text className="mb-4 text-lg font-black text-card-foreground">Ações do vendedor</Text>

                <View className="gap-3">
                    <QuickAction icon="cart-outline" title="Registrar venda" description="Criar venda no terminal." onPress={() => router.push("/(tabs)/catalog")} />

                    <QuickAction icon="bag-handle-outline" title="Comprar em outra loja" description="Escanear catálogo externo e montar um pedido." onPress={() => router.push("/seller-buy")} />

                    <QuickAction icon="wallet-outline" title="Carteira" description="Ver saldo e recebimentos." onPress={() => router.push("/(tabs)/wallet")} />
                </View>
            </View>
        </>
    );
}
