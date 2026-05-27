import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function AccessScreen() {
    return (
        <View className="flex-1 bg-background px-6 pb-10 pt-16">
            <View className="flex-1 justify-center">
                <View className="mb-10">
                    <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                        <Ionicons name="radio-outline" size={26} color="#60a5fa" />
                    </View>

                    <Text className="mb-2 text-sm font-semibold uppercase tracking-[3px] text-primary">SIGNAL</Text>

                    <Text className="mb-4 text-4xl font-bold leading-tight text-foreground">Venda sem internet</Text>

                    <Text className="text-base leading-7 text-muted-foreground">Acesse sua conta ou cadastre-se para começar.</Text>
                </View>

                <View className="rounded-3xl border border-border bg-card p-5">
                    <Link href="/login" asChild>
                        <Pressable className="mb-3 rounded-2xl bg-primary px-5 py-4 active:opacity-80">
                            <Text className="text-center text-base font-bold text-primary-foreground">Entrar</Text>
                        </Pressable>
                    </Link>

                    <Pressable className="rounded-2xl border border-border bg-background px-5 py-4 active:opacity-80">
                        <Text className="text-center text-base font-bold text-foreground">Criar conta</Text>
                    </Pressable>
                </View>
            </View>

            <Text className="text-center text-xs leading-5 text-muted-foreground">Plataforma offline-first para continuidade comercial.</Text>
        </View>
    );
}
