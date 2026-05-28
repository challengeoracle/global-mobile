import { Pressable, Text, View } from "react-native";

import { BottomSheetModal } from "@/src/components/ui/bottom-sheet-modal";
import { CatalogProduct } from "@/src/types/sales";

type ProductDetailsModalProps = {
    visible: boolean;
    product: CatalogProduct | null;
    isSeller: boolean;
    onClose: () => void;
    onEdit: () => void;
    onAdjustStock: () => void;
    onDeactivate: () => void;
};

function money(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

export function ProductDetailsModal({ visible, product, isSeller, onClose, onEdit, onAdjustStock, onDeactivate }: ProductDetailsModalProps) {
    if (!product) return null;

    return (
        <BottomSheetModal visible={visible} eyebrow="Produto" title={product.name} onClose={onClose}>
            {product.description ? <Text className="mb-5 text-base leading-7 text-muted-foreground">{product.description}</Text> : null}

            <View className="mb-5 flex-row gap-3">
                <View className="flex-1 rounded-3xl border border-border bg-card p-4">
                    <Text className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Preço</Text>
                    <Text className="mt-2 text-xl font-black text-primary">{money(product.price)}</Text>
                </View>

                <View className="flex-1 rounded-3xl border border-border bg-card p-4">
                    <Text className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Estoque</Text>
                    <Text className="mt-2 text-xl font-black text-card-foreground">{product.stockQuantity}</Text>
                </View>
            </View>

            {isSeller ? (
                <View className="gap-3">
                    <Pressable onPress={onEdit} className="h-14 items-center justify-center rounded-2xl bg-primary active:opacity-90">
                        <Text className="text-sm font-black uppercase tracking-[2px] text-primary-foreground">Editar produto</Text>
                    </Pressable>

                    <Pressable onPress={onAdjustStock} className="h-14 items-center justify-center rounded-2xl border border-border bg-card active:opacity-90">
                        <Text className="text-sm font-black uppercase tracking-[2px] text-card-foreground">Ajustar estoque</Text>
                    </Pressable>

                    <Pressable onPress={onDeactivate} className="h-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 active:opacity-90">
                        <Text className="text-sm font-black uppercase tracking-[2px] text-red-500">Desativar produto</Text>
                    </Pressable>
                </View>
            ) : null}
        </BottomSheetModal>
    );
}
