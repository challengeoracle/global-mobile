import { Text, View } from "react-native";

import { formatCurrency } from "@/src/shared/lib/formatters";

import { AnalyticsChartResponse } from "../types/insights";

type InsightChartCardProps = {
    chart: AnalyticsChartResponse | null;
    primaryLabel: string;
};

export function InsightChartCard({ chart, primaryLabel }: InsightChartCardProps) {
    if (!chart || chart.points.length === 0) {
        return null;
    }

    const maxAmount = Math.max(...chart.points.map((point) => point.totalAmount || 0), 1);

    return (
        <View className="mt-6 rounded-[28px] border border-border bg-card p-5">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">Tendência recente</Text>
            <Text className="mt-2 text-xl font-black text-card-foreground">{primaryLabel}</Text>
            <Text className="mt-1 text-sm text-muted-foreground">Total do período: {formatCurrency(chart.totalAmount ?? 0)}</Text>

            <View className="mt-6 flex-row items-end gap-3">
                {chart.points.map((point) => {
                    const height = Math.max(20, Math.round(((point.totalAmount || 0) / maxAmount) * 120));
                    return (
                        <View key={point.date} className="flex-1 items-center">
                            <Text className="mb-2 text-[10px] font-bold text-muted-foreground">{formatCurrency(point.totalAmount ?? 0)}</Text>
                            <View className="w-full rounded-t-[18px] bg-primary/85" style={{ height }} />
                            <Text className="mt-2 text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">{formatDateLabel(point.date)}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

function formatDateLabel(value: string) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
