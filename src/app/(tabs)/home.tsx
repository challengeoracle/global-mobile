import { Ionicons } from "@expo/vector-icons";
import NetInfo, { NetInfoStateType } from "@react-native-community/netinfo";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const COLOR_BLUE = "#2563eb";
const COLOR_RED = "#dc2626";
const COLOR_PURPLE = "#7c3aed";
const COLOR_DEFAULT = "#60a5fa";
const COLOR_INACTIVE = "#a1a1aa";

type ConnectionStatus = {
    isConnected: boolean;
    type: NetInfoStateType | "unknown";
};

export default function HomeScreen() {
    const [offlineModeEnabled, setOfflineModeEnabled] = useState(false);
    const [showOfflineHelp, setShowOfflineHelp] = useState(false);

    const [connection, setConnection] = useState<ConnectionStatus>({
        isConnected: false,
        type: "unknown",
    });

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setConnection({
                isConnected: Boolean(state.isConnected && state.isInternetReachable),
                type: state.type,
            });
        });

        return unsubscribe;
    }, []);

    const connectionInfo = useMemo(() => {
        if (!connection.isConnected) {
            return {
                label: "Sem Conexão",
                description: "Não é possível solicitar chave.",
                icon: "cloud-offline-outline" as const,
                color: COLOR_RED,
            };
        }

        if (connection.type === "wifi") {
            return {
                label: "WiFi",
                description: "Pronto para autorizar.",
                icon: "cloud-done-outline" as const,
                color: COLOR_BLUE,
            };
        }

        if (connection.type === "cellular") {
            return {
                label: "Rede Móvel",
                description: "Pronto para autorizar.",
                icon: "phone-portrait-outline" as const,
                color: COLOR_PURPLE,
            };
        }

        return {
            label: "Online",
            description: "Conexão disponível.",
            icon: "radio-outline" as const,
            color: COLOR_BLUE,
        };
    }, [connection]);

    const canPrepareOfflineSession = connection.isConnected;
    const sessionColor = offlineModeEnabled ? COLOR_BLUE : COLOR_RED;

    function handleOfflineModePress() {
        if (!offlineModeEnabled && !canPrepareOfflineSession) return;

        setOfflineModeEnabled((current) => !current);
    }

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="px-6 pb-10 pt-14">
                <View className="mb-8">
                    <Text className="mb-2 text-sm font-semibold uppercase tracking-[3px] text-primary">Terminal Seguro</Text>

                    <Text className="mb-3 text-4xl font-bold text-foreground">Olá, Célia</Text>

                    <Text className="text-base leading-7 text-muted-foreground">Autorize seu dispositivo para registrar intenções de venda com segurança, mesmo sem internet.</Text>
                </View>

                <View className="mb-6 flex-row gap-3">
                    <StatusCard icon={connectionInfo.icon} label="Conexão" value={connectionInfo.label} description={connectionInfo.description} iconColor={connectionInfo.color} />

                    <StatusCard icon={offlineModeEnabled ? "shield-checkmark-outline" : "shield-outline"} label="Sessão Offline" value={offlineModeEnabled ? "Autorizada" : "Inativa"} description={offlineModeEnabled ? "Vendas protegidas." : "Ative online."} iconColor={sessionColor} />
                </View>

                <View className="mb-6 rounded-3xl border border-border bg-card p-5">
                    <View className="mb-5">
                        <Text className="text-lg font-bold text-card-foreground">Sessão Offline Segura</Text>

                        <Text className="mt-2 text-sm leading-6 text-muted-foreground">O servidor gera uma chave temporária online. Depois, o app assina e salva suas vendas até a internet voltar para liquidação.</Text>
                    </View>

                    <Pressable disabled={!offlineModeEnabled && !canPrepareOfflineSession} onPress={handleOfflineModePress} className={`rounded-2xl px-5 py-4 active:opacity-80 ${!offlineModeEnabled && !canPrepareOfflineSession ? "bg-muted opacity-60" : "bg-primary"}`}>
                        <Text className={`text-center text-base font-bold ${!offlineModeEnabled && !canPrepareOfflineSession ? "text-muted-foreground" : "text-primary-foreground"}`}>{offlineModeEnabled ? "Encerrar sessão offline" : canPrepareOfflineSession ? "Autorizar sessão offline" : "Conecte-se para autorizar"}</Text>
                    </Pressable>

                    <Pressable onPress={() => setShowOfflineHelp((current) => !current)} className="mt-4 flex-row items-center justify-center gap-2 active:opacity-80">
                        <Text className="text-sm font-semibold text-primary">Como funciona a auditoria?</Text>

                        <Ionicons name={showOfflineHelp ? "chevron-up" : "chevron-down"} size={16} color={COLOR_DEFAULT} />
                    </Pressable>

                    {showOfflineHelp && (
                        <View className="mt-4 rounded-2xl border border-border bg-background p-4">
                            <View className="gap-3">
                                <HelpItem icon="key-outline" title="1. Autorização" description="O servidor libera uma permissão temporária exclusiva para este aparelho." />

                                <HelpItem icon="document-lock-outline" title="2. Assinatura Local" description="A venda é registrada como pendente e protegida por criptografia." />

                                <HelpItem icon="checkmark-done-circle-outline" title="3. Validação" description="Ao reconectar, o sistema confere a integridade da fila e liquida o pagamento." />
                            </View>
                        </View>
                    )}
                </View>

                <View className="mb-6 flex-row gap-3">
                    <InfoCard label="Vendas aprovadas" value="5 transações" />

                    <InfoCard label="Fila de validação" value="2 pendentes" highlight />
                </View>

                <View className="mb-6 rounded-3xl border border-border bg-card p-5">
                    <Text className="mb-4 text-lg font-bold text-card-foreground">Ações rápidas</Text>

                    <View className="gap-3">
                        <ActionButton icon="cart-outline" title="Registrar pedido offline" description="Criar nova venda na sessão atual." />

                        <ActionButton icon="list-outline" title="Auditoria local" description="Verificar integridade da fila no dispositivo." />

                        <ActionButton icon="cloud-upload-outline" title="Sincronizar lote" description="Enviar vendas assinadas para o servidor." />
                    </View>
                </View>

                <View className="rounded-3xl border border-border bg-card p-5">
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-sm text-muted-foreground">Saldo liquidado</Text>

                            <Text className="mt-1 text-2xl font-bold text-card-foreground">R$ 128,40</Text>
                        </View>

                        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                            <Ionicons name="wallet-outline" size={21} color={COLOR_DEFAULT} />
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

type StatusCardProps = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    description: string;
    iconColor?: string;
};

function StatusCard({ icon, label, value, description, iconColor = COLOR_DEFAULT }: StatusCardProps) {
    return (
        <View className="flex-1 rounded-3xl border border-border bg-card p-4">
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Ionicons name={icon} size={24} color={iconColor} />
            </View>

            <Text className="text-sm text-muted-foreground">{label}</Text>

            <Text className="mt-1 text-lg font-bold text-card-foreground">{value}</Text>

            <Text className="mt-1 text-xs leading-5 text-muted-foreground">{description}</Text>
        </View>
    );
}

type HelpItemProps = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
};

function HelpItem({ icon, title, description }: HelpItemProps) {
    return (
        <View className="flex-row gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <Ionicons name={icon} size={18} color={COLOR_DEFAULT} />
            </View>

            <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">{title}</Text>

                <Text className="mt-1 text-xs leading-5 text-muted-foreground">{description}</Text>
            </View>
        </View>
    );
}

type InfoCardProps = {
    label: string;
    value: string;
    highlight?: boolean;
};

function InfoCard({ label, value, highlight }: InfoCardProps) {
    return (
        <View className="flex-1 rounded-2xl border border-border bg-card p-4">
            <Text className="mb-1 text-sm text-muted-foreground">{label}</Text>

            <Text className={`text-lg font-bold ${highlight ? "text-primary" : "text-card-foreground"}`}>{value}</Text>
        </View>
    );
}

type ActionButtonProps = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
};

function ActionButton({ icon, title, description }: ActionButtonProps) {
    return (
        <Pressable className="rounded-2xl border border-border bg-background p-4 active:opacity-80">
            <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                    <Ionicons name={icon} size={20} color={COLOR_DEFAULT} />
                </View>

                <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">{title}</Text>

                    <Text className="mt-1 text-xs leading-5 text-muted-foreground">{description}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={COLOR_INACTIVE} />
            </View>
        </Pressable>
    );
}
