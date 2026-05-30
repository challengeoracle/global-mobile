import { useCallback, useState } from "react";

import { deposit, getMyPaymentTransactions, getMyWallet, getMyWalletTransactions } from "@/src/domains/payment/services/payment-service";
import { DepositRequest, PaymentTransactionResponse, WalletResponse, WalletTransactionResponse } from "@/src/domains/payment/types/payment";

type UseWalletState = {
    wallet: WalletResponse | null;
    walletTransactions: WalletTransactionResponse[];
    paymentTransactions: PaymentTransactionResponse[];
    loading: boolean;
    refreshing: boolean;
    depositing: boolean;
    error: string;
    loadWalletData: () => Promise<void>;
    refreshWalletData: () => Promise<void>;
    depositFake: (body: DepositRequest) => Promise<void>;
};

export function useWallet(): UseWalletState {
    const [wallet, setWallet] = useState<WalletResponse | null>(null);
    const [walletTransactions, setWalletTransactions] = useState<WalletTransactionResponse[]>([]);
    const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransactionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [depositing, setDepositing] = useState(false);
    const [error, setError] = useState("");

    const fetchAll = useCallback(async () => {
        const [walletData, walletTxs, paymentTxs] = await Promise.all([getMyWallet(), getMyWalletTransactions(), getMyPaymentTransactions()]);

        setWallet(walletData);
        setWalletTransactions(walletTxs);
        setPaymentTransactions(paymentTxs);
    }, []);

    const loadWalletData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Nao foi possivel carregar a carteira.");
        } finally {
            setLoading(false);
        }
    }, [fetchAll]);

    const refreshWalletData = useCallback(async () => {
        try {
            setRefreshing(true);
            setError("");
            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Nao foi possivel atualizar a carteira.");
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
                setWallet(updatedWallet);
                await fetchAll();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Nao foi possivel adicionar saldo.");
                throw err;
            } finally {
                setDepositing(false);
            }
        },
        [fetchAll],
    );

    return {
        wallet,
        walletTransactions,
        paymentTransactions,
        loading,
        refreshing,
        depositing,
        error,
        loadWalletData,
        refreshWalletData,
        depositFake,
    };
}
