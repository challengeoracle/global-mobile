import { useAuth } from "@/src/contexts/auth-context";

import { Ionicons } from "@expo/vector-icons";

import { Redirect, Tabs } from "expo-router";

import { useColorScheme } from "nativewind";

import { ActivityIndicator, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const LIGHT_ACTIVE = "#dc2626";
const LIGHT_INACTIVE = "#a1a1aa";

const DARK_ACTIVE = "#ef4444";
const DARK_INACTIVE = "#52525b";

export default function TabLayout() {
    const { colorScheme } = useColorScheme();

    const insets = useSafeAreaInsets();

    const { loading, isAuthenticated } = useAuth();

    const isDark = colorScheme === "dark";

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color={isDark ? DARK_ACTIVE : LIGHT_ACTIVE} size="large" />
            </View>
        );
    }

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,

                tabBarActiveTintColor: isDark ? DARK_ACTIVE : LIGHT_ACTIVE,

                tabBarInactiveTintColor: isDark ? DARK_INACTIVE : LIGHT_INACTIVE,

                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                },

                tabBarStyle: {
                    height: 68 + insets.bottom,

                    paddingBottom: insets.bottom + 10,

                    paddingTop: 10,

                    backgroundColor: isDark ? "#09090b" : "#ffffff",

                    borderTopWidth: 1,

                    borderTopColor: isDark ? "#27272a" : "#e4e4e7",
                },

                tabBarItemStyle: {
                    paddingVertical: 4,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Início",

                    tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
                }}
            />

            <Tabs.Screen
                name="explore"
                options={{
                    title: "Operação",

                    tabBarIcon: ({ color, size }) => <Ionicons name="qr-code-outline" color={color} size={size} />,
                }}
            />

            <Tabs.Screen
                name="settings"
                options={{
                    title: "Conta",

                    tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
