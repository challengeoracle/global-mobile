import { ActivityIndicator, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { BottomSheetModal } from "@/src/shared/components/ui/bottom-sheet-modal";

type CatalogQrModalProps = {
    visible: boolean;
    storeId: string | null;
    qrValue: string | null;
    categoryCount: number;
    productCount: number;
    preparing?: boolean;
    onClose: () => void;
};

export function CatalogQrModal({ visible, storeId, qrValue, categoryCount, productCount, preparing = false, onClose }: CatalogQrModalProps) {
    if (preparing) {
        return (
            <BottomSheetModal visible={visible} eyebrow="QR Code" title="Preparando catálogo" onClose={onClose}>
                <View className="items-center rounded-3xl border border-border bg-card p-6">
                    <ActivityIndicator color="#0f172a" size="large" />

                    <Text className="mt-5 text-center text-base font-black text-card-foreground">Gerando QR otimizado</Text>

                    <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Compactando os produtos ativos para o cliente escanear sem travar a tela.</Text>
                </View>
            </BottomSheetModal>
        );
    }

    if (!storeId || !qrValue) {
        return (
            <BottomSheetModal visible={visible} eyebrow="QR Code" title="Catálogo" onClose={onClose}>
                <View className="rounded-3xl border border-border bg-card p-5">
                    <Text className="text-base leading-7 text-card-foreground">Sincronize ou carregue o catálogo antes de gerar o QR Code.</Text>

                    <Text className="mt-2 text-sm leading-6 text-muted-foreground">O QR precisa de uma loja identificada para importar os produtos corretamente.</Text>
                </View>
            </BottomSheetModal>
        );
    }

    return (
        <BottomSheetModal visible={visible} eyebrow="QR Code" title="Catálogo da loja" onClose={onClose}>
            <View className="items-center">
                <View className="rounded-[32px] border border-border bg-card p-3">
                    <View className="rounded-3xl bg-white p-5">
                        <QRCode value={qrValue} size={220} color="#000000" backgroundColor="#ffffff" />
                    </View>
                </View>

                <Text className="mt-5 text-center text-base font-black text-foreground">Pronto para escanear</Text>

                <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">O cliente escaneia este código para carregar o catálogo no aparelho.</Text>

                <View className="mt-5 rounded-2xl border border-border bg-card px-4 py-3">
                    <Text className="text-center text-xs font-bold uppercase tracking-[1px] text-card-foreground">
                        {categoryCount} categoria(s) • {productCount} produto(s)
                    </Text>
                </View>
            </View>
        </BottomSheetModal>
    );
}
