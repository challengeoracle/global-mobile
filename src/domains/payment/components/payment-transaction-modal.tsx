import { Text, View } from "react-native";

import { PaymentTransactionResponse } from "@/src/domains/payment/types/payment";
import { BottomSheetModal } from "@/src/shared/components/ui/bottom-sheet-modal";
import { formatCurrency, formatDateTime, formatPaymentStatus } from "@/src/shared/lib/formatters";

function statusClass(value: string) {
    if (value === "APPROVED" || value === "PAID") return "bg-primary/10 text-primary";
    if (value === "REJECTED") return "bg-red-500/10 text-red-500";
    return "bg-yellow-500/10 text-yellow-600";
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row justify-between gap-3 py-3">
            <Text className="flex-1 text-sm font-bold text-muted-foreground">{label}</Text>
            <Text className="flex-1 text-right text-sm text-card-foreground">{value}</Text>
        </View>
    );
}

export function PaymentTransactionModal({ visible, transaction, onClose }: { visible: boolean; transaction: PaymentTransactionResponse | null; onClose: () => void }) {
    return (
        <BottomSheetModal visible={visible} title="Pagamento" eyebrow="Transação" onClose={onClose}>
            {transaction ? (
                <View className="pb-8">
                    <View className="rounded-3xl border border-border bg-card p-4">
                        <Text className={`self-start rounded-xl px-3 py-2 text-xs font-bold ${statusClass(transaction.status)}`}>{formatPaymentStatus(transaction.status)}</Text>
                        <Text className="mt-4 text-3xl font-black text-card-foreground">{formatCurrency(transaction.amount)}</Text>
                        <Text className="mt-2 text-sm text-muted-foreground">Pedido #{transaction.localOrderId?.slice(0, 8) ?? transaction.orderId.slice(0, 8)}</Text>
                    </View>

                    <View className="mt-4 rounded-3xl border border-border bg-card px-4">
                        <DetailRow label="Status" value={formatPaymentStatus(transaction.status)} />
                        <DetailRow label="Pedido remoto" value={transaction.orderId} />
                        <DetailRow label="Pedido local" value={transaction.localOrderId ?? "-"} />
                        <DetailRow label="Criado em" value={formatDateTime(transaction.createdAt)} />
                        <DetailRow label="Processado em" value={formatDateTime(transaction.processedAt)} />
                        <DetailRow label="Referência do gateway" value={transaction.gatewayReference ?? "-"} />
                        <DetailRow label="Motivo da recusa" value={transaction.failureReason ?? "-"} />
                    </View>
                </View>
            ) : (
                <View className="rounded-3xl border border-dashed border-border bg-card p-6">
                    <Text className="text-center text-base font-bold text-card-foreground">Pagamento não encontrado</Text>
                    <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Essa venda ainda pode estar aguardando processamento ou não foi sincronizada com o backend.</Text>
                </View>
            )}
        </BottomSheetModal>
    );
}
