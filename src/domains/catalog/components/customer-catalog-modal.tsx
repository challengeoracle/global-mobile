import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { CatalogToolbar, SortDirection } from "@/src/domains/catalog/components/catalog-toolbar";
import { ProductCard } from "@/src/domains/catalog/components/product-card";
import { CatalogCategory, CatalogProduct } from "@/src/domains/catalog/types/catalog";
import { BottomSheetModal } from "@/src/shared/components/ui/bottom-sheet-modal";

type CustomerCatalogModalProps = {
    visible: boolean;
    products: CatalogProduct[];
    categories: CatalogCategory[];
    cartCount: number;
    selectedCategoryId: string | null;
    search: string;
    nameSort: SortDirection;
    priceSort: SortDirection;
    stockSort: SortDirection;
    onClose: () => void;
    onProductPress: (product: CatalogProduct) => void;
    onOpenCart: () => void;
    onSearchChange: (value: string) => void;
    onCategoryChange: (value: string | null) => void;
    onNameSortChange: (value: SortDirection) => void;
    onPriceSortChange: (value: SortDirection) => void;
    onStockSortChange: (value: SortDirection) => void;
};

export function CustomerCatalogModal({
    visible,
    products,
    categories,
    cartCount,
    selectedCategoryId,
    search,
    nameSort,
    priceSort,
    stockSort,
    onClose,
    onProductPress,
    onOpenCart,
    onSearchChange,
    onCategoryChange,
    onNameSortChange,
    onPriceSortChange,
    onStockSortChange,
}: CustomerCatalogModalProps) {
    return (
        <BottomSheetModal visible={visible} eyebrow="Catálogo" title="Escolha seus produtos" onClose={onClose} maxHeightClassName="max-h-[96%]">
            <View className="gap-4 pb-2">
                <View className="rounded-3xl border border-border bg-card p-4">
                    <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                            <Text className="text-sm font-black text-card-foreground">Monte seu pedido</Text>
                            <Text className="mt-1 text-sm leading-6 text-muted-foreground">Você pode buscar, filtrar, abrir os detalhes e seguir navegando pelo catálogo antes de finalizar.</Text>
                        </View>

                        <Pressable onPress={onOpenCart} className="h-12 min-w-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary px-4">
                            <Ionicons name="cart-outline" size={18} color="#ffffff" />
                            <Text className="text-xs font-black uppercase tracking-[1px] text-white">{cartCount > 0 ? `Pedido (${cartCount})` : "Pedido"}</Text>
                        </Pressable>
                    </View>
                </View>

                <CatalogToolbar
                    mode="customer"
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    search={search}
                    nameSort={nameSort}
                    priceSort={priceSort}
                    stockSort={stockSort}
                    isConnected={true}
                    networkLabel=""
                    refreshing={false}
                    pendingCount={0}
                    isSeller={false}
                    onSearchChange={onSearchChange}
                    onCategoryChange={onCategoryChange}
                    onNameSortChange={onNameSortChange}
                    onPriceSortChange={onPriceSortChange}
                    onStockSortChange={onStockSortChange}
                    onRefresh={() => {}}
                    onSync={() => {}}
                    onSubmitCategory={async () => {}}
                />

                <Text className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{products.length} produto(s) encontrados.</Text>

                <View className="gap-3 pb-4">
                    {products.length > 0 ? (
                        products.map((product) => <ProductCard key={product.id} product={product} onPress={() => onProductPress(product)} />)
                    ) : (
                        <View className="rounded-3xl border border-dashed border-border bg-card p-6">
                            <Text className="text-center text-base font-bold text-card-foreground">Nenhum produto encontrado</Text>
                            <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Tente limpar a busca ou escolher outra categoria.</Text>
                        </View>
                    )}
                </View>
            </View>
        </BottomSheetModal>
    );
}
