import { DepositRequest, PaymentTransactionResponse, SettleWalletRequest, WalletResponse, WalletSettleResponse, WalletTransactionResponse } from "@/src/domains/payment/types/payment";
import { paymentRequest } from "@/src/shared/lib/api";

export function getMyWallet() {
    return paymentRequest<WalletResponse>("/wallet/me", {
        auth: true,
    });
}

export function getMyPersonalWallet() {
    return paymentRequest<WalletResponse>("/wallet/personal/me", {
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

export function getMyPersonalWalletTransactions() {
    return paymentRequest<WalletTransactionResponse[]>("/wallet/transactions/personal/me", {
        auth: true,
    });
}

export function settleWallet(body: SettleWalletRequest) {
    return paymentRequest<WalletSettleResponse>("/wallet/settle", {
        method: "POST",
        body,
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
