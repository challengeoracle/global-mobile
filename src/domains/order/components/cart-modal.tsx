import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { CartItem } from "@/src/domains/order/hooks/use-order-flow";
import { BottomSheetModal } from "@/src/shared/components/ui/bottom-sheet-modal";

type Props = {
    visible: boolean;
    items: CartItem[];
    totalAmount: number;
    syncing: boolean;
    message?: string;
    onClose: () => void;
    onRemove: (productId: string) => void;
    onQuantityChange: (productId: string, quantity: number) => void;
    onCheckout: () => void;
    onContinueShopping?: () => void;
};

function money(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

export function CartModal({ visible, items, totalAmount, syncing, message, onClose, onRemove, onQuantityChange, onCheckout, onContinueShopping }: Props) {
    const { colorScheme } = useColorScheme();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";

    return (
        <BottomSheetModal visible={visible} eyebrow="Pedido" title="Seu pedido" onClose={onClose} maxHeightClassName="max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-3">
                    {items.length === 0 ? (
                        <View className="rounded-3xl border border-dashed border-border bg-card p-6">
                            <Text className="text-center text-base font-bold text-card-foreground">Carrinho vazio</Text>
                            <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Adicione produtos do catálogo para montar o pedido.</Text>
                        </View>
                    ) : null}

                    {items.map((item) => (
                        <View key={item.product.id} className="rounded-3xl border border-border bg-card p-4">
                            <View className="flex-row justify-between gap-3">
                                <View className="flex-1">
                                    <Text className="text-base font-black text-card-foreground">{item.product.name}</Text>
                                    <Text className="mt-1 text-sm text-muted-foreground">{money(item.product.price)} cada</Text>
                                </View>

                                <Pressable onPress={() => onRemove(item.product.id)}>
                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                </Pressable>
                            </View>

                            <View className="mt-4 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-3">
                                    <Pressable onPress={() => onQuantityChange(item.product.id, item.quantity - 1)} className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
                                        <Ionicons name="remove" size={16} color={iconColor} />
                                    </Pressable>

                                    <Text className="min-w-8 text-center text-base font-black text-card-foreground">{item.quantity}</Text>

                                    <Pressable onPress={() => onQuantityChange(item.product.id, item.quantity + 1)} className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
                                        <Ionicons name="add" size={16} color={iconColor} />
                                    </Pressable>
                                </View>

                                <Text className="text-base font-black text-card-foreground">{money(item.product.price * item.quantity)}</Text>
                            </View>
                        </View>
                    ))}

                    {message ? <Text className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{message}</Text> : null}

                    <View className="mt-2 rounded-3xl border border-border bg-card p-4">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-sm font-bold text-muted-foreground">Total</Text>
                            <Text className="text-xl font-black text-card-foreground">{money(totalAmount)}</Text>
                        </View>

                        <Text className="mt-3 text-sm leading-6 text-muted-foreground">Quando terminar, gere o QR Code para o vendedor confirmar a venda. Se quiser, você pode voltar ao catálogo e seguir montando o pedido.</Text>

                        <View className="mt-4 gap-3">
                            {onContinueShopping ? (
                                <Pressable onPress={onContinueShopping} className="h-12 items-center justify-center rounded-2xl border border-border bg-card">
                                    <Text className="text-sm font-black uppercase tracking-[2px] text-card-foreground">Voltar ao catálogo</Text>
                                </Pressable>
                            ) : null}

                            <Pressable onPress={onCheckout} disabled={syncing || items.length === 0} className="h-14 items-center justify-center rounded-2xl bg-primary disabled:opacity-50">
                                {syncing ? <ActivityIndicator color="#ffffff" /> : <Text className="text-sm font-black uppercase tracking-[2px] text-white">Gerar QR para vendedor</Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
