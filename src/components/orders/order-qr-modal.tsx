import { Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { BottomSheetModal } from "@/src/components/ui/bottom-sheet-modal";
import { GeneratedOrderQr } from "@/src/hooks/use-order-flow";

type Props = {
    visible: boolean;
    orderQr: GeneratedOrderQr | null;
    onClose: () => void;
    onScanConfirmation: () => void;
};

function money(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

export function OrderQrModal({ visible, orderQr, onClose, onScanConfirmation }: Props) {
    if (!orderQr) {
        return null;
    }

    return (
        <BottomSheetModal visible={visible} eyebrow="Pedido" title="Mostrar QR ao vendedor" onClose={onClose} maxHeightClassName="max-h-[85%]">
            <View className="items-center gap-4">
                <View className="rounded-3xl border border-border bg-white p-5">
                    <QRCode value={orderQr.qrValue} size={230} />
                </View>

                <View className="w-full rounded-3xl border border-border bg-card p-4">
                    <Text className="text-center text-sm font-bold text-muted-foreground">Total do pedido</Text>

                    <Text className="mt-1 text-center text-2xl font-black text-card-foreground">{money(orderQr.totalAmount)}</Text>

                    <Text className="mt-3 text-center text-sm leading-6 text-muted-foreground">O vendedor precisa escanear este QR para confirmar a venda. Depois, escaneie a confirmação do vendedor.</Text>

                    <Pressable onPress={onScanConfirmation} className="mt-4 h-12 items-center justify-center rounded-2xl bg-primary">
                        <Text className="text-sm font-black uppercase tracking-[2px] text-white">Escanear confirmação</Text>
                    </Pressable>

                    <Pressable onPress={onClose} className="mt-3 h-12 items-center justify-center rounded-2xl border border-border bg-card">
                        <Text className="text-sm font-black uppercase tracking-[2px] text-card-foreground">Fechar sem confirmar</Text>
                    </Pressable>
                </View>
            </View>
        </BottomSheetModal>
    );
}
