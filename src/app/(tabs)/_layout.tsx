import { useAuth } from "@/src/contexts/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
    const { colorScheme } = useColorScheme();
    const insets = useSafeAreaInsets();
    const { loading, isAuthenticated } = useAuth();

    const isDark = colorScheme === "dark";

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator />
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
                tabBarActiveTintColor: isDark ? "#93c5fd" : "#2563eb",
                tabBarInactiveTintColor: isDark ? "#64748b" : "#94a3b8",
                tabBarStyle: {
                    height: 62 + insets.bottom,
                    paddingBottom: insets.bottom + 8,
                    paddingTop: 8,
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
