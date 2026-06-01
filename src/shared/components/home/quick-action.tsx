import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

const COLOR_RED = "#dc2626";
const COLOR_GRAY = "#a1a1aa";

type QuickActionProps = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description?: string;
    onPress?: () => void;
    compact?: boolean;
};

export function QuickAction({ icon, title, description, onPress, compact = false }: QuickActionProps) {
    if (compact) {
        return (
            <Pressable onPress={onPress} className="min-h-[132px] min-w-[47%] flex-1 rounded-3xl border border-border bg-card p-4 active:opacity-90">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                    <Ionicons name={icon} size={20} color={COLOR_RED} />
                </View>

                <Text className="mt-4 text-base font-black text-foreground">{title}</Text>
                {description ? <Text className="mt-2 text-sm leading-6 text-muted-foreground">{description}</Text> : null}
            </Pressable>
        );
    }

    return (
        <Pressable onPress={onPress} className="rounded-2xl border border-border bg-background p-4 active:opacity-90">
            <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                    <Ionicons name={icon} size={20} color={COLOR_RED} />
                </View>

                <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">{title}</Text>
                    {description ? <Text className="mt-1 text-xs leading-5 text-muted-foreground">{description}</Text> : null}
                </View>

                <Ionicons name="chevron-forward" size={18} color={COLOR_GRAY} />
            </View>
        </Pressable>
    );
}
