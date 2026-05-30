import { Pressable, Text, View } from "react-native";

import { CatalogProduct } from "@/src/domains/catalog/types/catalog";
import { BottomSheetModal } from "@/src/shared/components/ui/bottom-sheet-modal";

type ProductDetailsModalProps = {
    visible: boolean;
    product: CatalogProduct | null;
    isSeller: boolean;
    onClose: () => void;
    onEdit: () => void;
    onAdjustStock: () => void;
    onDeactivate: () => void;
    onAddToCart?: (product: CatalogProduct) => void;
};

function money(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

export function ProductDetailsModal({ visible, product, isSeller, onClose, onEdit, onAdjustStock, onDeactivate, onAddToCart }: ProductDetailsModalProps) {
    if (!product) return null;

    const outOfStock = product.stockQuantity <= 0;

    return (
        <BottomSheetModal visible={visible} eyebrow="Detalhes" title={product.name} onClose={onClose} maxHeightClassName="max-h-[80%]">
            <View className="gap-4">
                {product.description ? <Text className="text-base leading-6 text-muted-foreground">{product.description}</Text> : null}

                <View className="rounded-3xl border border-border bg-card p-4">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-muted-foreground">Preço</Text>

                        <Text className="text-lg font-black text-card-foreground">{money(product.price)}</Text>
                    </View>

                    <View className="mt-3 flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-muted-foreground">Estoque</Text>

                        <Text className={`text-lg font-black ${outOfStock ? "text-red-500" : "text-card-foreground"}`}>{product.stockQuantity}</Text>
                    </View>
                </View>

                {isSeller ? (
                    <View className="gap-3">
                        <Pressable onPress={onEdit} className="h-14 items-center justify-center rounded-2xl bg-primary">
                            <Text className="text-sm font-black uppercase tracking-[2px] text-white">Editar produto</Text>
                        </Pressable>

                        <Pressable onPress={onAdjustStock} className="h-14 items-center justify-center rounded-2xl border border-border bg-card">
                            <Text className="text-sm font-black uppercase tracking-[2px] text-card-foreground">Ajustar estoque</Text>
                        </Pressable>

                        <Pressable onPress={onDeactivate} className="h-14 items-center justify-center rounded-2xl bg-red-500/10">
                            <Text className="text-sm font-black uppercase tracking-[2px] text-red-500">Desativar produto</Text>
                        </Pressable>
                    </View>
                ) : (
                    <Pressable onPress={() => onAddToCart?.(product)} disabled={outOfStock} className="h-14 items-center justify-center rounded-2xl bg-primary disabled:opacity-50">
                        <Text className="text-sm font-black uppercase tracking-[2px] text-white">{outOfStock ? "Sem estoque" : "Adicionar ao pedido"}</Text>
                    </Pressable>
                )}
            </View>
        </BottomSheetModal>
    );
}
