import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { CatalogProduct } from "@/src/types/sales";

type ProductCardProps = {
    product: CatalogProduct;
    onPress: () => void;
};

function money(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

export function ProductCard({ product, onPress }: ProductCardProps) {
    const outOfStock = product.stockQuantity <= 0;
    const lowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;

    return (
        <Pressable onPress={onPress} className="rounded-3xl border border-border bg-card p-5 active:opacity-90">
            <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                    <Text className="text-base font-black text-card-foreground">{product.name}</Text>

                    {product.description ? <Text className="mt-1 text-sm leading-5 text-muted-foreground">{product.description}</Text> : null}

                    <View className="mt-4 flex-row items-center gap-2">
                        <Text className="text-xl font-black text-primary">{money(product.price)}</Text>

                        {lowStock ? (
                            <View className="rounded-full bg-orange-500/10 px-2 py-1">
                                <Text className="text-[10px] font-black uppercase tracking-[1px] text-orange-500">Baixo</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View className="items-end">
                    <View className={`rounded-full px-3 py-1 ${outOfStock ? "bg-red-500/10" : "bg-primary/10"}`}>
                        <Text className={`text-xs font-black ${outOfStock ? "text-red-500" : "text-primary"}`}>{product.stockQuantity} un.</Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color="#71717a" style={{ marginTop: 16 }} />
                </View>
            </View>
        </Pressable>
    );
}
