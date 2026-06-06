import { useCallback, useMemo, useRef, useState } from "react";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";

import {
    askInsight,
    getCustomerSpending,
    getCustomerSpendingResource,
    getCustomerSummary,
    getCustomerSummaryResource,
    getMyChart,
    getMyPeriodSummary,
    getMySummary,
    getSellerSummary,
    getSellerTopProducts,
} from "../services/insights-service";
import {
    AnalyticsPeriod,
    CustomerSpendingByStoreResponse,
    InsightAskResponse,
    InsightDashboard,
    InsightOverview,
} from "../types/insights";

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
        favoriteStoreLabel: summary.favoriteStoreName || formatStoreFallback(summary.favoriteStoreId),
        lastPurchaseStoreLabel: summary.lastPurchaseStoreName || formatStoreFallback(summary.lastPurchaseStoreId),
        lastPurchaseOrderId: summary.lastPurchaseOrderId ?? null,
        lastPurchaseAmount: summary.lastPurchaseAmount ?? null,
        lastPurchaseAt: summary.lastPurchaseAt ?? null,
        lastPurchaseProductNames: summary.lastPurchaseProductNames ?? [],
        spendingByStore: normalizeSpendingByStore(spending.spendingByStore ?? []),
        recentPurchases: (spending.recentPurchases ?? []).map((purchase) => ({
            ...purchase,
            storeName: purchase.storeName || formatStoreFallback(purchase.storeId),
        })),
        message: summary.message || spending.message,
    };
}

function buildFallbackOverview(name: string, role: "SELLER" | "CUSTOMER", summary: Awaited<ReturnType<typeof getMySummary>>): InsightOverview {
    const isSeller = role === "SELLER";

    return {
        greetingName: name,
        role,
        title: isSeller ? summary.storeName || "Sua loja" : "Seu consumo",
        description: "Resumo geral carregado como apoio enquanto os indicadores detalhados não estão disponíveis.",
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

function formatStoreFallback(storeId?: string | null) {
    if (!storeId) {
        return null;
    }

    return `Loja ${storeId.slice(0, 8)}`;
}

function normalizeSpendingByStore(items: CustomerSpendingByStoreResponse[]) {
    return items.map((item) => ({
        ...item,
        storeName: item.storeName || formatStoreFallback(item.storeId),
    }));
}

async function loadCustomerSummaryPreferResource() {
    try {
        return await getCustomerSummaryResource();
    } catch {
        return await getCustomerSummary();
    }
}

async function loadCustomerSpendingPreferResource() {
    try {
        return await getCustomerSpendingResource();
    } catch {
        return await getCustomerSpending();
    }
}

export function useInsights() {
    const { user } = useAuth();
    const network = useNetworkStatus();
    const [dashboard, setDashboard] = useState<InsightDashboard>({ overview: null, periodSummary: null, chart: null });
    const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>("today");
    const [assistantAnswer, setAssistantAnswer] = useState<InsightAskResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [asking, setAsking] = useState(false);
    const [error, setError] = useState("");
    const hasLoadedOnceRef = useRef(false);

    const isOfflineBlocked = network.canAttemptRemote === false;
    const firstName = useMemo(() => user?.name?.trim().split(" ")[0] || "você", [user?.name]);

    const loadInsights = useCallback(
        async (mode: "initial" | "refresh" = "initial", period: AnalyticsPeriod = selectedPeriod) => {
            if (isOfflineBlocked) {
                setDashboard({ overview: null, periodSummary: null, chart: null });
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
                setSelectedPeriod(period);

                const chartDays = user?.role === "CUSTOMER" ? 7 : period === "month" ? 30 : period === "week" ? 7 : 2;

                const [periodSummary, chart] = await Promise.all([getMyPeriodSummary(period), getMyChart(chartDays)]);

                if (user?.role === "SELLER") {
                    try {
                        const [summary, topProducts] = await Promise.all([getSellerSummary(), getSellerTopProducts()]);
                        setDashboard({
                            overview: buildSellerOverview(firstName, summary, topProducts),
                            periodSummary,
                            chart,
                        });
                        return;
                    } catch {
                        const fallback = await getMySummary();
                        setDashboard({
                            overview: buildFallbackOverview(firstName, "SELLER", fallback),
                            periodSummary,
                            chart,
                        });
                        return;
                    }
                }

                try {
                    const [summary, spending] = await Promise.all([loadCustomerSummaryPreferResource(), loadCustomerSpendingPreferResource()]);
                    setDashboard({
                        overview: buildCustomerOverview(firstName, summary, spending),
                        periodSummary,
                        chart,
                    });
                } catch {
                    const fallback = await getMySummary();
                    setDashboard({
                        overview: buildFallbackOverview(firstName, "CUSTOMER", fallback),
                        periodSummary,
                        chart,
                    });
                }
            } catch (err) {
                setDashboard({ overview: null, periodSummary: null, chart: null });
                setError(err instanceof Error ? err.message : "Não foi possível carregar seus insights agora.");
            } finally {
                hasLoadedOnceRef.current = true;
                setLoading(false);
                setRefreshing(false);
            }
        },
        [firstName, isOfflineBlocked, selectedPeriod, user?.role],
    );

    const refreshInsights = useCallback(async () => {
        await loadInsights("refresh", selectedPeriod);
    }, [loadInsights, selectedPeriod]);

    const changePeriod = useCallback(async (period: AnalyticsPeriod) => {
        await loadInsights("refresh", period);
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
        overview: dashboard.overview,
        periodSummary: dashboard.periodSummary,
        chart: dashboard.chart,
        selectedPeriod,
        assistantAnswer,
        loading,
        refreshing,
        asking,
        error,
        isOfflineBlocked,
        network,
        loadInsights,
        refreshInsights,
        changePeriod,
        submitQuestion,
        clearAssistantAnswer: () => setAssistantAnswer(null),
    };
}
