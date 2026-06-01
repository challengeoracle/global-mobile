import { Text, View } from "react-native";

type InsightMetricCardProps = {
    label: string;
    value: string;
    description?: string;
    highlight?: boolean;
};

export function InsightMetricCard({ label, value, description, highlight = false }: InsightMetricCardProps) {
    return (
        <View className={`min-w-[47%] flex-1 rounded-[24px] border p-4 ${highlight ? "border-primary/25 bg-primary/10" : "border-border bg-card"}`}>
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-center text-muted-foreground">{label}</Text>
            <Text className={`mt-3 text-center text-2xl font-black tracking-[-0.6px] ${highlight ? "text-primary" : "text-card-foreground"}`}>{value}</Text>
            {description ? <Text className="mt-2 text-center text-xs leading-5 text-muted-foreground">{description}</Text> : null}
        </View>
    );
}
