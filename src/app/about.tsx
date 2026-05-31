import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ProtectedRoute } from "@/src/shared/components/auth/protected-route";
import { PageHeader } from "@/src/shared/components/ui/page-header";

const COMMIT_REFERENCE = String(Constants.expoConfig?.extra?.commitReference ?? "desconhecido");

export default function AboutScreen() {
    return (
        <ProtectedRoute>
            <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
                <View className="px-6 pb-10 pt-14">
                    <Pressable onPress={() => router.push("/(tabs)/settings")} className="mb-6 h-11 w-11 items-center justify-center rounded-2xl bg-card">
                        <Ionicons name="arrow-back" size={20} color="#f8fafc" />
                    </Pressable>

                    <PageHeader eyebrow="Sobre o App" title="OffPay" description="Informações de referência da versão atual do aplicativo." />

                    <View className="rounded-3xl border border-border bg-card p-5">
                        <Text className="text-lg font-black text-card-foreground">Visão geral</Text>
                        <Text className="mt-2 text-base leading-7 text-muted-foreground">O OffPay foi pensado para manter catálogo, pedidos, pagamentos e sincronização funcionando mesmo em cenários com conexão instável.</Text>
                    </View>

                    <View className="mt-6 rounded-3xl border border-border bg-card p-5">
                        <Text className="text-lg font-black text-card-foreground">Commit de referência</Text>
                        <Text selectable className="mt-3 rounded-2xl border border-border bg-background px-4 py-4 text-sm font-bold text-card-foreground">
                            {COMMIT_REFERENCE}
                        </Text>
                        <Text className="mt-2 text-sm leading-6 text-muted-foreground">Use esse hash para identificar a revisão do app que serviu de base para esta entrega.</Text>
                    </View>

                    <View className="mt-6 rounded-3xl border border-border bg-card p-5">
                        <Text className="text-lg font-black text-card-foreground">Pilares do projeto</Text>
                        <View className="mt-4 gap-3">
                            <InfoRow title="Offline-first" description="As operações nascem localmente e seguem disponíveis mesmo sem internet." />
                            <InfoRow title="Sincronização segura" description="Os dados são reconciliados com o backend quando a conexão volta." />
                            <InfoRow title="Pagamento integrado" description="Carteiras, extratos e status de pagamento ficam conectados ao fluxo dos pedidos." />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </ProtectedRoute>
    );
}

function InfoRow({ title, description }: { title: string; description: string }) {
    return (
        <View className="rounded-2xl border border-border bg-background p-4">
            <Text className="text-sm font-black text-card-foreground">{title}</Text>
            <Text className="mt-1 text-sm leading-6 text-muted-foreground">{description}</Text>
        </View>
    );
}
