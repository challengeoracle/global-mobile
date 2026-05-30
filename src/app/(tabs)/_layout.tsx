import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LIGHT_ACTIVE = "#dc2626";
const LIGHT_INACTIVE = "#a1a1aa";
const DARK_ACTIVE = "#ef4444";
const DARK_INACTIVE = "#52525b";

type IconName = keyof typeof Ionicons.glyphMap;

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

    const createTabBarIcon = (name: IconName) => {
        const IconComponent = ({ color, size }: { color: string; size: number }) => <Ionicons name={name} color={color} size={size} />;
        IconComponent.displayName = `TabBarIcon(${name})`;
        return IconComponent;
    };

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
                    height: 76 + insets.bottom,
                    paddingBottom: insets.bottom + 12,
                    paddingTop: 12,
                    paddingHorizontal: 10,
                    backgroundColor: isDark ? "#09090b" : "#ffffff",
                    borderTopWidth: 1,
                    borderTopColor: isDark ? "#27272a" : "#e4e4e7",
                },
                tabBarItemStyle: {
                    paddingVertical: 4,
                    paddingHorizontal: 2,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Início",
                    tabBarIcon: createTabBarIcon("home-outline"),
                }}
            />

            <Tabs.Screen
                name="explore"
                options={{
                    href: null,
                }}
            />

            <Tabs.Screen
                name="catalog"
                options={{
                    title: "Catálogo",
                    tabBarIcon: createTabBarIcon("book-outline"),
                }}
            />

            <Tabs.Screen
                name="orders"
                options={{
                    title: "Pedidos",
                    tabBarIcon: createTabBarIcon("receipt-outline"),
                }}
            />

            <Tabs.Screen
                name="wallet"
                options={{
                    title: "Carteira",
                    tabBarIcon: createTabBarIcon("wallet-outline"),
                }}
            />

            <Tabs.Screen
                name="settings"
                options={{
                    title: "Configurações",
                    tabBarIcon: createTabBarIcon("settings-outline"),
                }}
            />
        </Tabs>
    );
}
