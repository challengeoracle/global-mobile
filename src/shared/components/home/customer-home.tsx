import { router } from "expo-router";
import { Text, View } from "react-native";

import { PageHeader } from "@/src/shared/components/ui/page-header";

import { QuickAction } from "./quick-action";

type CustomerHomeProps = {
    user: any;
};

export function CustomerHome({ user }: CustomerHomeProps) {
    return (
        <>
            <PageHeader eyebrow="Início" title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`} description="Acesse rápido o que você mais usa no OffPay." />

            <View className="flex-row flex-wrap gap-3">
                <QuickAction compact icon="cube-outline" title="Catálogo" description="Importar loja e comprar." onPress={() => router.push("/(tabs)/catalog")} />
                <QuickAction compact icon="receipt-outline" title="Pedidos" description="Ver andamento e pagamentos." onPress={() => router.push("/(tabs)/orders")} />
                <QuickAction compact icon="sparkles-outline" title="Insights" description="Consultar seus indicadores." onPress={() => router.push("/insights" as any)} />
                <QuickAction compact icon="wallet-outline" title="Carteira" description="Consultar saldo e extrato." onPress={() => router.push("/(tabs)/wallet")} />
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-card px-5 py-4">
                <Text className="text-sm leading-6 text-muted-foreground">O app segue funcionando no modo offline-first. Os detalhes de conexão e sincronização ficam em Configurações.</Text>
            </View>
        </>
    );
}
