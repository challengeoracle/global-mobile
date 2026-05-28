import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { BottomSheetModal } from "@/src/components/ui/bottom-sheet-modal";
import { CatalogCategory, CatalogProduct } from "@/src/types/sales";

export type ProductFormValues = {
    categoryId: string;
    name: string;
    description: string;
    price: string;
    stockQuantity: string;
};

type ProductFormModalProps = {
    visible: boolean;
    mode: "create" | "edit";
    categories: CatalogCategory[];
    initialCategoryId: string;
    initialProduct?: CatalogProduct | null;
    onClose: () => void;
    onSubmit: (values: ProductFormValues) => Promise<void>;
};

export function ProductFormModal({ visible, mode, categories, initialCategoryId, initialProduct, onClose, onSubmit }: ProductFormModalProps) {
    const [categoryId, setCategoryId] = useState(initialCategoryId);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [stockQuantity, setStockQuantity] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!visible) return;

        setCategoryId(initialCategoryId);
        setName(initialProduct?.name ?? "");
        setDescription(initialProduct?.description ?? "");
        setPrice(initialProduct ? String(initialProduct.price) : "");
        setStockQuantity(initialProduct ? String(initialProduct.stockQuantity) : "");
        setError("");
    }, [visible, initialCategoryId, initialProduct]);

    async function handleSubmit() {
        try {
            setLoading(true);
            setError("");

            const parsedPrice = Number(price.replace(",", "."));
            const parsedStock = Number(stockQuantity);

            if (!categoryId) return setError("Selecione uma categoria.");
            if (!name.trim()) return setError("Informe o nome do produto.");
            if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return setError("Informe um preço válido.");
            if (!Number.isFinite(parsedStock) || parsedStock < 0) return setError("Informe um estoque válido.");

            await onSubmit({
                categoryId,
                name: name.trim(),
                description: description.trim(),
                price: String(parsedPrice),
                stockQuantity: String(parsedStock),
            });

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao salvar produto.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <BottomSheetModal visible={visible} eyebrow={mode === "create" ? "Novo item" : "Editar item"} title="Produto" onClose={onClose} maxHeightClassName="max-h-[88%]">
            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="mb-5">
                    <Text className="mb-3 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Categoria</Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                            {categories.map((category) => {
                                const selected = category.id === categoryId;

                                return (
                                    <Pressable key={category.id} onPress={() => setCategoryId(category.id)} className={`rounded-full border px-4 py-2 ${selected ? "border-primary bg-primary" : "border-border bg-card"}`}>
                                        <Text className={`text-xs font-black uppercase tracking-[1px] ${selected ? "text-primary-foreground" : "text-card-foreground"}`}>{category.name}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>

                <View className="gap-4">
                    <View>
                        <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Nome</Text>
                        <TextInput value={name} onChangeText={setName} placeholder="Ex: Arroz 5kg" placeholderTextColor="rgb(var(--muted-foreground))" className="h-14 rounded-2xl border border-border bg-card px-4 text-base text-card-foreground" />
                    </View>

                    <View>
                        <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Descrição</Text>
                        <TextInput value={description} onChangeText={setDescription} placeholder="Descrição curta" placeholderTextColor="rgb(var(--muted-foreground))" className="h-14 rounded-2xl border border-border bg-card px-4 text-base text-card-foreground" />
                    </View>

                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Preço</Text>
                            <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="8.90" placeholderTextColor="rgb(var(--muted-foreground))" className="h-14 rounded-2xl border border-border bg-card px-4 text-base text-card-foreground" />
                        </View>

                        <View className="flex-1">
                            <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Estoque</Text>
                            <TextInput value={stockQuantity} onChangeText={setStockQuantity} keyboardType="numeric" placeholder="20" placeholderTextColor="rgb(var(--muted-foreground))" className="h-14 rounded-2xl border border-border bg-card px-4 text-base text-card-foreground" />
                        </View>
                    </View>

                    {error ? <Text className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</Text> : null}

                    <Pressable onPress={handleSubmit} disabled={loading} className="mb-2 mt-2 h-14 items-center justify-center rounded-2xl bg-primary disabled:opacity-60">
                        {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-sm font-black uppercase tracking-[2px] text-primary-foreground">Salvar produto</Text>}
                    </Pressable>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
