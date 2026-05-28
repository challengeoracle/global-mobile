import "../../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { AuthProvider } from "../contexts/auth-context";

export default function RootLayout() {
    const { colorScheme, setColorScheme } = useColorScheme();
    const hasSetInitialTheme = useRef(false);

    useEffect(() => {
        if (hasSetInitialTheme.current) return;

        hasSetInitialTheme.current = true;
        setColorScheme("light");
    }, [setColorScheme]);

    const isDark = colorScheme === "dark";

    return (
        <AuthProvider>
            <StatusBar style={isDark ? "light" : "dark"} />

            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="signup" />
                <Stack.Screen name="(tabs)" />
            </Stack>
        </AuthProvider>
    );
}
