import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";

type ScreenProps = {
    children: ReactNode;
    scroll?: boolean;
};

export function Screen({ children, scroll = false }: ScreenProps) {
    if (scroll) {
        return (
            <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerClassName="px-6 py-16">{children}</ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView className="flex-1 justify-center bg-background px-6" behavior={Platform.OS === "ios" ? "padding" : undefined}>
            {children}
        </KeyboardAvoidingView>
    );
}
