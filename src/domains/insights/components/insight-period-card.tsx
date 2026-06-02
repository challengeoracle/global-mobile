import { Pressable, Text, View } from "react-native";

import { formatCurrency } from "@/src/shared/lib/formatters";

import { AnalyticsPeriod, AnalyticsPeriodSummaryResponse } from "../types/insights";

type InsightPeriodCardProps = {
    selectedPeriod: AnalyticsPeriod;
    summary: AnalyticsPeriodSummaryResponse | null;
    onChangePeriod: (period: AnalyticsPeriod) => void;
};

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
    { value: "today", label: "Hoje" },
    { value: "yesterday", label: "Ontem" },
    { value: "week", label: "Semana" },
    { value: "month", label: "Mês" },
];

export function InsightPeriodCard({ selectedPeriod, summary, onChangePeriod }: InsightPeriodCardProps) {
    return (
        <View className="mt-6 rounded-[28px] border border-border bg-card p-5">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">Recorte</Text>

            <View className="mt-4 flex-row flex-wrap gap-2">
                {PERIOD_OPTIONS.map((option) => (
                    <Pressable
                        key={option.value}
                        onPress={() => onChangePeriod(option.value)}
                        className={`rounded-full px-4 py-2 ${selectedPeriod === option.value ? "bg-primary" : "bg-muted"}`}
                    >
                        <Text className={`text-sm font-bold ${selectedPeriod === option.value ? "text-primary-foreground" : "text-muted-foreground"}`}>{option.label}</Text>
                    </Pressable>
                ))}
            </View>

            {summary ? (
                <>
                    <Text className="mt-5 text-lg font-black text-card-foreground">{formatPeriodTitle(summary.period)}</Text>

                    <View className="mt-5 flex-row flex-wrap gap-3">
                        <MiniMetric label="Volume" value={formatCurrency(summary.totalAmount ?? 0)} />
                        <MiniMetric label="Pedidos" value={String(summary.totalOrders ?? 0)} />
                        <MiniMetric label="Ticket médio" value={formatCurrency(summary.averageTicket ?? 0)} />
                    </View>

                    <Text className="mt-4 text-sm leading-6 text-muted-foreground">{buildReadableSummary(summary)}</Text>
                </>
            ) : null}
        </View>
    );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
    return (
        <View className="min-w-[31%] flex-1 rounded-2xl bg-muted px-3 py-4">
            <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{label}</Text>
            <Text className="mt-2 text-lg font-black text-card-foreground">{value}</Text>
        </View>
    );
}

function formatPeriodTitle(period: string) {
    switch (period) {
        case "TODAY":
            return "Resumo de hoje";
        case "YESTERDAY":
            return "Resumo de ontem";
        case "THIS_WEEK":
            return "Resumo da semana";
        case "THIS_MONTH":
            return "Resumo do mês";
        default:
            return "Resumo do período";
    }
}

function buildReadableSummary(summary: AnalyticsPeriodSummaryResponse) {
    const periodLabel = (() => {
        switch (summary.period) {
            case "TODAY":
                return "hoje";
            case "YESTERDAY":
                return "ontem";
            case "THIS_WEEK":
                return "nesta semana";
            case "THIS_MONTH":
                return "neste mês";
            default:
                return "no período selecionado";
        }
    })();

    const product = summary.topProductName || "sem destaque ainda";
    const quantity = summary.topProductQuantity ?? 0;

    return `Foram ${summary.totalOrders ?? 0} pedido(s) ${periodLabel}, totalizando ${formatCurrency(summary.totalAmount ?? 0)}. Produto em destaque: ${product}${quantity > 0 ? `, com ${quantity} unidade(s)` : ""}.`;
}
