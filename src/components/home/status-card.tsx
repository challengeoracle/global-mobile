import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type StatusCardProps = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    value: string;
    description: string;
    color: string;
};

export function StatusCard({ icon, title, value, description, color }: StatusCardProps) {
    return (
        <View className="flex-1 rounded-3xl border border-border bg-card p-4">
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Ionicons name={icon} size={22} color={color} />
            </View>

            <Text className="text-sm text-muted-foreground">{title}</Text>

            <Text className="mt-1 text-lg font-black text-card-foreground">{value}</Text>

            <Text className="mt-1 text-xs leading-5 text-muted-foreground">{description}</Text>
        </View>
    );
}
