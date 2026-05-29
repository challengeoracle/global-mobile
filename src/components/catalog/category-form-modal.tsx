import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { BottomSheetModal } from "@/src/components/ui/bottom-sheet-modal";
import { CatalogCategory } from "@/src/types/sales";

export type CategoryFormValues = {
    name: string;
    description: string;
};

type Props = {
    visible: boolean;
    mode: "create" | "edit";
    initialCategory?: CatalogCategory | null;
    onClose: () => void;
    onSubmit: (values: CategoryFormValues) => Promise<void>;
};

export function CategoryFormModal({ visible, mode, initialCategory, onClose, onSubmit }: Props) {
    const { colorScheme } = useColorScheme();

    const inputColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const placeholderColor = colorScheme === "dark" ? "#94a3b8" : "#64748b";

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!visible) return;

        setName(initialCategory?.name ?? "");
        setDescription(initialCategory?.description ?? "");
        setError("");
    }, [visible, initialCategory]);

    async function handleSubmit() {
        try {
            setLoading(true);
            setError("");

            if (!name.trim()) {
                setError("Informe o nome da categoria.");
                return;
            }

            await onSubmit({
                name: name.trim(),
                description: description.trim(),
            });

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao salvar categoria.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <BottomSheetModal visible={visible} eyebrow={mode === "create" ? "Nova categoria" : "Editar categoria"} title="Categoria" onClose={onClose} maxHeightClassName="max-h-[80%]">
            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-4">
                    <View>
                        <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Nome</Text>

                        <TextInput value={name} onChangeText={setName} placeholder="Ex: Bebidas" placeholderTextColor={placeholderColor} style={{ color: inputColor }} className="h-14 rounded-2xl border border-border bg-card px-4 text-base" />
                    </View>

                    <View>
                        <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Descrição</Text>

                        <TextInput value={description} onChangeText={setDescription} placeholder="Descrição curta" placeholderTextColor={placeholderColor} style={{ color: inputColor }} className="h-14 rounded-2xl border border-border bg-card px-4 text-base" />
                    </View>

                    {error ? <Text className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</Text> : null}

                    <Pressable onPress={handleSubmit} disabled={loading} className="mb-2 mt-2 h-14 items-center justify-center rounded-2xl bg-primary disabled:opacity-60">
                        {loading ? <ActivityIndicator color="#ffffff" /> : <Text className="text-sm font-black uppercase tracking-[2px] text-white">Salvar categoria</Text>}
                    </Pressable>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
