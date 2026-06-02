import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { createLocalOrderFromQr } from "@/src/domains/order/repositories/order-repository";
import { decodeOrderQr } from "@/src/domains/order/utils/order-qr";
import { QrScannerModal } from "@/src/shared/components/scanner/qr-scanner-modal";

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirmed: (localOrderId: string) => void | Promise<void>;
};

export function OrderScannerModal({ visible, onClose, onConfirmed }: Props) {
    const { user } = useAuth();

    return (
        <QrScannerModal
            visible={visible}
            eyebrow="Pedido offline"
            title="Confirmar venda"
            permissionTitle="Permissão da câmera"
            permissionDescription="Precisamos da câmera para ler o QR Code do pedido do cliente."
            instructionTitle="Aponte para o QR do cliente"
            instructionDescription="Depois da leitura, o vendedor mostrará um QR de confirmação para o cliente."
            onClose={onClose}
            onScan={async (data) => {
                if (!user) {
                    throw new Error("Usuário não encontrado.");
                }

                if (user.role !== "SELLER") {
                    throw new Error("Apenas vendedores podem confirmar pedidos.");
                }

                const payload = decodeOrderQr(data);
                const created = await createLocalOrderFromQr({
                    payload,
                    sellerId: user.id,
                });

                await onConfirmed(created.localOrderId);

                return {
                    successMessage: created.duplicated ? "Pedido já confirmado neste aparelho." : "Pedido confirmado.",
                };
            }}
        />
    );
}
