export type WalletOwnerType = "CUSTOMER" | "STORE";

export type WalletTransactionType = "DEPOSIT" | "PAYMENT_DEBIT" | "PAYMENT_CREDIT" | "SETTLEMENT";

export type PaymentTransactionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type WalletResponse = {
    id: string;
    ownerId: string;
    ownerType: WalletOwnerType;
    balance: number;
    pendingBalance: number;
    createdAt: string;
    updatedAt: string;
};

export type WalletTransactionResponse = {
    id: string;
    walletId: string;
    type: WalletTransactionType;
    amount: number;
    description: string;
    referenceId: string;
    createdAt: string;
};

export type PaymentTransactionResponse = {
    id: string;
    orderId: string;
    localOrderId: string;
    customerId: string;
    sellerId: string;
    storeId: string;
    amount: number;
    status: PaymentTransactionStatus;
    failureReason: string | null;
    gatewayReference: string | null;
    createdAt: string;
    processedAt: string | null;
};

export type DepositRequest = {
    amount: number;
    description?: string;
};

export type WalletSettleResponse = {
    message?: string;
    wallet?: WalletResponse;
};
