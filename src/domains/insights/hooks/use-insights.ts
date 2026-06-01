import { useCallback, useMemo, useRef, useState } from "react";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";

import { askInsight, getCustomerSpending, getCustomerSummary, getMySummary, getSellerSummary, getSellerTopProducts } from "../services/insights-service";
import { InsightAskResponse, InsightOverview } from "../types/insights";

function buildSellerOverview(
    name: string,
    summary: Awaited<ReturnType<typeof getSellerSummary>>,
    topProducts: Awaited<ReturnType<typeof getSellerTopProducts>>,
): InsightOverview {
    const topProduct = topProducts[0];

    return {
        greetingName: name,
        role: "SELLER",
        title: summary.storeName || "Sua loja",
        description: "Acompanhe vendas, pagamentos e saldo liberado do seu caixa.",
        primaryAmountLabel: "Total vendido",
        primaryAmount: summary.totalSalesAmount ?? 0,
        orderCountLabel: "Pedidos",
        orderCount: summary.totalSales ?? 0,
        pendingPayments: summary.pendingPayments ?? 0,
        rejectedPayments: summary.rejectedPayments ?? 0,
        availableBalanceLabel: "Saldo disponível",
        availableBalance: summary.availableBalance ?? 0,
        pendingBalance: summary.pendingBalance ?? 0,
        topProductLabel: "Produto mais vendido",
        topProductName: summary.topProductName || topProduct?.productName || null,
        topProductQuantity: summary.topProductQuantity ?? topProduct?.quantitySold ?? null,
        message: summary.message,
    };
}

function buildCustomerOverview(
    name: string,
    summary: Awaited<ReturnType<typeof getCustomerSummary>>,
    spending: Awaited<ReturnType<typeof getCustomerSpending>>,
): InsightOverview {
    const topProduct = spending.mostPurchasedProducts[0];

    return {
        greetingName: name,
        role: "CUSTOMER",
        title: "Seu consumo",
        description: "Veja seus gastos, pagamentos em aberto e o que mais entrou no carrinho.",
        primaryAmountLabel: "Total gasto",
        primaryAmount: summary.totalSpent ?? spending.totalSpent ?? 0,
        orderCountLabel: "Compras",
        orderCount: summary.totalPurchases ?? spending.totalPurchases ?? 0,
        pendingPayments: summary.pendingPayments ?? 0,
        rejectedPayments: summary.rejectedPayments ?? 0,
        availableBalanceLabel: "Saldo disponível",
        availableBalance: summary.walletBalance ?? 0,
        topProductLabel: "Produto que você mais comprou",
        topProductName: summary.mostPurchasedProductName || topProduct?.productName || null,
        topProductQuantity: summary.mostPurchasedProductQuantity ?? topProduct?.quantitySold ?? null,
        message: summary.message || spending.message,
    };
}

function buildFallbackOverview(name: string, role: "SELLER" | "CUSTOMER", summary: Awaited<ReturnType<typeof getMySummary>>): InsightOverview {
    const isSeller = role === "SELLER";

    return {
        greetingName: name,
        role,
        title: isSeller ? summary.storeName || "Sua loja" : "Seu consumo",
        description: isSeller ? "Resumo geral carregado como apoio enquanto os indicadores detalhados não estão disponíveis." : "Resumo geral carregado como apoio enquanto os indicadores detalhados não estão disponíveis.",
        primaryAmountLabel: isSeller ? "Total vendido" : "Total gasto",
        primaryAmount: summary.totalAmount ?? 0,
        orderCountLabel: isSeller ? "Pedidos" : "Compras",
        orderCount: summary.totalOrders ?? 0,
        pendingPayments: summary.pendingPayments ?? 0,
        rejectedPayments: summary.rejectedPayments ?? 0,
        availableBalanceLabel: "Saldo disponível",
        availableBalance: isSeller ? summary.walletBalance ?? 0 : summary.personalWalletBalance ?? summary.walletBalance ?? 0,
        pendingBalance: isSeller ? summary.walletPendingBalance ?? 0 : undefined,
        topProductLabel: isSeller ? "Produto mais vendido" : "Produto mais comprado",
        topProductName: summary.topProductName,
        topProductQuantity: summary.topProductQuantity,
        message: summary.message,
    };
}

export function useInsights() {
    const { user } = useAuth();
    const network = useNetworkStatus();
    const [overview, setOverview] = useState<InsightOverview | null>(null);
    const [assistantAnswer, setAssistantAnswer] = useState<InsightAskResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [asking, setAsking] = useState(false);
    const [error, setError] = useState("");
    const hasLoadedOnceRef = useRef(false);

    const isOfflineBlocked = network.canAttemptRemote === false;
    const firstName = useMemo(() => user?.name?.trim().split(" ")[0] || "você", [user?.name]);

    const loadInsights = useCallback(async (mode: "initial" | "refresh" = "initial") => {
        if (isOfflineBlocked) {
            setOverview(null);
            setError("");
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            if (mode === "refresh") {
                setRefreshing(true);
            } else if (!hasLoadedOnceRef.current) {
                setLoading(true);
            }

            setError("");

            if (user?.role === "SELLER") {
                try {
                    const [summary, topProducts] = await Promise.all([getSellerSummary(), getSellerTopProducts()]);
                    setOverview(buildSellerOverview(firstName, summary, topProducts));
                    return;
                } catch {
                    const fallback = await getMySummary();
                    setOverview(buildFallbackOverview(firstName, "SELLER", fallback));
                    return;
                }
            }

            try {
                const [summary, spending] = await Promise.all([getCustomerSummary(), getCustomerSpending()]);
                setOverview(buildCustomerOverview(firstName, summary, spending));
            } catch {
                const fallback = await getMySummary();
                setOverview(buildFallbackOverview(firstName, "CUSTOMER", fallback));
            }
        } catch (err) {
            setOverview(null);
            setError(err instanceof Error ? err.message : "Não foi possível carregar seus insights agora.");
        } finally {
            hasLoadedOnceRef.current = true;
            setLoading(false);
            setRefreshing(false);
        }
    }, [firstName, isOfflineBlocked, user?.role]);

    const refreshInsights = useCallback(async () => {
        await loadInsights("refresh");
    }, [loadInsights]);

    const submitQuestion = useCallback(
        async (question: string) => {
            if (isOfflineBlocked) {
                throw new Error("Reconecte-se para perguntar ao OffPay Insights.");
            }

            setAsking(true);

            try {
                const response = await askInsight(question);
                setAssistantAnswer(response);
                return response;
            } finally {
                setAsking(false);
            }
        },
        [isOfflineBlocked],
    );

    return {
        overview,
        assistantAnswer,
        loading,
        refreshing,
        asking,
        error,
        isOfflineBlocked,
        network,
        loadInsights,
        refreshInsights,
        submitQuestion,
        clearAssistantAnswer: () => setAssistantAnswer(null),
    };
}
