import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, Text, View, Pressable } from "react-native";

import { PageHeader } from "@/src/shared/components/ui/page-header";

const COLOR_RED = "#dc2626";
const COLOR_GREEN = "#22c55e";
const COLOR_ORANGE = "#f97316";
const COLOR_PURPLE = "#7c3aed";

export default function ExploreScreen() {
    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-10 pt-14">
                <Pressable onPress={() => router.push("/(tabs)/settings")} className="mb-6 h-11 w-11 items-center justify-center rounded-2xl bg-card">
                    <Ionicons name="arrow-back" size={20} color="#f8fafc" />
                </Pressable>

                <PageHeader eyebrow="Operação" title="Como funciona" description="O OffPay mantém pedidos e pagamentos organizados mesmo quando cliente, vendedor ou ambos ficam sem internet." />

                <View className="mb-6 rounded-3xl border border-border bg-card p-5">
                    <View className="mb-4 flex-row items-center gap-3">
                        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                            <Ionicons name="alert-circle-outline" size={22} color={COLOR_RED} />
                        </View>

                        <Text className="flex-1 text-lg font-black text-card-foreground">Pagamento offline não é pagamento confirmado</Text>
                    </View>

                    <Text className="text-center text-base leading-7 text-muted-foreground">Quando não há conexão, o app não confirma dinheiro recebido nem pagamento realizado. Ele cria uma operação pendente, salva as evidências no dispositivo e conclui tudo quando a rede voltar.</Text>
                </View>

                <View className="mb-6 rounded-3xl border border-border bg-card p-5">
                    <Text className="mb-4 text-lg font-black text-card-foreground">Operação offline-first</Text>

                    <View className="gap-3">
                        <StepItem number="1" title="Salvar local" description="Pedidos, catálogo e vendas entram primeiro no banco local do aparelho." />
                        <StepItem number="2" title="Uso local" description="Com a rede indisponível, o app continua criando pedidos, QR Codes e registros pendentes." />
                        <StepItem number="3" title="Sincronização" description="Quando a conexão retorna, o backend valida os dados e conclui ou rejeita a operação." />
                    </View>
                </View>

                <View className="mb-6 rounded-3xl border border-border bg-card p-5">
                    <Text className="mb-4 text-lg font-black text-card-foreground">Cenários de conexão</Text>

                    <View className="gap-3">
                        <FlowCard icon="wifi-outline" color={COLOR_GREEN} title="Cliente online + vendedor online" description="Fluxo normal. Pedido, pagamento, validação e atualização da carteira acontecem na hora." />
                        <FlowCard icon="cloud-offline-outline" color={COLOR_RED} title="Cliente offline + vendedor offline" description="O pedido e a venda ficam pendentes. Ninguém paga nem recebe na hora. Tudo será validado quando a conexão voltar." />
                        <FlowCard icon="phone-portrait-outline" color={COLOR_PURPLE} title="Cliente online + vendedor offline" description="O cliente pode pagar online. O vendedor salva a venda localmente e sincroniza depois para confirmar o recebimento." />
                        <FlowCard icon="qr-code-outline" color={COLOR_ORANGE} title="Cliente offline + vendedor online" description="O vendedor registra a venda no backend, mas o pagamento pode ficar pendente até o cliente recuperar conexão." />
                    </View>
                </View>

                <View className="rounded-3xl border border-border bg-card p-5">
                    <Text className="mb-3 text-lg font-black text-card-foreground">Regra principal</Text>
                    <Text className="text-justify text-base leading-7 text-muted-foreground">O OffPay evita que a venda seja perdida por falta de internet. A operação pode nascer offline, mas só é finalizada depois da sincronização e validação dos serviços centrais.</Text>
                </View>
            </View>
        </ScrollView>
    );
}

function StepItem({ number, title, description }: { number: string; title: string; description: string }) {
    return (
        <View className="flex-row gap-3 rounded-2xl border border-border bg-background p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <Text className="text-sm font-black text-primary-foreground">{number}</Text>
            </View>

            <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">{title}</Text>
                <Text className="mt-1 text-justify text-xs leading-5 text-muted-foreground">{description}</Text>
            </View>
        </View>
    );
}

function FlowCard({ icon, color, title, description }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; description: string }) {
    return (
        <View className="rounded-2xl border border-border bg-background p-4">
            <View className="mb-3 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                    <Ionicons name={icon} size={20} color={color} />
                </View>

                <Text className="flex-1 text-sm font-black text-foreground">{title}</Text>
            </View>

            <Text className="text-justify text-xs leading-5 text-muted-foreground">{description}</Text>
        </View>
    );
}
