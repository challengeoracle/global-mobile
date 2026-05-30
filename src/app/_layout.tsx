import "../../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "@/src/domains/auth/hooks/auth-context";
import { scheduleSync } from "@/src/domains/sync/services/sync-engine";
import { initDatabase } from "@/src/shared/database/database";
import { runMigrations } from "@/src/shared/database/migrations";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";

function SyncAutoBootstrap() {
    const { loading, user } = useAuth();
    const network = useNetworkStatus();
    const hasTriggeredInitialSync = useRef(false);
    const previousConnectedRef = useRef<boolean | null>(null);

    useEffect(() => {
        if (loading) {
            return;
        }

        const isSeller = user?.role === "SELLER";
        const isConnected = network.isConnected;
        const wasConnected = previousConnectedRef.current;
        const internetRestored = wasConnected === false && isConnected;

        previousConnectedRef.current = isConnected;

        if (!isSeller || !isConnected) {
            if (!isConnected) {
                hasTriggeredInitialSync.current = true;
            }
            return;
        }

        if (!hasTriggeredInitialSync.current || internetRestored) {
            scheduleSync({
                isConnected,
                canSync: true,
                pullCatalogAfterSync: true,
                debounceMs: 900,
            });
            hasTriggeredInitialSync.current = true;
        }
    }, [loading, network.isConnected, user?.role]);

    return null;
}

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
            <SyncAutoBootstrap />
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
