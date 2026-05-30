import "../../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { AuthProvider } from "@/src/domains/auth/hooks/auth-context";
import { initDatabase } from "@/src/shared/database/database";
import { runMigrations } from "@/src/shared/database/migrations";

export default function RootLayout() {
    const { colorScheme, setColorScheme } = useColorScheme();
    const hasSetInitialTheme = useRef(false);

    useEffect(() => {
        async function prepareDatabase() {
            await initDatabase();
            await runMigrations();
        }

        prepareDatabase();
    }, []);

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
