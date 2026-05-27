import { Ionicons } from "@expo/vector-icons";
import NetInfo, { NetInfoStateType } from "@react-native-community/netinfo";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type ConnectionStatus = {
    isConnected: boolean;
    type: NetInfoStateType | "unknown";
};

export default function HomeScreen() {
    const [offlineModeEnabled, setOfflineModeEnabled] = useState(false);
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
                description: "Operando sem rede",
                icon: "alert-circle-outline" as const,
                color: "#ef4444",
                background: "bg-red-500/10",
            };
        }

        if (connection.type === "wifi") {
            return {
                label: "WiFi",
                description: "Rede estável",
                icon: "cloud-done-outline" as const,
                color: "#38bdf8",
                background: "bg-sky-500/10",
            };
        }

        if (connection.type === "cellular") {
            return {
                label: "Rede Móvel",
                description: "Dados móveis ativos",
                icon: "phone-portrait-outline" as const,
                color: "#a78bfa",
                background: "bg-violet-500/10",
            };
        }

        return {
            label: "Online",
            description: "Conexão disponível",
            icon: "radio-outline" as const,
            color: "#22c55e",
            background: "bg-emerald-500/10",
        };
    }, [connection]);

    const canActivateOfflineMode = connection.isConnected;

    function handleOfflineModePress() {
        if (!offlineModeEnabled && !canActivateOfflineMode) return;

        setOfflineModeEnabled((current) => !current);
    }

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="px-6 pb-10 pt-14">
                <View className="mb-8">
                    <Text className="mb-2 text-sm font-semibold uppercase tracking-[3px] text-primary">Painel do vendedor</Text>

                    <Text className="mb-3 text-4xl font-bold text-foreground">Olá, Célia</Text>

                    <Text className="text-base leading-7 text-muted-foreground">Prepare sua loja para continuar vendendo mesmo se a conexão cair.</Text>
                </View>

                <View className="mb-6 flex-row gap-3">
                    <View className="flex-1 rounded-3xl border border-border bg-card p-4">
                        <View className="mb-4 flex-row items-center justify-between">
                            <View className={`h-12 w-12 items-center justify-center rounded-2xl ${connectionInfo.background}`}>
                                <Ionicons name={connectionInfo.icon} size={24} color={connectionInfo.color} />
                            </View>

                            <View className="h-3 w-3 rounded-full" style={{ backgroundColor: connectionInfo.color }} />
                        </View>

                        <Text className="text-sm text-muted-foreground">Conexão atual</Text>

                        <Text className="mt-1 text-xl font-bold text-card-foreground">{connectionInfo.label}</Text>

                        <Text className="mt-1 text-xs text-muted-foreground">{connectionInfo.description}</Text>
                    </View>

                    <View className="flex-1 rounded-3xl border border-border bg-card p-4">
                        <View className="mb-4 flex-row items-center justify-between">
                            <View className={`h-12 w-12 items-center justify-center rounded-2xl ${offlineModeEnabled ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                                <Ionicons name={offlineModeEnabled ? "shield-checkmark-outline" : "shield-outline"} size={24} color={offlineModeEnabled ? "#22c55e" : "#f59e0b"} />
                            </View>

                            <View
                                className="h-3 w-3 rounded-full"
                                style={{
                                    backgroundColor: offlineModeEnabled ? "#22c55e" : "#f59e0b",
                                }}
                            />
                        </View>

                        <Text className="text-sm text-muted-foreground">Modo offline</Text>

                        <Text className="mt-1 text-xl font-bold text-card-foreground">{offlineModeEnabled ? "Ativo" : "Inativo"}</Text>

                        <Text className="mt-1 text-xs text-muted-foreground">{offlineModeEnabled ? "Loja protegida" : "Precisa de rede"}</Text>
                    </View>
                </View>

                <View className="mb-6 rounded-3xl border border-border bg-card p-5">
                    <View className="mb-5">
                        <Text className="text-lg font-bold text-card-foreground">Preparar modo offline</Text>

                        <Text className="mt-2 text-sm leading-6 text-muted-foreground">Ative com internet para liberar o token de validação e deixar a loja pronta.</Text>
                    </View>

                    <Pressable disabled={!offlineModeEnabled && !canActivateOfflineMode} onPress={handleOfflineModePress} className={`rounded-2xl px-5 py-4 active:opacity-80 ${!offlineModeEnabled && !canActivateOfflineMode ? "bg-muted opacity-60" : "bg-primary"}`}>
                        <Text className={`text-center text-base font-bold ${!offlineModeEnabled && !canActivateOfflineMode ? "text-muted-foreground" : "text-primary-foreground"}`}>{offlineModeEnabled ? "Desativar modo offline" : canActivateOfflineMode ? "Ativar modo offline" : "Conecte-se para ativar"}</Text>
                    </Pressable>
                </View>

                <View className="mb-6 flex-row gap-3">
                    <InfoCard label="Hoje" value="5 vendas" />
                    <InfoCard label="Aguardando envio" value="2 vendas" highlight />
                </View>

                <View className="mb-6 rounded-3xl border border-border bg-card p-5">
                    <Text className="mb-4 text-lg font-bold text-card-foreground">Como funciona</Text>

                    <View className="gap-4">
                        <Step icon="key-outline" title="1. Validação inicial" description="Ative com WiFi ou Rede Móvel para gerar o token." />

                        <Step icon="qr-code-outline" title="2. Venda por QR Code" description="Pedidos continuam sendo registrados no aparelho." />

                        <Step icon="cloud-upload-outline" title="3. Enviar depois" description="Quando a internet voltar, as vendas pendentes são enviadas." />
                    </View>
                </View>

                <View className="mb-6 rounded-3xl border border-border bg-card p-5">
                    <Text className="mb-4 text-lg font-bold text-card-foreground">Ações rápidas</Text>

                    <View className="gap-3">
                        <ActionButton icon="qr-code-outline" title="QR Code da loja" description="Mostrar catálogo para o cliente." />

                        <ActionButton icon="scan-outline" title="Ler pedido do cliente" description="Confirmar uma venda por QR Code." />

                        <ActionButton icon="cloud-upload-outline" title="Enviar vendas pendentes" description="Atualizar dados quando a internet voltar." />
                    </View>
                </View>

                <View className="rounded-3xl border border-border bg-card p-5">
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-sm text-muted-foreground">Saldo simulado</Text>

                            <Text className="mt-1 text-2xl font-bold text-card-foreground">R$ 128,40</Text>
                        </View>

                        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                            <Ionicons name="wallet-outline" size={21} color="#60a5fa" />
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
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

type StepProps = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
};

function Step({ icon, title, description }: StepProps) {
    return (
        <View className="flex-row gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                <Ionicons name={icon} size={20} color="#60a5fa" />
            </View>

            <View className="flex-1">
                <Text className="text-sm font-bold text-card-foreground">{title}</Text>
                <Text className="mt-1 text-xs leading-5 text-muted-foreground">{description}</Text>
            </View>
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
                    <Ionicons name={icon} size={20} color="#60a5fa" />
                </View>

                <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">{title}</Text>

                    <Text className="mt-1 text-xs leading-5 text-muted-foreground">{description}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#71717a" />
            </View>
        </Pressable>
    );
}
