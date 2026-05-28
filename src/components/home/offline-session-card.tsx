import { ActivityIndicator, Pressable, Text, View } from "react-native";

type OfflineSessionCardProps = {
    title: string;
    description: string;
    activateLabel: string;
    renewLabel: string;
    loading: boolean;
    offlineEnabled: boolean;
    isConnected: boolean;
    statusMessage: string;
    onActivate: () => void;
    onCheck: () => void;
};

export function OfflineSessionCard({ title, description, activateLabel, renewLabel, loading, offlineEnabled, isConnected, statusMessage, onActivate, onCheck }: OfflineSessionCardProps) {
    const buttonDisabled = loading || !isConnected;

    return (
        <View className="mb-6 rounded-3xl border border-border bg-card p-5">
            <Text className="text-lg font-black text-card-foreground">{title}</Text>

            <Text className="mt-3 text-base leading-7 text-muted-foreground">{description}</Text>

            <View className="mt-6 gap-3">
                <Pressable className={`h-14 items-center justify-center rounded-2xl active:opacity-90 ${buttonDisabled ? "bg-muted opacity-70" : "bg-primary"}`} onPress={onActivate} disabled={buttonDisabled}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text className={`text-sm font-bold uppercase tracking-[2px] ${buttonDisabled ? "text-muted-foreground" : "text-primary-foreground"}`}>{!isConnected ? "Conecte-se para autorizar" : offlineEnabled ? renewLabel : activateLabel}</Text>}
                </Pressable>

                <Pressable className="h-14 items-center justify-center rounded-2xl border border-border bg-card active:opacity-90" onPress={onCheck} disabled={loading}>
                    <Text className="text-sm font-bold uppercase tracking-[2px] text-card-foreground">Verificar status</Text>
                </Pressable>
            </View>

            <View className="mt-5 rounded-2xl border border-border bg-background px-4 py-4">
                <Text className="text-sm leading-6 text-muted-foreground">{statusMessage}</Text>
            </View>
        </View>
    );
}
