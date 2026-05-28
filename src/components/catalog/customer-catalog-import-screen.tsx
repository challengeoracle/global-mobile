import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ProductCard } from "@/src/components/catalog/product-card";
import { PageHeader } from "@/src/components/ui/page-header";
import { CatalogProduct } from "@/src/types/sales";

type CustomerCatalogImportScreenProps = {
    products: CatalogProduct[];
    onScanCatalog: () => void;
    onProductPress: (product: CatalogProduct) => void;
};

export function CustomerCatalogImportScreen({ products, onScanCatalog, onProductPress }: CustomerCatalogImportScreenProps) {
    const hasCatalog = products.length > 0;

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-10 pt-14">
                <PageHeader eyebrow="Catálogo" title={hasCatalog ? "Loja importada" : "Escanear loja"} />

                <View className="mb-5 rounded-3xl border border-border bg-card p-5">
                    <View className="mb-5 h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                        <Ionicons name={hasCatalog ? "storefront-outline" : "qr-code-outline"} size={26} color="rgb(var(--primary))" />
                    </View>

                    <Text className="text-xl font-black text-card-foreground">{hasCatalog ? "Catálogo carregado" : "Receba o catálogo do vendedor"}</Text>

                    <Text className="mt-3 text-base leading-7 text-muted-foreground">{hasCatalog ? `${products.length} produto(s) disponíveis neste aparelho. Você pode montar o pedido mesmo sem internet.` : "Escaneie o QR Code da loja para carregar os produtos neste aparelho."}</Text>

                    <Pressable onPress={onScanCatalog} className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-90">
                        <Ionicons name="scan-outline" size={20} color="#fff" />

                        <Text className="text-sm font-black uppercase tracking-[2px] text-primary-foreground">{hasCatalog ? "Escanear outro" : "Escanear catálogo"}</Text>
                    </Pressable>
                </View>

                {hasCatalog ? (
                    <View className="gap-3">
                        <View className="mb-1">
                            <Text className="text-lg font-black text-foreground">Produtos</Text>
                            <Text className="mt-1 text-sm text-muted-foreground">Catálogo recebido via QR Code</Text>
                        </View>

                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} onPress={() => onProductPress(product)} />
                        ))}
                    </View>
                ) : (
                    <View className="rounded-3xl border border-border bg-card p-5">
                        <Text className="text-base font-black text-card-foreground">Como funciona</Text>

                        <Text className="mt-3 text-sm leading-6 text-muted-foreground">O vendedor mostra o QR Code do catálogo. Você escaneia, os produtos ficam salvos localmente e depois monta o pedido.</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
