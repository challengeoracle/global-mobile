import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { Alert, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { AccountCard } from "@/src/shared/components/settings/account-card";
import { SettingsItem } from "@/src/shared/components/settings/settings-item";
import { SettingsDivider, SettingsSection } from "@/src/shared/components/settings/settings-section";
import { SyncStatusCard } from "@/src/shared/components/sync/sync-status-card";
import { PageHeader } from "@/src/shared/components/ui/page-header";
import { useSyncStatus } from "@/src/shared/hooks/use-sync-status";

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const syncStatus = useSyncStatus("all");

    const isDark = colorScheme === "dark";
    const isSeller = user?.role === "SELLER";

    function handleLogout() {
        Alert.alert("Sair da conta", "Fazer logout neste aparelho descarta todas as alterações locais e pedidos pendentes que ainda não foram sincronizados. Deseja continuar?", [
            {
                text: "Cancelar",
                style: "cancel",
            },
            {
                text: "Descartar e sair",
                style: "destructive",
                onPress: () => {
                    logout();
                },
            },
        ]);
    }

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-10 pt-14">
                <PageHeader eyebrow="Configurações" title="Preferências" />

                <AccountCard name={user?.name} email={user?.email} role={user?.role} storeName={user?.storeName} />

                <View className="mb-6">
                    <SyncStatusCard
                        variant="detailed"
                        title={isSeller ? "Estado local e sincronização" : "Estado local"}
                        onlineLabel={syncStatus.network.isConnected ? "Online" : "Offline"}
                        onlineColor={syncStatus.network.color}
                        isConnected={syncStatus.network.isConnected}
                        isSyncing={syncStatus.isSyncing}
                        syncingNow={syncStatus.syncingNow}
                        pendingCount={syncStatus.pendingCount}
                        pendingCatalogChanges={syncStatus.pendingCatalogChanges}
                        pendingOrders={syncStatus.pendingOrders}
                        rejectedCount={syncStatus.rejectedCount}
                        pendingLabel="registro(s) aguardando envio"
                        lastSyncAt={syncStatus.lastSyncAt}
                        lastError={syncStatus.scopedLastError}
                    />
                </View>

                <SettingsSection>
                    <SettingsItem icon={isDark ? "moon" : "sunny"} title="Tema" description={isDark ? "Escuro" : "Claro"} onPress={toggleColorScheme} />

                    <SettingsDivider />

                    <SettingsItem icon="list-outline" title="Operação" description="Ver como o fluxo offline-first funciona no OffPay" onPress={() => router.push("/(tabs)/explore")} />
                </SettingsSection>

                <SettingsSection>
                    <SettingsItem icon="log-out-outline" title="Sair da conta" description="Descartar dados locais não sincronizados e encerrar sessão" iconColor="#ef4444" danger onPress={handleLogout} />
                </SettingsSection>

                <Text className="mt-2 text-center text-xs leading-5 text-muted-foreground">OffPay mantém sua operação preparada para vender e pagar mesmo com conexão instável.</Text>
            </View>
        </ScrollView>
    );
}
