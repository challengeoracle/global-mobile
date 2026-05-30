import { ReactNode } from "react";
import { View } from "react-native";

type SettingsSectionProps = {
    children: ReactNode;
};

export function SettingsSection({ children }: SettingsSectionProps) {
    return <View className="mb-6 overflow-hidden rounded-3xl border border-border bg-card">{children}</View>;
}

export function SettingsDivider() {
    return <View className="mx-5 h-px bg-border" />;
}
