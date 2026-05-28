import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { BottomSheetModal } from "@/src/components/ui/bottom-sheet-modal";
import { CatalogCategory } from "@/src/types/sales";
import { buildCatalogQrPayload, encodeCatalogQr } from "@/src/utils/catalog-qr";

type CatalogQrModalProps = {
    visible: boolean;
    storeId: string | null;
    categories: CatalogCategory[];
    onClose: () => void;
};

export function CatalogQrModal({ visible, storeId, categories, onClose }: CatalogQrModalProps) {
    const productCount = categories.reduce((total, category) => total + category.products.length, 0);

    if (!storeId) {
        return (
            <BottomSheetModal visible={visible} eyebrow="QR Code" title="Catálogo" onClose={onClose}>
                <Text className="text-base leading-7 text-muted-foreground">Sincronize o catálogo antes de gerar o QR Code.</Text>
            </BottomSheetModal>
        );
    }

    const payload = buildCatalogQrPayload({
        storeId,
        categories,
    });

    const qrValue = encodeCatalogQr(payload);

    return (
        <BottomSheetModal visible={visible} eyebrow="QR Code" title="Catálogo da loja" onClose={onClose}>
            <View className="items-center">
                <View className="rounded-3xl border border-border bg-white p-5">
                    <QRCode value={qrValue} size={240} />
                </View>

                <Text className="mt-5 text-center text-base font-black text-foreground">Pronto para escanear</Text>

                <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">O cliente escaneia este código para carregar o catálogo no aparelho e montar o pedido.</Text>

                <View className="mt-5 rounded-2xl bg-muted px-4 py-3">
                    <Text className="text-center text-xs font-bold uppercase tracking-[1px] text-muted-foreground">
                        {categories.length} categoria(s) • {productCount} produto(s)
                    </Text>
                </View>
            </View>
        </BottomSheetModal>
    );
}
