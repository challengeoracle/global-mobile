import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { formatCurrency } from "@/src/shared/lib/formatters";

import { AnalyticsChartPointResponse, AnalyticsChartResponse } from "../types/insights";

type InsightChartCardProps = {
    chart: AnalyticsChartResponse | null;
    primaryLabel: string;
};

const VISIBLE_POINTS = 3;

export function InsightChartCard({ chart, primaryLabel }: InsightChartCardProps) {
    const sortedPoints = useMemo(() => {
        return [...(chart?.points ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [chart?.points]);

    const windows = useMemo(() => buildWindows(sortedPoints), [sortedPoints]);
    const [page, setPage] = useState(0);

    useEffect(() => {
        setPage(Math.max(0, windows.length - 1));
    }, [windows.length]);

    if (!chart || sortedPoints.length === 0 || windows.length === 0) {
        return null;
    }

    const safePage = Math.min(page, windows.length - 1);
    const visiblePoints = windows[safePage];
    const visibleTotal = visiblePoints.reduce((sum, point) => sum + (point.totalAmount || 0), 0);
    const maxAmount = Math.max(...visiblePoints.map((point) => point.totalAmount || 0), 1);

    return (
        <View className="mt-6 rounded-[28px] border border-border bg-card p-5">
            <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                    <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">Tendencia recente</Text>
                    <Text className="mt-2 text-xl font-black text-card-foreground">{primaryLabel}</Text>
                    <Text className="mt-1 text-sm text-muted-foreground">Janela atual: {formatCurrency(visibleTotal)}</Text>
                </View>

                <View className="flex-row items-center gap-2">
                    <Pressable onPress={() => setPage((current) => Math.max(0, current - 1))} disabled={safePage === 0} className="h-9 w-9 items-center justify-center rounded-full bg-muted disabled:opacity-35">
                        <Ionicons name="chevron-back" size={16} color="#dc2626" />
                    </Pressable>
                    <Pressable onPress={() => setPage((current) => Math.min(windows.length - 1, current + 1))} disabled={safePage >= windows.length - 1} className="h-9 w-9 items-center justify-center rounded-full bg-muted disabled:opacity-35">
                        <Ionicons name="chevron-forward" size={16} color="#dc2626" />
                    </Pressable>
                </View>
            </View>

            <Text className="mt-3 text-sm font-bold text-card-foreground">{formatRangeLabel(visiblePoints)}</Text>

            <View className="mt-6 flex-row items-end gap-3">
                {visiblePoints.map((point) => {
                    const amount = point.totalAmount || 0;
                    const height = Math.max(24, Math.round((amount / maxAmount) * 132));

                    return (
                        <View key={point.date} className="flex-1 rounded-[24px] border border-border bg-background px-3 py-4">
                            <Text className="text-sm font-black text-card-foreground">{formatCurrency(amount)}</Text>
                            <Text className="mt-1 text-[11px] font-bold uppercase tracking-[1.1px] text-muted-foreground">{formatDateLabel(point.date)}</Text>

                            <View className="mt-4 h-[144px] justify-end rounded-[20px] bg-muted/70 p-2">
                                <View className="w-full rounded-[16px] bg-primary/80" style={{ height }} />
                            </View>
                        </View>
                    );
                })}
            </View>

            <View className="mt-4 flex-row justify-center gap-2">
                {windows.map((_, index) => (
                    <View key={index} className={`h-2 rounded-full ${index === safePage ? "w-6 bg-primary" : "w-2 bg-border"}`} />
                ))}
            </View>
        </View>
    );
}

function buildWindows(points: AnalyticsChartPointResponse[]) {
    if (points.length <= VISIBLE_POINTS) {
        return points.length ? [points] : [];
    }

    const starts: number[] = [];

    for (let start = 0; start < points.length; start += VISIBLE_POINTS) {
        starts.push(start);
    }

    const remainder = points.length % VISIBLE_POINTS;

    if (remainder === 1) {
        starts[starts.length - 1] = Math.max(0, points.length - VISIBLE_POINTS);
    }

    return Array.from(new Set(starts))
        .sort((a, b) => a - b)
        .map((start) => points.slice(start, Math.min(start + VISIBLE_POINTS, points.length)));
}

function formatDateLabel(value: string) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function formatRangeLabel(points: AnalyticsChartPointResponse[]) {
    if (points.length === 0) {
        return "-";
    }

    if (points.length === 1) {
        return formatShortDate(points[0].date);
    }

    return `${formatShortDate(points[0].date)} - ${formatShortDate(points[points.length - 1].date)}`;
}

function formatShortDate(value: string) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
