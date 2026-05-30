import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ProductCard } from "@/src/domains/catalog/components/product-card";
import { CatalogProduct } from "@/src/domains/catalog/types/catalog";
import { BottomSheetModal } from "@/src/shared/components/ui/bottom-sheet-modal";

type CustomerCatalogModalProps = {
    visible: boolean;
    products: CatalogProduct[];
    cartCount: number;
    onClose: () => void;
    onProductPress: (product: CatalogProduct) => void;
    onOpenCart: () => void;
};

export function CustomerCatalogModal({ visible, products, cartCount, onClose, onProductPress, onOpenCart }: CustomerCatalogModalProps) {
    return (
        <BottomSheetModal visible={visible} eyebrow="Catálogo importado" title="Produtos disponíveis" onClose={onClose} maxHeightClassName="max-h-[88%]">
            <View className="mb-4 gap-3">
                <View className="rounded-3xl border border-border bg-card p-4">
                    <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                            <Text className="text-sm font-black text-card-foreground">Monte o pedido no seu ritmo</Text>
                            <Text className="mt-1 text-sm leading-6 text-muted-foreground">Toque em um item para ver detalhes, adicionar ao pedido e continuar navegando pelo catálogo.</Text>
                        </View>

                        <Pressable onPress={onOpenCart} className="h-12 min-w-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary px-4">
                            <Ionicons name="cart-outline" size={18} color="#ffffff" />
                            <Text className="text-xs font-black uppercase tracking-[1px] text-white">{cartCount > 0 ? `Pedido (${cartCount})` : "Pedido"}</Text>
                        </Pressable>
                    </View>
                </View>

                <Text className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{products.length} produto(s) carregado(s) via QR Code.</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-3">
                    {products.length > 0 ? (
                        products.map((product) => <ProductCard key={product.id} product={product} onPress={() => onProductPress(product)} />)
                    ) : (
                        <View className="rounded-3xl border border-dashed border-border bg-card p-6">
                            <Text className="text-center text-base font-bold text-card-foreground">Nenhum produto encontrado</Text>
                            <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Escaneie um QR Code de catálogo para visualizar produtos.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
