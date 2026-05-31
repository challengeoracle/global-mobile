import { Redirect } from "expo-router";
import { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { loading, isAuthenticated } = useAuth();

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color="rgb(var(--primary))" size="large" />
            </View>
        );
    }

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    return <>{children}</>;
}
