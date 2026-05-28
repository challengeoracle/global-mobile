import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { BottomSheetModal } from "@/src/components/ui/bottom-sheet-modal";
import { CatalogCategory } from "@/src/types/sales";

export type SortDirection = "NONE" | "ASC" | "DESC";

type Props = {
    categories: CatalogCategory[];
    selectedCategoryId: string | null;
    search: string;
    nameSort: SortDirection;
    priceSort: SortDirection;
    stockSort: SortDirection;
    isConnected: boolean;
    networkLabel: string;
    refreshing: boolean;
    pendingCount: number;
    isSeller: boolean;
    onSearchChange: (value: string) => void;
    onCategoryChange: (value: string | null) => void;
    onNameSortChange: (value: SortDirection) => void;
    onPriceSortChange: (value: SortDirection) => void;
    onStockSortChange: (value: SortDirection) => void;
    onRefresh: () => void;
    onSync: () => void;
};

function nextSort(value: SortDirection): SortDirection {
    if (value === "NONE") return "ASC";
    if (value === "ASC") return "DESC";
    return "NONE";
}

function sortIcon(value: SortDirection, isText = false) {
    if (isText) {
        if (value === "ASC") return "trending-up";
        if (value === "DESC") return "trending-down";
        return "text";
    }

    if (value === "ASC") return "arrow-up";
    if (value === "DESC") return "arrow-down";
    return "remove";
}

function syncText(isConnected: boolean, pendingCount: number) {
    if (!isConnected && pendingCount > 0) return `${pendingCount} alteração(ões) salvas`;
    if (!isConnected) return "Catálogo offline";
    if (pendingCount > 0) return `${pendingCount} alteração(ões) para enviar`;
    return "Sem pendências";
}

function SortButton({ label, value, onChange, isText = false }: { label: string; value: SortDirection; onChange: (value: SortDirection) => void; isText?: boolean }) {
    const active = value !== "NONE";
    const displayLabel = isText && value === "DESC" ? "Z-A" : label;

    return (
        <Pressable onPress={() => onChange(nextSort(value))} className={`h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border ${active ? "border-primary bg-primary" : "border-border bg-card"}`}>
            <Text className={`text-xs font-black uppercase tracking-[0.5px] ${active ? "text-primary-foreground" : "text-card-foreground"}`}>{displayLabel}</Text>
            <Ionicons name={sortIcon(value, isText)} size={13} color={active ? "#fff" : "#71717a"} />
        </Pressable>
    );
}

export function CatalogToolbar({ categories, selectedCategoryId, search, nameSort, priceSort, stockSort, isConnected, networkLabel, refreshing, pendingCount, isSeller, onSearchChange, onCategoryChange, onNameSortChange, onPriceSortChange, onStockSortChange, onRefresh, onSync }: Props) {
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);

    const hasPending = pendingCount > 0;

    const selectedCategoryName = useMemo(() => {
        if (!selectedCategoryId) return "Categorias";
        return categories.find((category) => category.id === selectedCategoryId)?.name ?? "Categoria";
    }, [categories, selectedCategoryId]);

    function selectCategory(categoryId: string | null) {
        onCategoryChange(categoryId);
        setCategoryModalVisible(false);
    }

    return (
        <View className="mb-5 gap-3">
            <View className="rounded-3xl border border-border bg-card p-4">
                <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                            <View className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-primary" : "bg-red-500"}`} />
                            <Text className="text-sm font-black text-card-foreground">{networkLabel}</Text>
                        </View>
                        <Text className={`mt-1 text-xs font-bold ${hasPending ? "text-primary" : "text-muted-foreground"}`}>{syncText(isConnected, pendingCount)}</Text>
                    </View>

                    <View className="flex-row gap-2">
                        <Pressable onPress={onRefresh} disabled={!isConnected || refreshing} className="h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background disabled:opacity-40">
                            {refreshing ? <ActivityIndicator size="small" color="rgb(var(--foreground))" /> : <Ionicons name="refresh" size={18} color="rgb(var(--foreground))" />}
                        </Pressable>

                        {isSeller ? (
                            <Pressable onPress={onSync} disabled={!isConnected || refreshing || pendingCount === 0} className={`h-10 flex-row items-center gap-2 rounded-2xl px-4 disabled:opacity-40 ${hasPending ? "bg-primary" : "bg-muted"}`}>
                                <Ionicons name="cloud-upload-outline" size={17} color={hasPending ? "#fff" : "#71717a"} />
                                <Text className={`text-xs font-black uppercase tracking-[1px] ${hasPending ? "text-primary-foreground" : "text-muted-foreground"}`}>Enviar</Text>
                            </Pressable>
                        ) : null}
                    </View>
                </View>
            </View>

            <View className="h-12 flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4">
                <Ionicons name="search-outline" size={18} color="#71717a" />
                <TextInput value={search} onChangeText={onSearchChange} placeholder="Buscar produto" placeholderTextColor="rgb(var(--muted-foreground))" className="flex-1 text-base text-card-foreground" />
                {search ? (
                    <Pressable onPress={() => onSearchChange("")}>
                        <Ionicons name="close-circle" size={18} color="#71717a" />
                    </Pressable>
                ) : null}
            </View>

            <View className="flex-row gap-1.5">
                <Pressable onPress={() => setCategoryModalVisible(true)} className="h-10 flex-[1.1] flex-row items-center justify-between rounded-2xl border border-border bg-card px-3">
                    <Text numberOfLines={1} className="flex-1 text-xs font-black uppercase tracking-[0.5px] text-card-foreground">
                        {selectedCategoryName}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#71717a" />
                </Pressable>

                <SortButton label="A-Z" value={nameSort} onChange={onNameSortChange} isText={true} />
                <SortButton label="Preço" value={priceSort} onChange={onPriceSortChange} />
                <SortButton label="Estq" value={stockSort} onChange={onStockSortChange} />
            </View>

            <BottomSheetModal visible={categoryModalVisible} eyebrow="Filtro" title="Categoria" onClose={() => setCategoryModalVisible(false)} maxHeightClassName="max-h-[70%]">
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="gap-3">
                        <Pressable onPress={() => selectCategory(null)} className={`rounded-2xl border px-4 py-4 ${selectedCategoryId === null ? "border-primary bg-primary" : "border-border bg-card"}`}>
                            <Text className={`text-base font-black ${selectedCategoryId === null ? "text-primary-foreground" : "text-card-foreground"}`}>Todas as categorias</Text>
                        </Pressable>

                        {categories.map((category) => {
                            const selected = selectedCategoryId === category.id;
                            return (
                                <Pressable key={category.id} onPress={() => selectCategory(category.id)} className={`rounded-2xl border px-4 py-4 ${selected ? "border-primary bg-primary" : "border-border bg-card"}`}>
                                    <Text className={`text-base font-black ${selected ? "text-primary-foreground" : "text-card-foreground"}`}>{category.name}</Text>
                                    {category.description ? <Text className={`mt-1 text-sm ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{category.description}</Text> : null}
                                </Pressable>
                            );
                        })}
                    </View>
                </ScrollView>
            </BottomSheetModal>
        </View>
    );
}
