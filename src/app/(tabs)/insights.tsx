import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useColorScheme } from "nativewind";

import { InsightAssistantCard } from "@/src/domains/insights/components/insight-assistant-card";
import { InsightMetricCard } from "@/src/domains/insights/components/insight-metric-card";
import { InsightOfflineBlock } from "@/src/domains/insights/components/insight-offline-block";
import { InsightSummaryCard } from "@/src/domains/insights/components/insight-summary-card";
import { useInsights } from "@/src/domains/insights/hooks/use-insights";
import { PageHeader } from "@/src/shared/components/ui/page-header";
import { formatCurrency } from "@/src/shared/lib/formatters";

type InsightTab = "chat" | "indicadores";

export default function InsightsScreen() {
    const { colorScheme } = useColorScheme();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const { overview, assistantAnswer, loading, refreshing, asking, error, isOfflineBlocked, loadInsights, refreshInsights, submitQuestion } = useInsights();
    const [activeTab, setActiveTab] = useState<InsightTab>("chat");

    useFocusEffect(
        useCallback(() => {
            loadInsights();
        }, [loadInsights]),
    );

    if (loading && !isOfflineBlocked) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color={iconColor} size="large" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={24} className="flex-1 bg-background">
            <ScrollView
                className="flex-1 bg-background"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                refreshControl={isOfflineBlocked ? undefined : <RefreshControl refreshing={refreshing} onRefresh={refreshInsights} tintColor={iconColor} />}
            >
                <View className="px-6 pb-14 pt-14">
                    <PageHeader eyebrow="Insights" title="Indicadores com IA" description="Consulte seus números mais importantes e converse com o assistente quando estiver online." />

                    {isOfflineBlocked ? (
                        <InsightOfflineBlock />
                    ) : (
                        <>
                            <View className="mb-6 flex-row rounded-full bg-muted p-1">
                                <SubTabButton label="Chat" active={activeTab === "chat"} onPress={() => setActiveTab("chat")} />
                                <SubTabButton label="Indicadores" active={activeTab === "indicadores"} onPress={() => setActiveTab("indicadores")} />
                            </View>

                            {activeTab === "chat" ? (
                                <View>
                                    <InsightAssistantCard
                                        asking={asking}
                                        answer={assistantAnswer}
                                        onSubmit={submitQuestion}
                                        promptPlaceholder={overview?.role === "SELLER" ? "Ex.: Tenho saldo pendente?" : "Ex.: Quanto eu gastei?"}
                                    />
                                    {error ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{error}</Text> : null}
                                </View>
                            ) : (
                                <View>
                                    {overview ? (
                                        <>
                                            <InsightSummaryCard overview={overview} />

                                            <View className="mt-6 flex-row flex-wrap gap-3">
                                                <InsightMetricCard label={overview.primaryAmountLabel} value={formatCurrency(overview.primaryAmount)} highlight />
                                                <InsightMetricCard label={overview.orderCountLabel} value={String(overview.orderCount)} />
                                                <InsightMetricCard label="Pagamentos pendentes" value={String(overview.pendingPayments)} />
                                                <InsightMetricCard label="Pagamentos recusados" value={String(overview.rejectedPayments)} />
                                                <InsightMetricCard label={overview.availableBalanceLabel} value={formatCurrency(overview.availableBalance)} />
                                                {overview.role === "SELLER" ? <InsightMetricCard label="Saldo pendente" value={formatCurrency(overview.pendingBalance ?? 0)} /> : null}
                                            </View>

                                            <View className="mt-4">
                                                <InsightMetricCard
                                                    label={overview.topProductLabel}
                                                    value={overview.topProductName || "Sem destaque ainda"}
                                                    description={overview.topProductQuantity ? `${overview.topProductQuantity} unidade(s)` : "Os próximos pedidos ajudam a formar esse ranking."}
                                                />
                                            </View>

                                            {overview.message ? <Text className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">{overview.message}</Text> : null}
                                        </>
                                    ) : null}

                                    {error ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{error}</Text> : null}
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function SubTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} className={`h-11 flex-1 items-center justify-center rounded-full ${active ? "bg-card" : "bg-transparent"}`}>
            <Text className={`text-sm font-bold ${active ? "text-card-foreground" : "text-muted-foreground"}`}>{label}</Text>
        </Pressable>
    );
}
