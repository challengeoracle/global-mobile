export function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

export function formatDateTime(value?: string | null) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("pt-BR");
}

export function formatShortId(value?: string | null) {
    if (!value) {
        return "-";
    }

    if (value.length <= 12) {
        return value;
    }

    return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatStoreLabel(storeId?: string | null, storeName?: string | null) {
    if (storeName) {
        return storeName;
    }

    if (!storeId) {
        return "Loja não identificada";
    }

    return `Loja ${formatShortId(storeId)}`;
}

export function formatPaymentStatus(status?: string | null) {
    if (!status || status === "PENDING" || status === "PENDING_PAYMENT") return "Aguardando pagamento";
    if (status === "PAID" || status === "APPROVED") return "Pago";
    if (status === "REJECTED") return "Pagamento recusado";
    return "Em análise";
}

export function formatOrderStatus(status?: string | null, paymentStatus?: string | null, syncStatus?: string | null) {
    if (!status) return "Pendente";
    const isResolvedPayment = paymentStatus === "PAID" || paymentStatus === "APPROVED";
    const isServerAccepted = syncStatus === "SYNCED" || syncStatus === "OFFLINE_SYNCED";
    if ((status === "CREATED" || status === "PENDING") && (isResolvedPayment || isServerAccepted)) return "Confirmado";
    if (status === "CREATED" || status === "PENDING") return "Pendente";
    if (status === "CONFIRMED" || status === "SELLER_CONFIRMED") return "Confirmado pelo vendedor";
    if (status === "APPROVED") return "Aprovado";
    if (status === "CANCELLED") return "Cancelado";
    if (status === "REJECTED") return "Recusado";
    return "Em processamento";
}

export function formatSyncStatus(status?: string | null) {
    if (!status || status === "PENDING" || status === "PENDING_SYNC") return "Pendente de sincronização";
    if (status === "SYNCED") return "Sincronizado";
    if (status === "OFFLINE_SYNCED") return "Aceito pelo servidor";
    if (status === "SELLER_CONFIRMED") return "Confirmado e aguardando sincronização";
    if (status === "FAILED") return "Falha na sincronização";
    if (status === "REJECTED") return "Rejeitado";
    return "Em processamento";
}

export function formatSyncTimestampLabel(status?: string | null, syncedAt?: string | null) {
    if (!syncedAt) {
        return "Última atualização";
    }

    if (status === "SYNCED" || status === "OFFLINE_SYNCED") {
        return "Aceito pelo servidor em";
    }

    if (status === "REJECTED") {
        return "Revisado em";
    }

    return "Atualizado em";
}

export function formatTransactionType(type?: string | null) {
    if (!type) return "Movimentação";
    if (type === "DEPOSIT") return "Depósito";
    if (type === "PAYMENT_DEBIT") return "Pagamento";
    if (type === "PAYMENT_CREDIT") return "Crédito de venda";
    if (type === "DEBT_PAYMENT") return "Quitação de dívida";
    if (type === "SETTLEMENT") return "Saldo liberado";
    if (type === "REFUND") return "Estorno";
    return "Movimentação";
}

export function formatCreditDebtStatus(value?: number | null, settledAt?: string | null) {
    if (!value || value <= 0) {
        return settledAt ? "Crédito devedor quitado" : "Sem crédito devedor";
    }

    return "Crédito devedor pendente";
}
