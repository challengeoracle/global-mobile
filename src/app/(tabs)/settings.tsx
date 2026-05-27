import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useColorScheme } from "nativewind";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function SettingsScreen() {
    const { colorScheme, toggleColorScheme } = useColorScheme();

    const isDark = colorScheme === "dark";

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="px-6 pb-10 pt-14">
                <View className="mb-8">
                    <Text className="mb-2 text-sm font-semibold uppercase tracking-[3px] text-primary">Configurações</Text>

                    <Text className="text-4xl font-bold text-foreground">Preferências</Text>
                </View>

                <View className="mb-6 rounded-3xl border border-border bg-card">
                    <Pressable onPress={toggleColorScheme} className="flex-row items-center justify-between px-5 py-5 active:opacity-80">
                        <View className="flex-row items-center gap-4">
                            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                                <Ionicons name={isDark ? "moon" : "sunny"} size={21} color={isDark ? "#60a5fa" : "#2563eb"} />
                            </View>

                            <View>
                                <Text className="text-base font-bold text-card-foreground">Tema</Text>

                                <Text className="mt-1 text-sm text-muted-foreground">{isDark ? "Escuro" : "Claro"}</Text>
                            </View>
                        </View>

                        <Ionicons name="chevron-forward" size={18} color="#71717a" />
                    </Pressable>

                    <View className="mx-5 h-px bg-border" />

                    <View className="flex-row items-center justify-between px-5 py-5">
                        <View className="flex-row items-center gap-4">
                            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                                <Ionicons name="cloud-upload-outline" size={21} color="#60a5fa" />
                            </View>

                            <View>
                                <Text className="text-base font-bold text-card-foreground">Envio de vendas</Text>

                                <Text className="mt-1 text-sm text-muted-foreground">Enviar vendas pendentes</Text>
                            </View>
                        </View>

                        <Text className="text-sm font-bold text-primary">2</Text>
                    </View>
                </View>

                <View className="rounded-3xl border border-border bg-card">
                    <Link href="/" asChild>
                        <Pressable className="flex-row items-center justify-between px-5 py-5 active:opacity-80">
                            <View className="flex-row items-center gap-4">
                                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                                    <Ionicons name="log-out-outline" size={21} color="#ef4444" />
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-card-foreground">Sair da conta</Text>

                                    <Text className="mt-1 text-sm text-muted-foreground">Voltar para o acesso</Text>
                                </View>
                            </View>

                            <Ionicons name="chevron-forward" size={18} color="#71717a" />
                        </Pressable>
                    </Link>
                </View>

                <Text className="mt-8 text-center text-xs leading-5 text-muted-foreground">SINAL mantém sua operação preparada para vender mesmo sem conexão.</Text>
            </View>
        </ScrollView>
    );
}
