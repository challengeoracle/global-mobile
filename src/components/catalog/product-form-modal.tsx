import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useEffect, useMemo, useState } from "react";
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
    const { colorScheme } = useColorScheme();

    const inputColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const placeholderColor = colorScheme === "dark" ? "#94a3b8" : "#64748b";
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";

    const [categoryModalVisible, setCategoryModalVisible] = useState(false);

    const [categoryId, setCategoryId] = useState(initialCategoryId);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [stockQuantity, setStockQuantity] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const selectedCategory = useMemo(() => {
        return categories.find((category) => category.id === categoryId) ?? null;
    }, [categories, categoryId]);

    useEffect(() => {
        if (!visible) return;

        const fallbackCategoryId = initialCategoryId || categories[0]?.id || "";

        setCategoryId(fallbackCategoryId);
        setName(initialProduct?.name ?? "");
        setDescription(initialProduct?.description ?? "");
        setPrice(initialProduct ? String(initialProduct.price) : "");
        setStockQuantity(initialProduct ? String(initialProduct.stockQuantity) : "");
        setError("");
    }, [visible, initialCategoryId, initialProduct, categories]);

    function selectCategory(id: string) {
        setCategoryId(id);
        setCategoryModalVisible(false);
    }

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
        <>
            <BottomSheetModal visible={visible} eyebrow={mode === "create" ? "Novo item" : "Editar item"} title="Produto" onClose={onClose} maxHeightClassName="max-h-[88%]">
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="gap-4">
                        <View>
                            <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Categoria</Text>

                            <Pressable onPress={() => setCategoryModalVisible(true)} className="h-14 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4">
                                <Text numberOfLines={1} className={`flex-1 text-base font-bold ${selectedCategory ? "text-card-foreground" : "text-muted-foreground"}`}>
                                    {selectedCategory?.name ?? "Selecionar categoria"}
                                </Text>

                                <Ionicons name="chevron-down" size={18} color={iconColor} />
                            </Pressable>
                        </View>

                        <View>
                            <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Nome</Text>

                            <TextInput value={name} onChangeText={setName} placeholder="Ex: Carrinho de brinquedo" placeholderTextColor={placeholderColor} style={{ color: inputColor }} className="h-14 rounded-2xl border border-border bg-card px-4 text-base" />
                        </View>

                        <View>
                            <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Descrição</Text>

                            <TextInput value={description} onChangeText={setDescription} placeholder="Descrição curta" placeholderTextColor={placeholderColor} style={{ color: inputColor }} className="h-14 rounded-2xl border border-border bg-card px-4 text-base" />
                        </View>

                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Preço</Text>

                                <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="19.90" placeholderTextColor={placeholderColor} style={{ color: inputColor }} className="h-14 rounded-2xl border border-border bg-card px-4 text-base" />
                            </View>

                            <View className="flex-1">
                                <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Estoque</Text>

                                <TextInput value={stockQuantity} onChangeText={setStockQuantity} keyboardType="numeric" placeholder="10" placeholderTextColor={placeholderColor} style={{ color: inputColor }} className="h-14 rounded-2xl border border-border bg-card px-4 text-base" />
                            </View>
                        </View>

                        {error ? <Text className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</Text> : null}

                        <Pressable onPress={handleSubmit} disabled={loading} className="mb-2 mt-2 h-14 items-center justify-center rounded-2xl bg-primary disabled:opacity-60">
                            {loading ? <ActivityIndicator color="#ffffff" /> : <Text className="text-sm font-black uppercase tracking-[2px] text-white">Salvar produto</Text>}
                        </Pressable>
                    </View>
                </ScrollView>
            </BottomSheetModal>

            <BottomSheetModal visible={categoryModalVisible} eyebrow="Selecionar" title="Categoria" onClose={() => setCategoryModalVisible(false)} maxHeightClassName="max-h-[70%]">
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="gap-3">
                        {categories.map((category) => {
                            const selected = category.id === categoryId;

                            return (
                                <Pressable key={category.id} onPress={() => selectCategory(category.id)} className={`rounded-2xl border px-4 py-4 ${selected ? "border-primary bg-primary" : "border-border bg-card"}`}>
                                    <Text className={`text-base font-black ${selected ? "text-white" : "text-card-foreground"}`}>{category.name}</Text>

                                    {category.description ? <Text className={`mt-1 text-sm ${selected ? "text-white" : "text-muted-foreground"}`}>{category.description}</Text> : null}
                                </Pressable>
                            );
                        })}

                        {categories.length === 0 ? <Text className="rounded-2xl border border-border bg-card px-4 py-4 text-center text-sm font-bold text-muted-foreground">Nenhuma categoria disponível.</Text> : null}
                    </View>
                </ScrollView>
            </BottomSheetModal>
        </>
    );
}
