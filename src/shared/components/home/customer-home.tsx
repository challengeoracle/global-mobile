import { router } from "expo-router";
import { Text, View } from "react-native";

import { PageHeader } from "@/src/shared/components/ui/page-header";

import { ConnectionStatusCard } from "./connection-status-card";
import { OfflineStatusCard } from "./offline-status-card";
import { QuickAction } from "./quick-action";

type CustomerHomeProps = {
    user: any;
    networkInfo: any;
};

export function CustomerHome({ user, networkInfo }: CustomerHomeProps) {
    return (
        <>
            <PageHeader eyebrow="Compras" title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`} description="Monte pedidos localmente e sincronize quando a conexão voltar." />

            <View className="mb-6 flex-row gap-3">
                <ConnectionStatusCard networkInfo={networkInfo} />

                <OfflineStatusCard title="Operação local" />
            </View>

            <View className="rounded-3xl border border-border bg-card p-5">
                <Text className="mb-4 text-lg font-black text-card-foreground">Ações do cliente</Text>

                <View className="gap-3">
                    <QuickAction icon="cube-outline" title="Ver catálogo" description="Importar loja e montar pedido." onPress={() => router.push("/(tabs)/catalog")} />

                    <QuickAction icon="receipt-outline" title="Meus pedidos" description="Acompanhar pagamentos e sincronização." onPress={() => router.push("/(tabs)/orders")} />

                    <QuickAction icon="wallet-outline" title="Carteira" description="Consultar saldo e extrato financeiro." onPress={() => router.push("/(tabs)/wallet")} />
                </View>
            </View>
        </>
    );
}
