import { createLocalOrderFromConfirmationQr } from "@/src/domains/order/repositories/order-repository";
import { decodeOrderConfirmationQr } from "@/src/domains/order/utils/order-qr";
import { QrScannerModal } from "@/src/shared/components/scanner/qr-scanner-modal";

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirmed: (localOrderId: string) => void | Promise<void>;
};

export function OrderConfirmationScannerModal({ visible, onClose, onConfirmed }: Props) {
    return (
        <QrScannerModal
            visible={visible}
            eyebrow="Confirmação"
            title="Escanear vendedor"
            permissionTitle="Permissão da câmera"
            permissionDescription="Precisamos da câmera para ler a confirmação do vendedor."
            instructionTitle="Aponte para o QR do vendedor"
            instructionDescription="Isso salva ou atualiza o pedido no seu histórico local."
            onClose={onClose}
            onScan={async (data) => {
                const payload = decodeOrderConfirmationQr(data);

                await createLocalOrderFromConfirmationQr({
                    payload,
                });

                await onConfirmed(payload.localOrderId);

                return {
                    successMessage: "Pedido atualizado neste aparelho.",
                    closeOnSuccess: true,
                };
            }}
        />
    );
}
