import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { InsightOverview } from "../types/insights";

type InsightSummaryCardProps = {
    overview: InsightOverview;
};

export function InsightSummaryCard({ overview }: InsightSummaryCardProps) {
    return (
        <View>
            <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Ionicons name="sparkles-outline" size={20} color="#dc2626" />
                </View>

                <View className="flex-1">
                    <Text className="text-sm font-bold text-muted-foreground">{overview.title}</Text>
                    <Text className="mt-1 text-3xl font-black tracking-[-0.8px] text-card-foreground">{overview.greetingName ? `Olá, ${overview.greetingName}` : "Olá"}</Text>
                </View>
            </View>

            <Text className="mt-4 text-sm leading-6 text-muted-foreground">{overview.description}</Text>
        </View>
    );
}
