import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { updateLocalOrderPaymentStatusByRemoteId } from "@/src/domains/order/repositories/order-repository";
import { deposit, getMyPaymentTransactions, getMyPersonalWallet, getMyPersonalWalletTransactions, getMyWallet, getMyWalletTransactions, settleWallet } from "@/src/domains/payment/services/payment-service";
import { DepositRequest, PaymentTransactionResponse, WalletResponse, WalletTransactionResponse } from "@/src/domains/payment/types/payment";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";

type UseWalletState = {
    storeWallet: WalletResponse | null;
    personalWallet: WalletResponse | null;
    storeWalletTransactions: WalletTransactionResponse[];
    personalWalletTransactions: WalletTransactionResponse[];
    paymentTransactions: PaymentTransactionResponse[];
    loading: boolean;
    refreshing: boolean;
    depositing: boolean;
    settling: boolean;
    error: string;
    loadWalletData: () => Promise<void>;
    refreshWalletData: () => Promise<void>;
    depositFake: (body: DepositRequest) => Promise<void>;
    settlePendingBalance: () => Promise<void>;
};

export function useWallet(): UseWalletState {
    const { user } = useAuth();
    const network = useNetworkStatus();
    const isSeller = user?.role === "SELLER";

    const [storeWallet, setStoreWallet] = useState<WalletResponse | null>(null);
    const [personalWallet, setPersonalWallet] = useState<WalletResponse | null>(null);
    const [storeWalletTransactions, setStoreWalletTransactions] = useState<WalletTransactionResponse[]>([]);
    const [personalWalletTransactions, setPersonalWalletTransactions] = useState<WalletTransactionResponse[]>([]);
    const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransactionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [depositing, setDepositing] = useState(false);
    const [settling, setSettling] = useState(false);
    const [error, setError] = useState("");
    const hasLoadedOnceRef = useRef(false);

    const reconcileLocalOrdersWithPayments = useCallback(async (transactions: PaymentTransactionResponse[]) => {
        const updates = transactions
            .map((transaction) => {
                if (transaction.status === "APPROVED") {
                    return { remoteOrderId: transaction.orderId, paymentStatus: "PAID" };
                }

                if (transaction.status === "REJECTED") {
                    return { remoteOrderId: transaction.orderId, paymentStatus: "REJECTED" };
                }

                if (transaction.status === "PENDING" && transaction.processedAt) {
                    return {
                        remoteOrderId: transaction.orderId,
                        paymentStatus: transaction.failureReason ? "REJECTED" : "PAID",
                    };
                }

                return null;
            })
            .filter((item): item is { remoteOrderId: string; paymentStatus: string } => Boolean(item));

        await Promise.all(
            updates.map((item) =>
                updateLocalOrderPaymentStatusByRemoteId({
                    remoteOrderId: item.remoteOrderId,
                    paymentStatus: item.paymentStatus,
                }),
            ),
        );
    }, []);

    const fetchAll = useCallback(async () => {
        if (!network.canAttemptRemote) {
            throw new Error("Sem conexão para consultar a carteira.");
        }

        const [defaultWallet, defaultWalletTxs, paymentTxs, fetchedPersonalWallet, fetchedPersonalWalletTxs] = await Promise.all([
            getMyWallet(),
            getMyWalletTransactions(),
            getMyPaymentTransactions(),
            isSeller ? getMyPersonalWallet() : Promise.resolve(null),
            isSeller ? getMyPersonalWalletTransactions() : Promise.resolve<WalletTransactionResponse[]>([]),
        ]);

        if (isSeller) {
            setStoreWallet(defaultWallet);
            setStoreWalletTransactions(defaultWalletTxs);
            setPersonalWallet(fetchedPersonalWallet);
            setPersonalWalletTransactions(fetchedPersonalWalletTxs);
        } else {
            setStoreWallet(null);
            setStoreWalletTransactions([]);
            setPersonalWallet(defaultWallet);
            setPersonalWalletTransactions(defaultWalletTxs);
        }

        setPaymentTransactions(paymentTxs);
        await reconcileLocalOrdersWithPayments(paymentTxs);
    }, [isSeller, network.canAttemptRemote, reconcileLocalOrdersWithPayments]);

    const loadWalletData = useCallback(async () => {
        try {
            if (!hasLoadedOnceRef.current) {
                setLoading(true);
            }
            setError("");
            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível carregar a carteira.");
        } finally {
            hasLoadedOnceRef.current = true;
            setLoading(false);
        }
    }, [fetchAll]);

    const refreshWalletData = useCallback(async () => {
        try {
            setRefreshing(true);
            setError("");
            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível atualizar a carteira.");
        } finally {
            setRefreshing(false);
        }
    }, [fetchAll]);

    const depositFake = useCallback(
        async (body: DepositRequest) => {
            try {
                setDepositing(true);
                setError("");
                const updatedWallet = await deposit(body);
                if (isSeller) {
                    setPersonalWallet(updatedWallet);
                } else {
                    setPersonalWallet(updatedWallet);
                }
                await fetchAll();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Não foi possível adicionar saldo.");
                throw err;
            } finally {
                setDepositing(false);
            }
        },
        [fetchAll, isSeller],
    );

    const settlePendingBalance = useCallback(async () => {
        try {
            setSettling(true);
            setError("");
            const pendingAmount = storeWallet?.pendingBalance ?? 0;

            if (!isSeller) {
                throw new Error("Somente vendedores podem liberar saldo.");
            }

            if (pendingAmount <= 0) {
                throw new Error("Não há saldo pendente disponível para liberar.");
            }

            await settleWallet({
                amount: pendingAmount,
                description: "Liberar saldo pendente",
            });
            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível liberar o saldo pendente.");
            throw err;
        } finally {
            setSettling(false);
        }
    }, [fetchAll, isSeller, storeWallet?.pendingBalance]);

    return {
        storeWallet,
        personalWallet,
        storeWalletTransactions,
        personalWalletTransactions,
        paymentTransactions,
        loading,
        refreshing,
        depositing,
        settling,
        error,
        loadWalletData,
        refreshWalletData,
        depositFake,
        settlePendingBalance,
    };
}
