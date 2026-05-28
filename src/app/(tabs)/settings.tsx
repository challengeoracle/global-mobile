import { useColorScheme } from "nativewind";
import { ScrollView, Text, View } from "react-native";

import { AccountCard } from "@/src/components/settings/account-card";
import { SettingsItem } from "@/src/components/settings/settings-item";
import { SettingsDivider, SettingsSection } from "@/src/components/settings/settings-section";

import { PageHeader } from "@/src/components/ui/page-header";
import { useAuth } from "@/src/contexts/auth-context";

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const { colorScheme, toggleColorScheme } = useColorScheme();

    const isDark = colorScheme === "dark";

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-10 pt-14">
                <PageHeader eyebrow="Configurações" title="Preferências" />

                <AccountCard name={user?.name} email={user?.email} role={user?.role} storeName={user?.storeName} deviceId={user?.deviceId} />

                <SettingsSection>
                    <SettingsItem icon={isDark ? "moon" : "sunny"} title="Tema" description={isDark ? "Escuro" : "Claro"} onPress={toggleColorScheme} />

                    <SettingsDivider />

                    <SettingsItem icon="cloud-upload-outline" title="Envio de vendas" description="Sincronização dos próximos módulos" rightText="0" />

                    <SettingsDivider />

                    <SettingsItem icon="shield-checkmark-outline" title="Sessão offline" description={user?.role === "SELLER" ? "Autorização do terminal" : "Autorização do cliente"} />
                </SettingsSection>

                <SettingsSection>
                    <SettingsItem icon="log-out-outline" title="Sair da conta" description="Encerrar sessão neste aparelho" iconColor="#ef4444" danger onPress={logout} />
                </SettingsSection>

                <Text className="mt-2 text-center text-xs leading-5 text-muted-foreground">OffPay mantém sua operação preparada para vender e pagar mesmo com conexão instável.</Text>
            </View>
        </ScrollView>
    );
}
