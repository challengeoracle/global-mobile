import "../../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";

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
        <>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: {
                        backgroundColor: isDark ? "#0d0d0d" : "#fdfdfd",
                    },
                }}
            />

            <StatusBar style={isDark ? "light" : "dark"} backgroundColor={isDark ? "#0d0d0d" : "#fdfdfd"} />
        </>
    );
}
