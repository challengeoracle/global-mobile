import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useColorScheme } from "nativewind";

import { InsightAssistantCard } from "@/src/domains/insights/components/insight-assistant-card";
import { InsightChartCard } from "@/src/domains/insights/components/insight-chart-card";
import { InsightMetricCard } from "@/src/domains/insights/components/insight-metric-card";
import { InsightOfflineBlock } from "@/src/domains/insights/components/insight-offline-block";
import { InsightPeriodCard } from "@/src/domains/insights/components/insight-period-card";
import { InsightSummaryCard } from "@/src/domains/insights/components/insight-summary-card";
import { useInsights } from "@/src/domains/insights/hooks/use-insights";
import { CustomerSpendingByStoreResponse, InsightOverview } from "@/src/domains/insights/types/insights";
import { PageHeader } from "@/src/shared/components/ui/page-header";
import { formatCurrency, formatDateTime, formatShortId } from "@/src/shared/lib/formatters";

type InsightTab = "chat" | "indicadores";

export default function InsightsScreen() {
    const { colorScheme } = useColorScheme();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const {
        overview,
        periodSummary,
        chart,
        selectedPeriod,
        assistantAnswer,
        loading,
        refreshing,
        asking,
        error,
        isOfflineBlocked,
        loadInsights,
        refreshInsights,
        changePeriod,
        submitQuestion,
    } = useInsights();
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
                                        promptPlaceholder={overview?.role === "SELLER" ? "Ex.: Quanto vendi hoje?" : "Ex.: Quanto eu gastei hoje?"}
                                    />
                                    {error ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{error}</Text> : null}
                                </View>
                            ) : (
                                <View>
                                    {overview ? (
                                        <>
                                            <InsightSummaryCard overview={overview} />

                                            <InsightPeriodCard selectedPeriod={selectedPeriod} summary={periodSummary} onChangePeriod={changePeriod} />

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

                                            {overview.role === "CUSTOMER" ? <CustomerInsightsSection overview={overview} /> : null}

                                            <InsightChartCard chart={chart} primaryLabel={overview.role === "SELLER" ? "Vendas por dia" : "Gastos por dia"} />

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

function CustomerInsightsSection({ overview }: { overview: InsightOverview }) {
    const storeRows = (overview.spendingByStore ?? []).slice(0, 3);
    const recentProducts = overview.lastPurchaseProductNames?.filter(Boolean).slice(0, 3) ?? [];

    return (
        <View className="mt-6 gap-4">
            <View className="flex-row flex-wrap gap-3">
                <InsightMetricCard label="Última loja comprada" value={overview.lastPurchaseStoreLabel || overview.favoriteStoreLabel || "Sem dados"} />
                <InsightMetricCard
                    label="Última compra"
                    value={overview.lastPurchaseAmount != null ? formatCurrency(overview.lastPurchaseAmount) : "Sem dados"}
                    description={overview.lastPurchaseAt ? formatDateTime(overview.lastPurchaseAt) : overview.lastPurchaseOrderId ? `Pedido ${formatShortId(overview.lastPurchaseOrderId)}` : undefined}
                />
            </View>

            {recentProducts.length > 0 ? (
                <View className="rounded-[24px] border border-border bg-card p-4">
                    <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">Produtos da última compra</Text>
                    <Text className="mt-3 text-sm leading-6 text-card-foreground">{recentProducts.join(" • ")}</Text>
                </View>
            ) : null}

            {storeRows.length > 0 ? <SpendingByStoreCard rows={storeRows} /> : null}
        </View>
    );
}

function SpendingByStoreCard({ rows }: { rows: CustomerSpendingByStoreResponse[] }) {
    return (
        <View className="rounded-[24px] border border-border bg-card p-4">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">Gastos por loja</Text>

            <View className="mt-4 gap-3">
                {rows.map((item) => (
                    <View key={`${item.storeId}-${item.lastPurchaseAt ?? "na"}`} className="rounded-2xl bg-muted px-4 py-4">
                        <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                                <Text className="text-sm font-black text-card-foreground">{item.storeName || `Loja ${formatShortId(item.storeId)}`}</Text>
                                <Text className="mt-1 text-xs text-muted-foreground">{item.purchases} compra(s)</Text>
                            </View>

                            <Text className="text-sm font-black text-card-foreground">{formatCurrency(item.totalSpent ?? 0)}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

function SubTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} className={`h-11 flex-1 items-center justify-center rounded-full ${active ? "bg-card" : "bg-transparent"}`}>
            <Text className={`text-sm font-bold ${active ? "text-card-foreground" : "text-muted-foreground"}`}>{label}</Text>
        </Pressable>
    );
}
