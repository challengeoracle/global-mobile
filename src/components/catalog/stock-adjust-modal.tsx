import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { BottomSheetModal } from "@/src/components/ui/bottom-sheet-modal";
import { CatalogProduct } from "@/src/types/sales";

type StockAdjustModalProps = {
    visible: boolean;
    product: CatalogProduct | null;
    onClose: () => void;
    onConfirm: (quantityDelta: number) => Promise<void>;
};

export function StockAdjustModal({ visible, product, onClose, onConfirm }: StockAdjustModalProps) {
    const [quantity, setQuantity] = useState("1");
    const [mode, setMode] = useState<"INCREASE" | "DECREASE">("DECREASE");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!visible) return;

        setQuantity("1");
        setMode("DECREASE");
        setError("");
    }, [visible]);

    if (!product) return null;

    async function handleConfirm() {
        const parsedQuantity = Number(quantity);
        const delta = mode === "INCREASE" ? parsedQuantity : -parsedQuantity;

        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            setError("Informe uma quantidade válida.");
            return;
        }
        if (!product) return null;

        if (product.stockQuantity + delta < 0) {
            setError("O estoque não pode ficar negativo.");
            return;
        }

        await onConfirm(delta);
        onClose();
    }

    return (
        <BottomSheetModal visible={visible} eyebrow="Estoque" title={product.name} onClose={onClose}>
            <Text className="mb-5 text-sm text-muted-foreground">Atual: {product.stockQuantity} unidades</Text>

            <View className="mb-5 flex-row gap-3">
                <Pressable onPress={() => setMode("DECREASE")} className={`h-14 flex-1 items-center justify-center rounded-2xl border ${mode === "DECREASE" ? "border-primary bg-primary" : "border-border bg-card"}`}>
                    <Text className={`text-sm font-black uppercase tracking-[2px] ${mode === "DECREASE" ? "text-primary-foreground" : "text-card-foreground"}`}>Diminuir</Text>
                </Pressable>

                <Pressable onPress={() => setMode("INCREASE")} className={`h-14 flex-1 items-center justify-center rounded-2xl border ${mode === "INCREASE" ? "border-primary bg-primary" : "border-border bg-card"}`}>
                    <Text className={`text-sm font-black uppercase tracking-[2px] ${mode === "INCREASE" ? "text-primary-foreground" : "text-card-foreground"}`}>Aumentar</Text>
                </Pressable>
            </View>

            <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Quantidade</Text>

            <TextInput value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="1" placeholderTextColor="rgb(var(--muted-foreground))" className="h-14 rounded-2xl border border-border bg-card px-4 text-card-foreground" />

            {error ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</Text> : null}

            <Pressable onPress={handleConfirm} className="mt-5 h-14 items-center justify-center rounded-2xl bg-primary active:opacity-90">
                <Text className="text-sm font-black uppercase tracking-[2px] text-primary-foreground">Confirmar ajuste</Text>
            </Pressable>
        </BottomSheetModal>
    );
}
