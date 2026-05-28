import { PageHeader } from "@/src/components/ui/page-header";

import { ConnectionStatusCard } from "./connection-status-card";
import { OfflineSessionCard } from "./offline-session-card";
import { OfflineStatusCard } from "./offline-status-card";
import { QuickAction } from "./quick-action";

import { Text, View } from "react-native";

type CustomerHomeProps = {
    user: any;
    networkInfo: any;
    offlineSession: any;
};

export function CustomerHome({ user, networkInfo, offlineSession }: CustomerHomeProps) {
    return (
        <>
            <PageHeader eyebrow="Compras" title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`} description="Prepare pedidos, gere QR Code e continue comprando mesmo com conexão instável." />

            <View className="mb-6 flex-row gap-3">
                <ConnectionStatusCard networkInfo={networkInfo} />

                <OfflineStatusCard title="Compra offline" offlineEnabled={offlineSession.offlineEnabled} offlineExpiresAt={offlineSession.formattedExpiresAt} />
            </View>

            <OfflineSessionCard
                title="Sessão de compra"
                description="Prepare uma sessão temporária para montar pedidos e gerar QR Code mesmo sem internet."
                activateLabel="Preparar offline"
                renewLabel="Renovar sessão"
                loading={offlineSession.loading}
                offlineEnabled={offlineSession.offlineEnabled}
                isConnected={networkInfo.isConnected}
                statusMessage={offlineSession.statusMessage}
                onActivate={offlineSession.handleActivateOffline}
                onCheck={offlineSession.checkOfflineStatus}
            />

            <View className="rounded-3xl border border-border bg-card p-5">
                <Text className="mb-4 text-lg font-black text-card-foreground">Ações do cliente</Text>

                <View className="gap-3">
                    <QuickAction icon="cube-outline" title="Ver catálogo" description="Acessar produtos disponíveis." />

                    <QuickAction icon="qr-code-outline" title="Gerar QR do pedido" description="Enviar pedido ao vendedor." />

                    <QuickAction icon="card-outline" title="Pagamentos" description="Ver pagamentos pendentes." />
                </View>
            </View>
        </>
    );
}
