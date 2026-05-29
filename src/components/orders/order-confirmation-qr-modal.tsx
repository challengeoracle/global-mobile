import { Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { BottomSheetModal } from "@/src/components/ui/bottom-sheet-modal";

type Props = {
    visible: boolean;
    qrValue: string | null;
    synced: boolean;
    onClose: () => void;
};

export function OrderConfirmationQrModal({ visible, qrValue, synced, onClose }: Props) {
    if (!qrValue) {
        return null;
    }

    return (
        <BottomSheetModal visible={visible} eyebrow="Confirmação" title="Mostrar ao cliente" onClose={onClose} maxHeightClassName="max-h-[85%]">
            <View className="items-center gap-4">
                <View className="rounded-3xl border border-border bg-white p-5">
                    <QRCode value={qrValue} size={230} />
                </View>

                <View className="w-full rounded-3xl border border-border bg-card p-4">
                    <Text className="text-center text-base font-black text-card-foreground">Pedido confirmado</Text>

                    <Text className="mt-3 text-center text-sm leading-6 text-muted-foreground">Peça para o cliente escanear este QR para fechar a tela dele e salvar o pedido confirmado no histórico.</Text>

                    <Text className="mt-3 text-center text-sm font-bold text-muted-foreground">{synced ? "Pedido sincronizado com o servidor." : "Pedido salvo offline para sincronizar depois."}</Text>

                    <Pressable onPress={onClose} className="mt-4 h-12 items-center justify-center rounded-2xl bg-primary">
                        <Text className="text-sm font-black uppercase tracking-[2px] text-white">Fechar</Text>
                    </Pressable>
                </View>
            </View>
        </BottomSheetModal>
    );
}
