import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
    const { colorScheme } = useColorScheme();
    const insets = useSafeAreaInsets();

    const isDark = colorScheme === "dark";

    return (
        <Tabs
            screenOptions={{
                headerShown: false,

                sceneStyle: {
                    backgroundColor: isDark ? "#0d0d0d" : "#fdfdfd",
                },

                tabBarStyle: {
                    backgroundColor: isDark ? "#18181b" : "#ffffff",
                    borderTopColor: isDark ? "#27272a" : "#e4e4e7",
                    height: 64 + insets.bottom,
                    paddingTop: 8,
                    paddingBottom: Math.max(insets.bottom, 10),
                },

                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "600",
                },

                tabBarActiveTintColor: isDark ? "#60a5fa" : "#2563eb",
                tabBarInactiveTintColor: isDark ? "#a1a1aa" : "#71717a",
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Início",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />,
                }}
            />

            <Tabs.Screen
                name="explore"
                options={{
                    title: "Operação",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "analytics" : "analytics-outline"} size={size} color={color} />,
                }}
            />

            <Tabs.Screen
                name="settings"
                options={{
                    title: "Config",
                    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
