import { Link, Redirect } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, Text, View } from "react-native";
import { useAuth } from "@/src/domains/auth/hooks/auth-context";

export default function AccessScreen() {
    const { loading, isAuthenticated } = useAuth();

    // Animação para a linha (efeito ondulação/respiração)
    const lineAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        Animated.loop(Animated.sequence([Animated.timing(lineAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(lineAnim, { toValue: 0.5, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })])).start();
    }, [lineAnim]);

    if (loading)
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color="rgb(var(--primary))" size="large" />
            </View>
        );

    if (isAuthenticated) return <Redirect href="/(tabs)/home" />;

    return (
        <View className="flex-1 bg-background justify-center px-8">
            {/* Logo Centralizada */}
            <View className="items-center mb-16">
                <View className="flex-row items-baseline">
                    <Text className="text-[52px] font-thin tracking-widest text-foreground">OFF</Text>
                    <Text className="text-[52px] font-black text-primary">PAY</Text>
                </View>
                <Animated.View style={{ transform: [{ scaleX: lineAnim }] }} className="h-[3px] w-24 bg-primary rounded-full mt-1" />

                <Text className="text-center text-base leading-7 text-muted-foreground mt-10 px-4 max-w-xl">Continuidade operacional para pequenos negócios mesmo offline.</Text>
            </View>

            {/* Botões mais compactos e elevados */}
            <View className="w-full gap-3 mt-4">
                <Link href="/login" asChild>
                    <Pressable className="h-14 items-center justify-center rounded-xl bg-primary active:opacity-90">
                        <Text className="text-sm font-bold tracking-widest text-primary-foreground uppercase">Entrar</Text>
                    </Pressable>
                </Link>

                <Link href={"/signup" as any} asChild>
                    <Pressable className="h-14 items-center justify-center rounded-xl border border-border bg-card active:bg-muted">
                        <Text className="text-sm font-bold tracking-widest text-foreground uppercase">Criar conta</Text>
                    </Pressable>
                </Link>
            </View>
        </View>
    );
}
