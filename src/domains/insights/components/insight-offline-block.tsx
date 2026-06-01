import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export function InsightOfflineBlock() {
    return (
        <View className="rounded-3xl border border-border bg-card p-6">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Ionicons name="cloud-offline-outline" size={24} color="#dc2626" />
            </View>

            <Text className="mt-5 text-2xl font-black tracking-[-0.8px] text-card-foreground">Insights indisponível offline</Text>
            <Text className="mt-3 text-sm leading-7 text-muted-foreground">
                Esta área depende da conexão com o Analytics AI Service para consultar dados sincronizados e gerar respostas com IA. Reconecte-se para atualizar seus indicadores.
            </Text>
        </View>
    );
}
