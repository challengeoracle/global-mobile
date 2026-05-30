import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { updateSellerDevice } from "@/src/domains/auth/services/auth-service";
import { AccountCard } from "@/src/shared/components/settings/account-card";
import { SettingsItem } from "@/src/shared/components/settings/settings-item";
import { SettingsDivider, SettingsSection } from "@/src/shared/components/settings/settings-section";
import { SyncStatusCard } from "@/src/shared/components/sync/sync-status-card";
import { PageHeader } from "@/src/shared/components/ui/page-header";
import { useSyncStatus } from "@/src/shared/hooks/use-sync-status";
import { regenerateDeviceId } from "@/src/shared/lib/secure-storage";

export default function SettingsScreen() {
    const { user, logout, refreshUser } = useAuth();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const syncStatus = useSyncStatus("all");

    const [updatingDevice, setUpdatingDevice] = useState(false);

    const isDark = colorScheme === "dark";
    const isSeller = user?.role === "SELLER";

    async function handleUpdateDevice() {
        if (!isSeller) {
            return;
        }

        Alert.alert("Atualizar dispositivo", "Este aparelho será usado como identificador local para sincronizações futuras.", [
            {
                text: "Cancelar",
                style: "cancel",
            },
            {
                text: "Atualizar",
                style: "destructive",
                onPress: async () => {
                    try {
                        setUpdatingDevice(true);

                        const newDeviceId = await regenerateDeviceId();

                        await updateSellerDevice(newDeviceId);
                        await refreshUser();

                        Alert.alert("Dispositivo atualizado", "Este aparelho agora é o identificador local da sua conta.");
                    } catch (err) {
                        Alert.alert("Erro ao atualizar", err instanceof Error ? err.message : "Não foi possível atualizar o dispositivo.");
                    } finally {
                        setUpdatingDevice(false);
                    }
                },
            },
        ]);
    }

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-10 pt-14">
                <PageHeader eyebrow="Configurações" title="Preferências" />

                <AccountCard name={user?.name} email={user?.email} role={user?.role} storeName={user?.storeName} deviceId={user?.deviceId} />

                <View className="mb-6">
                    <SyncStatusCard
                        variant="detailed"
                        title={isSeller ? "Sincronização do vendedor" : "Estado local"}
                        onlineLabel={syncStatus.network.isConnected ? "Online" : "Offline"}
                        onlineColor={syncStatus.network.color}
                        isConnected={syncStatus.network.isConnected}
                        isSyncing={syncStatus.isSyncing}
                        syncingNow={syncStatus.syncingNow}
                        pendingCount={syncStatus.pendingCount}
                        pendingCatalogChanges={syncStatus.pendingCatalogChanges}
                        pendingOrders={syncStatus.pendingOrders}
                        rejectedCount={syncStatus.rejectedCount}
                        pendingLabel="pendência(s)"
                        lastSyncAt={syncStatus.lastSyncAt}
                        lastError={syncStatus.scopedLastError}
                        deviceId={syncStatus.deviceId}
                        canSync={isSeller && syncStatus.canSync}
                        onSyncNow={async () => {
                            await syncStatus.syncNow();
                        }}
                    />
                </View>

                <SettingsSection>
                    <SettingsItem icon={isDark ? "moon" : "sunny"} title="Tema" description={isDark ? "Escuro" : "Claro"} onPress={toggleColorScheme} />

                    <SettingsDivider />

                    <SettingsItem icon="cloud-upload-outline" title="Sincronização" description="Filas locais e envio automático" />

                    <SettingsDivider />

                    <SettingsItem icon="shield-checkmark-outline" title="Operação local" description="SQLite e filas locais ativos por padrão" />

                    {isSeller ? (
                        <>
                            <SettingsDivider />

                            <SettingsItem icon="phone-portrait-outline" title="Device ID local" description={updatingDevice ? "Atualizando device..." : "Atualizar identificador local"} onPress={handleUpdateDevice} />
                        </>
                    ) : null}
                </SettingsSection>

                <SettingsSection>
                    <SettingsItem icon="log-out-outline" title="Sair da conta" description="Encerrar sessão neste aparelho" iconColor="#ef4444" danger onPress={logout} />
                </SettingsSection>

                <Text className="mt-2 text-center text-xs leading-5 text-muted-foreground">OffPay mantém sua operação preparada para vender e pagar mesmo com conexão instável.</Text>
            </View>
        </ScrollView>
    );
}
