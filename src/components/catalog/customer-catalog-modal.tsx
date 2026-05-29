import { ScrollView, Text, View } from "react-native";

import { ProductCard } from "@/src/components/catalog/product-card";
import { BottomSheetModal } from "@/src/components/ui/bottom-sheet-modal";
import { CatalogProduct } from "@/src/types/sales";

type CustomerCatalogModalProps = {
    visible: boolean;
    products: CatalogProduct[];
    onClose: () => void;
    onProductPress: (product: CatalogProduct) => void;
};

export function CustomerCatalogModal({ visible, products, onClose, onProductPress }: CustomerCatalogModalProps) {
    return (
        <BottomSheetModal visible={visible} eyebrow="Catálogo" title="Produtos da loja" onClose={onClose} maxHeightClassName="max-h-[88%]">
            <View className="mb-4">
                <Text className="text-sm leading-6 text-muted-foreground">{products.length} produto(s) carregado(s) via QR Code.</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-3 pb-2">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} onPress={() => onProductPress(product)} />
                    ))}
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
