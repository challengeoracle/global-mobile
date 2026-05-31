import { saveCatalogFromQr } from "@/src/domains/catalog/repositories/catalog-repository";
import { decodeCatalogQr } from "@/src/domains/catalog/utils/catalog-qr";
import { QrScannerModal } from "@/src/shared/components/scanner/qr-scanner-modal";

type CatalogScannerModalProps = {
    visible: boolean;
    onClose: () => void;
    onImported: () => void | Promise<void>;
};

export function CatalogScannerModal({ visible, onClose, onImported }: CatalogScannerModalProps) {
    return (
        <QrScannerModal
            visible={visible}
            eyebrow="Catálogo"
            title="Escanear QR"
            permissionTitle="Permissão da câmera"
            permissionDescription="Precisamos da câmera para ler o QR Code do catálogo da loja."
            instructionTitle="Aponte para o QR do vendedor"
            instructionDescription="O catálogo será salvo neste aparelho para montar o pedido."
            onClose={onClose}
            onScan={async (data) => {
                const payload = decodeCatalogQr(data);
                await saveCatalogFromQr(payload);
                await onImported();

                return {
                    successMessage: "Catálogo importado.",
                    closeOnSuccess: true,
                };
            }}
        />
    );
}
