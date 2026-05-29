import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
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
    onEditCategory?: (category: CatalogCategory) => void;
    onDeleteCategory?: (category: CatalogCategory) => void;
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

type SortButtonProps = {
    label: string;
    value: SortDirection;
    onChange: (value: SortDirection) => void;
    isText?: boolean;
    iconColor: string;
    activeIconColor: string;
};

function SortButton({ label, value, onChange, isText = false, iconColor, activeIconColor }: SortButtonProps) {
    const active = value !== "NONE";
    const displayLabel = isText && value === "DESC" ? "Z-A" : label;

    return (
        <Pressable onPress={() => onChange(nextSort(value))} className={`h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border ${active ? "border-primary bg-primary" : "border-border bg-card"}`}>
            <Text className={`text-xs font-black uppercase tracking-[0.5px] ${active ? "text-white" : "text-card-foreground"}`}>{displayLabel}</Text>

            <Ionicons name={sortIcon(value, isText)} size={13} color={active ? activeIconColor : iconColor} />
        </Pressable>
    );
}

export function CatalogToolbar({ categories, selectedCategoryId, search, nameSort, priceSort, stockSort, isConnected, networkLabel, refreshing, pendingCount, isSeller, onSearchChange, onCategoryChange, onNameSortChange, onPriceSortChange, onStockSortChange, onRefresh, onSync, onEditCategory, onDeleteCategory }: Props) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const iconColor = isDark ? "#f8fafc" : "#0f172a";
    const primaryIconColor = "#ffffff";
    const loaderColor = isDark ? "#f8fafc" : "#0f172a";
    const placeholderColor = isDark ? "#f8fafc" : "#0f172a";

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

    function handleEditCategory(category: CatalogCategory) {
        setCategoryModalVisible(false);
        onEditCategory?.(category);
    }

    function handleDeleteCategory(category: CatalogCategory) {
        setCategoryModalVisible(false);
        onDeleteCategory?.(category);
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
                        <Pressable onPress={onRefresh} disabled={!isConnected || refreshing} className="h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card disabled:opacity-40">
                            {refreshing ? <ActivityIndicator size="small" color={loaderColor} /> : <Ionicons name="refresh" size={18} color={iconColor} />}
                        </Pressable>

                        {isSeller ? (
                            <Pressable onPress={onSync} disabled={!isConnected || refreshing || pendingCount === 0} className={`h-10 flex-row items-center gap-2 rounded-2xl px-4 disabled:opacity-40 ${hasPending ? "bg-primary" : "border border-border bg-card"}`}>
                                <Ionicons name="cloud-upload-outline" size={17} color={hasPending ? primaryIconColor : iconColor} />

                                <Text className={`text-xs font-black uppercase tracking-[1px] ${hasPending ? "text-white" : "text-card-foreground"}`}>Enviar</Text>
                            </Pressable>
                        ) : null}
                    </View>
                </View>
            </View>

            <View className="h-12 flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4">
                <Ionicons name="search-outline" size={18} color={iconColor} />

                <TextInput value={search} onChangeText={onSearchChange} placeholder="Buscar produto" placeholderTextColor={placeholderColor} style={{ color: iconColor }} className="flex-1 text-base" />

                {search ? (
                    <Pressable onPress={() => onSearchChange("")}>
                        <Ionicons name="close-circle" size={18} color={iconColor} />
                    </Pressable>
                ) : null}
            </View>

            <View className="flex-row gap-1.5">
                <Pressable onPress={() => setCategoryModalVisible(true)} className="h-10 flex-[1.1] flex-row items-center justify-between rounded-2xl border border-border bg-card px-3">
                    <Text numberOfLines={1} className="flex-1 text-xs font-black uppercase tracking-[0.5px] text-card-foreground">
                        {selectedCategoryName}
                    </Text>

                    <Ionicons name="chevron-down" size={14} color={iconColor} />
                </Pressable>

                <SortButton label="A-Z" value={nameSort} onChange={onNameSortChange} isText iconColor={iconColor} activeIconColor={primaryIconColor} />

                <SortButton label="Preço" value={priceSort} onChange={onPriceSortChange} iconColor={iconColor} activeIconColor={primaryIconColor} />

                <SortButton label="Estq" value={stockSort} onChange={onStockSortChange} iconColor={iconColor} activeIconColor={primaryIconColor} />
            </View>

            <BottomSheetModal visible={categoryModalVisible} eyebrow="Filtro" title="Categoria" onClose={() => setCategoryModalVisible(false)} maxHeightClassName="max-h-[70%]">
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="gap-3">
                        <Pressable onPress={() => selectCategory(null)} className={`rounded-2xl border px-4 py-4 ${selectedCategoryId === null ? "border-primary bg-primary" : "border-border bg-card"}`}>
                            <Text className={`text-base font-black ${selectedCategoryId === null ? "text-white" : "text-card-foreground"}`}>Todas as categorias</Text>
                        </Pressable>

                        {categories.map((category) => {
                            const selected = selectedCategoryId === category.id;

                            return (
                                <View key={category.id} className={`rounded-2xl border px-4 py-4 ${selected ? "border-primary bg-primary" : "border-border bg-card"}`}>
                                    <Pressable onPress={() => selectCategory(category.id)}>
                                        <Text className={`text-base font-black ${selected ? "text-white" : "text-card-foreground"}`}>{category.name}</Text>

                                        {category.description ? <Text className={`mt-1 text-sm ${selected ? "text-white" : "text-muted-foreground"}`}>{category.description}</Text> : null}
                                    </Pressable>

                                    {isSeller ? (
                                        <View className="mt-4 flex-row gap-2">
                                            <Pressable onPress={() => handleEditCategory(category)} className={`h-9 flex-1 flex-row items-center justify-center gap-2 rounded-xl ${selected ? "bg-white/20" : "bg-muted"}`}>
                                                <Ionicons name="create-outline" size={15} color={selected ? "#ffffff" : iconColor} />

                                                <Text className={`text-xs font-black uppercase tracking-[1px] ${selected ? "text-white" : "text-card-foreground"}`}>Editar</Text>
                                            </Pressable>

                                            <Pressable onPress={() => handleDeleteCategory(category)} className={`h-9 flex-1 flex-row items-center justify-center gap-2 rounded-xl ${selected ? "bg-white/20" : "bg-red-500/10"}`}>
                                                <Ionicons name="trash-outline" size={15} color={selected ? "#ffffff" : "#ef4444"} />

                                                <Text className={`text-xs font-black uppercase tracking-[1px] ${selected ? "text-white" : "text-red-500"}`}>Excluir</Text>
                                            </Pressable>
                                        </View>
                                    ) : null}
                                </View>
                            );
                        })}

                        {categories.length === 0 ? <Text className="rounded-2xl border border-border bg-card px-4 py-4 text-center text-sm font-bold text-muted-foreground">Nenhuma categoria disponível.</Text> : null}
                    </View>
                </ScrollView>
            </BottomSheetModal>
        </View>
    );
}
