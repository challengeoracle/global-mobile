import { DepositRequest, PageResponse, PaymentTransactionResponse, SettleWalletRequest, WalletResponse, WalletSettleResponse, WalletTransactionResponse } from "@/src/domains/payment/types/payment";
import { paymentRequest } from "@/src/shared/lib/api";

const DEFAULT_PAGE_SIZE = 50;

async function fetchPagedResults<T>(path: string, size = DEFAULT_PAGE_SIZE) {
    const results: T[] = [];
    let page = 0;

    while (true) {
        const response = await paymentRequest<PageResponse<T>>(`${path}?page=${page}&size=${size}`, {
            auth: true,
        });
        results.push(...response.content);

        if (response.last || response.totalPages <= page + 1) {
            break;
        }

        page += 1;
    }

    return results;
}

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
    return fetchPagedResults<WalletTransactionResponse>("/wallet/transactions/me/page");
}

export function getMyPersonalWalletTransactions() {
    return fetchPagedResults<WalletTransactionResponse>("/wallet/transactions/personal/me/page");
}

export function settleWallet(body: SettleWalletRequest) {
    return paymentRequest<WalletSettleResponse>("/wallet/settle", {
        method: "POST",
        body,
        auth: true,
    });
}

export function getMyPaymentTransactions() {
    return fetchPagedResults<PaymentTransactionResponse>("/payment/transactions/me/page");
}

export function getPaymentTransactionByOrderId(orderId: string) {
    return paymentRequest<PaymentTransactionResponse>(`/payment/transactions/order/${orderId}`, {
        auth: true,
    });
}

export function settlePaymentDebt(orderId: string) {
    return paymentRequest<PaymentTransactionResponse>(`/payment/transactions/order/${orderId}/settle-debt`, {
        method: "POST",
        auth: true,
    });
}
