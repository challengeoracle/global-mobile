import { PageHeader } from "@/src/components/ui/page-header";

import { ConnectionStatusCard } from "./connection-status-card";
import { OfflineSessionCard } from "./offline-session-card";
import { OfflineStatusCard } from "./offline-status-card";
import { QuickAction } from "./quick-action";

import { Text, View } from "react-native";

type SellerHomeProps = {
    user: any;
    networkInfo: any;
    offlineSession: any;
};

export function SellerHome({ user, networkInfo, offlineSession }: SellerHomeProps) {
    return (
        <>
            <PageHeader eyebrow="Terminal" title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`} description="Seu terminal está pronto para operar vendas online e offline." />

            <View className="mb-6 flex-row gap-3">
                <ConnectionStatusCard networkInfo={networkInfo} />

                <OfflineStatusCard title="Terminal offline" offlineEnabled={offlineSession.offlineEnabled} offlineExpiresAt={offlineSession.formattedExpiresAt} />
            </View>

            <OfflineSessionCard
                title="Operação offline"
                description="Gere uma autorização temporária para confirmar vendas mesmo sem internet."
                activateLabel="Ativar offline"
                renewLabel="Renovar autorização"
                loading={offlineSession.loading}
                offlineEnabled={offlineSession.offlineEnabled}
                isConnected={networkInfo.isConnected}
                statusMessage={offlineSession.statusMessage}
                onActivate={offlineSession.handleActivateOffline}
                onCheck={offlineSession.checkOfflineStatus}
            />

            <View className="rounded-3xl border border-border bg-card p-5">
                <Text className="mb-4 text-lg font-black text-card-foreground">Ações do vendedor</Text>

                <View className="gap-3">
                    <QuickAction icon="cart-outline" title="Registrar venda" description="Criar venda no terminal." />

                    <QuickAction icon="swap-horizontal-outline" title="Sincronizar vendas" description="Enviar vendas pendentes." />

                    <QuickAction icon="wallet-outline" title="Carteira" description="Ver saldo e recebimentos." />
                </View>
            </View>
        </>
    );
}
