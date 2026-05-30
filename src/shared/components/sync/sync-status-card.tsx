import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/src/shared/components/ui/button";

type SyncStatusCardProps = {
    variant: "compact" | "contextual" | "detailed";
    title?: string;
    onlineLabel: string;
    onlineColor: string;
    isConnected: boolean;
    isSyncing: boolean;
    pendingCount: number;
    pendingCatalogChanges?: number;
    pendingOrders?: number;
    rejectedCount?: number;
    pendingLabel: string;
    lastSyncAt?: string | null;
    lastError?: string | null;
    deviceId?: string | null;
    canSync?: boolean;
    syncingNow?: boolean;
    onSyncNow?: () => void;
};

function formatDate(value?: string | null) {
    if (!value) return "Ainda não sincronizado";
    return new Date(value).toLocaleString("pt-BR");
}

export function SyncStatusCard({
    variant,
    title,
    onlineLabel,
    onlineColor,
    isConnected,
    isSyncing,
    pendingCount,
    pendingCatalogChanges = 0,
    pendingOrders = 0,
    rejectedCount = 0,
    pendingLabel,
    lastSyncAt,
    lastError,
    deviceId,
    canSync = false,
    syncingNow = false,
    onSyncNow,
}: SyncStatusCardProps) {
    const syncLabel = isSyncing || syncingNow ? "Sincronizando" : isConnected ? "Pronto" : "Offline";
    const statusTone = isConnected ? "text-card-foreground" : "text-red-500";

    if (variant === "compact") {
        return (
            <View className="rounded-3xl border border-border bg-card p-4">
                <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                        <Text className="text-sm font-bold text-muted-foreground">{title ?? "Sincronização"}</Text>
                        <View className="mt-2 flex-row items-center gap-2">
                            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: onlineColor }} />
                            <Text className={`text-base font-black ${statusTone}`}>{onlineLabel}</Text>
                        </View>
                    </View>

                    <View className="items-end">
                        <Text className="text-xs font-bold text-muted-foreground">{syncLabel}</Text>
                        <Text className="mt-1 text-lg font-black text-card-foreground">{pendingCount}</Text>
                        <Text className="text-xs text-muted-foreground">{pendingLabel}</Text>
                    </View>
                </View>
            </View>
        );
    }

    if (variant === "contextual") {
        return (
            <View className="mb-5 rounded-3xl border border-border bg-card p-4">
                <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                        <Text className="text-sm font-bold text-muted-foreground">{title ?? "Status local"}</Text>
                        <View className="mt-2 flex-row items-center gap-2">
                            <Ionicons name={isConnected ? "cloud-done-outline" : "cloud-offline-outline"} size={16} color={onlineColor} />
                            <Text className={`text-base font-black ${statusTone}`}>{onlineLabel}</Text>
                        </View>
                    </View>

                    {isSyncing || syncingNow ? <ActivityIndicator color={onlineColor} /> : <Ionicons name={rejectedCount > 0 ? "alert-circle-outline" : "checkmark-circle-outline"} size={18} color={rejectedCount > 0 ? "#ef4444" : onlineColor} />}
                </View>

                <View className="mt-4 flex-row flex-wrap gap-2">
                    <Text className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{pendingCount} {pendingLabel}</Text>
                    <Text className={`rounded-xl px-3 py-2 text-xs font-bold ${rejectedCount > 0 ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}>{rejectedCount} erro(s)</Text>
                </View>

                {lastError ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{lastError}</Text> : null}
            </View>
        );
    }

    return (
        <View className="rounded-3xl border border-border bg-card p-5">
            <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                    <Text className="text-sm font-bold text-muted-foreground">{title ?? "Sincronização detalhada"}</Text>
                    <View className="mt-2 flex-row items-center gap-2">
                        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: onlineColor }} />
                        <Text className={`text-lg font-black ${statusTone}`}>{onlineLabel}</Text>
                    </View>
                </View>

                <View className="rounded-2xl bg-muted px-3 py-2">
                    <Text className="text-xs font-bold text-muted-foreground">{syncLabel}</Text>
                </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
                <Text className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{pendingCount} {pendingLabel}</Text>
                <Text className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">{rejectedCount} erro(s)</Text>
            </View>

            <View className="mt-4 gap-3 rounded-2xl bg-muted p-4">
                <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-sm font-bold text-muted-foreground">Alterações locais do catálogo</Text>
                    <Text className="text-sm font-black text-card-foreground">{pendingCatalogChanges}</Text>
                </View>

                <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-sm font-bold text-muted-foreground">Pedidos salvos neste aparelho</Text>
                    <Text className="text-sm font-black text-card-foreground">{pendingOrders}</Text>
                </View>

                <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-sm font-bold text-muted-foreground">Última sincronização</Text>
                    <Text className="max-w-[55%] text-right text-sm font-medium text-card-foreground">{formatDate(lastSyncAt)}</Text>
                </View>

                <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-sm font-bold text-muted-foreground">Device ID</Text>
                    <Text className="max-w-[55%] text-right text-sm font-medium text-card-foreground">{deviceId ?? "Não definido"}</Text>
                </View>
            </View>

            {lastError ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{lastError}</Text> : null}

            {canSync && onSyncNow ? (
                <View className="mt-4">
                    <Button title="Sincronizar agora" onPress={onSyncNow} loading={syncingNow || isSyncing} disabled={!isConnected} />
                </View>
            ) : null}
        </View>
    );
}
