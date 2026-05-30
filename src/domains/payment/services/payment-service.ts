import { DepositRequest, PaymentTransactionResponse, WalletResponse, WalletTransactionResponse } from "@/src/domains/payment/types/payment";
import { paymentRequest } from "@/src/shared/lib/api";

export function getMyWallet() {
    return paymentRequest<WalletResponse>("/wallet/me", {
        auth: true,
    });
}

export function deposit(body: DepositRequest) {
    return paymentRequest<WalletResponse>("/wallet/deposit", {
        method: "POST",
        body,
        auth: true,
    });
}

export function getMyWalletTransactions() {
    return paymentRequest<WalletTransactionResponse[]>("/wallet/transactions/me", {
        auth: true,
    });
}

export function getMyPaymentTransactions() {
    return paymentRequest<PaymentTransactionResponse[]>("/payment/transactions/me", {
        auth: true,
    });
}

export function getPaymentTransactionByOrderId(orderId: string) {
    return paymentRequest<PaymentTransactionResponse>(`/payment/transactions/order/${orderId}`, {
        auth: true,
    });
}
