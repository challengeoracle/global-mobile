import { Text, View } from "react-native";

import { QuickAction } from "./quick-action";

export function QuickActionsCard() {
    return (
        <View className="rounded-3xl border border-border bg-card p-5">
            <Text className="mb-4 text-lg font-black text-card-foreground">Próximos módulos</Text>

            <View className="gap-3">
                <QuickAction icon="cube-outline" title="Catálogo" description="Produtos e preços offline." />

                <QuickAction icon="qr-code-outline" title="QR Code" description="Pedidos e pagamentos." />

                <QuickAction icon="swap-horizontal-outline" title="Sincronização" description="Envio seguro de lotes." />
            </View>
        </View>
    );
}
