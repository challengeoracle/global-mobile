import { Ionicons } from "@expo/vector-icons";

import { Pressable, Text, View } from "react-native";

const COLOR_RED = "#dc2626";
const COLOR_GRAY = "#a1a1aa";

type QuickActionProps = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
};

export function QuickAction({ icon, title, description }: QuickActionProps) {
    return (
        <Pressable className="rounded-2xl border border-border bg-background p-4 active:opacity-90">
            <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                    <Ionicons name={icon} size={20} color={COLOR_RED} />
                </View>

                <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">{title}</Text>

                    <Text className="mt-1 text-xs leading-5 text-muted-foreground">{description}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={COLOR_GRAY} />
            </View>
        </Pressable>
    );
}
