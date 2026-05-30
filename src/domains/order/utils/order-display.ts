export function paymentStatusTone(status?: string | null) {
    if (status === "PAID" || status === "APPROVED") return "bg-primary/10 text-primary";
    if (status === "REJECTED") return "bg-red-500/10 text-red-500";
    return "bg-yellow-500/10 text-yellow-600";
}

export function syncStatusTone(status?: string | null) {
    if (status === "REJECTED" || status === "FAILED") return "bg-red-500/10 text-red-500";
    if (status === "PENDING" || status === "PENDING_SYNC" || status === "SELLER_CONFIRMED") return "bg-yellow-500/10 text-yellow-600";
    return "bg-primary/10 text-primary";
}

export function orderStatusTone(status?: string | null) {
    if (status === "REJECTED" || status === "CANCELLED") return "bg-red-500/10 text-red-500";
    if (status === "CONFIRMED" || status === "SELLER_CONFIRMED" || status === "APPROVED") return "bg-primary/10 text-primary";
    return "bg-muted text-muted-foreground";
}
