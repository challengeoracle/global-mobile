import { Link } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
    return (
        <View className="flex-1 bg-background px-6 pb-10 pt-16">
            <View className="flex-1 justify-center">
                <View className="mb-10">
                    <Text className="mb-2 text-sm font-semibold uppercase tracking-[3px] text-primary">SIGNAL</Text>

                    <Text className="mb-4 text-4xl font-bold text-foreground">Entrar</Text>

                    <Text className="text-base leading-7 text-muted-foreground">Acesse o app com suas credenciais de acesso.</Text>
                </View>

                <View className="rounded-3xl border border-border bg-card p-5">
                    <View className="mb-4">
                        <Text className="mb-2 text-sm font-semibold text-card-foreground">Email</Text>

                        <TextInput placeholder="vendedor@signal.com" placeholderTextColor="#71717a" keyboardType="email-address" autoCapitalize="none" className="rounded-2xl border border-border bg-background px-4 py-4 text-foreground" />
                    </View>

                    <View className="mb-3">
                        <Text className="mb-2 text-sm font-semibold text-card-foreground">Senha</Text>

                        <TextInput placeholder="Digite sua senha" placeholderTextColor="#71717a" secureTextEntry className="rounded-2xl border border-border bg-background px-4 py-4 text-foreground" />
                    </View>

                    <Pressable className="mb-6 self-end active:opacity-80">
                        <Text className="text-sm font-semibold text-primary">Esqueci minha senha</Text>
                    </Pressable>

                    <Link href="/home" asChild>
                        <Pressable className="rounded-2xl bg-primary px-5 py-4 active:opacity-80">
                            <Text className="text-center text-base font-bold text-primary-foreground">Entrar no painel</Text>
                        </Pressable>
                    </Link>
                </View>

                <Link href="/" asChild>
                    <Pressable className="mt-4 rounded-2xl border border-border bg-background px-5 py-4 active:opacity-80">
                        <Text className="text-center text-base font-bold text-foreground">Voltar</Text>
                    </Pressable>
                </Link>
            </View>

            <Text className="text-center text-xs leading-5 text-muted-foreground">Login visual para MVP. Sem autenticação real nesta etapa.</Text>
        </View>
    );
}
