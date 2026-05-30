import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type SettingsItemProps = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    iconColor?: string;
    rightText?: string;
    danger?: boolean;
    onPress?: () => void;
};

export function SettingsItem({ icon, title, description, iconColor = "#dc2626", rightText, danger, onPress }: SettingsItemProps) {
    return (
        <Pressable disabled={!onPress} onPress={onPress} className="flex-row items-center justify-between px-5 py-5 active:opacity-80">
            <View className="flex-1 flex-row items-center gap-4">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                    <Ionicons name={icon} size={21} color={iconColor} />
                </View>

                <View className="flex-1">
                    <Text className={`text-base font-bold ${danger ? "text-red-500" : "text-card-foreground"}`}>{title}</Text>

                    <Text className="mt-1 text-sm text-muted-foreground">{description}</Text>
                </View>
            </View>

            {rightText ? <Text className="text-sm font-black text-primary">{rightText}</Text> : onPress ? <Ionicons name="chevron-forward" size={18} color="#71717a" /> : null}
        </Pressable>
    );
}
