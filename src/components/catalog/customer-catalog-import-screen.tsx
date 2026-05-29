import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PageHeader } from "@/src/components/ui/page-header";

type CustomerCatalogImportScreenProps = {
    hasImportedCatalog: boolean;
    productCount: number;
    onScanCatalog: () => void;
    onOpenCatalog: () => void;
    onClearCatalog: () => void;
};

export function CustomerCatalogImportScreen({ hasImportedCatalog, productCount, onScanCatalog, onOpenCatalog, onClearCatalog }: CustomerCatalogImportScreenProps) {
    const { colorScheme } = useColorScheme();

    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const whiteIcon = "#ffffff";

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-10 pt-14">
                <PageHeader eyebrow="Catálogo" title="Escanear loja" />

                <View className="rounded-3xl border border-border bg-card p-5">
                    <View className="mb-5 h-14 w-14 items-center justify-center rounded-3xl bg-muted">
                        <Ionicons name="qr-code-outline" size={26} color={iconColor} />
                    </View>

                    <Text className="text-xl font-black text-card-foreground">Receba o catálogo do vendedor</Text>

                    <Text className="mt-3 text-base leading-7 text-muted-foreground">Escaneie o QR Code da loja para carregar os produtos neste aparelho e montar o pedido.</Text>

                    <Pressable onPress={onScanCatalog} className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-90">
                        <Ionicons name="scan-outline" size={20} color={whiteIcon} />

                        <Text className="text-sm font-black uppercase tracking-[2px] text-white">Escanear catálogo</Text>
                    </Pressable>
                </View>

                {hasImportedCatalog ? (
                    <View className="mt-5 rounded-3xl border border-border bg-card p-5">
                        <View className="mb-5 h-14 w-14 items-center justify-center rounded-3xl bg-muted">
                            <Ionicons name="storefront-outline" size={26} color={iconColor} />
                        </View>

                        <Text className="text-xl font-black text-card-foreground">Catálogo carregado</Text>

                        <Text className="mt-3 text-base leading-7 text-muted-foreground">{productCount} produto(s) disponíveis temporariamente neste aparelho.</Text>

                        <View className="mt-6 flex-row gap-3">
                            <Pressable onPress={onOpenCatalog} className="h-14 flex-1 items-center justify-center rounded-2xl bg-primary active:opacity-90">
                                <Text className="text-sm font-black uppercase tracking-[2px] text-white">Ver</Text>
                            </Pressable>

                            <Pressable onPress={onClearCatalog} className="h-14 flex-1 items-center justify-center rounded-2xl border border-border bg-background active:opacity-90">
                                <Text className="text-sm font-black uppercase tracking-[2px] text-foreground">Fechar</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : null}

                <View className="mt-5 rounded-3xl border border-border bg-card p-5">
                    <Text className="text-base font-black text-card-foreground">Como funciona</Text>

                    <Text className="mt-3 text-sm leading-6 text-muted-foreground">O vendedor mostra o QR Code do catálogo. Você escaneia, consulta os produtos e pode fechar essa visualização quando terminar.</Text>
                </View>
            </View>
        </ScrollView>
    );
}
