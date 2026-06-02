import { UserRole } from "@/src/domains/auth/types/auth";

export type AnalyticsSummaryResponse = {
    userId: string;
    userName: string;
    role: UserRole;
    storeId: string | null;
    storeName: string | null;
    totalOrders: number;
    paidOrders: number;
    rejectedPayments: number;
    pendingPayments: number;
    totalAmount: number;
    walletBalance: number;
    walletPendingBalance: number;
    personalWalletBalance: number;
    topProductName: string | null;
    topProductQuantity: number | null;
    message: string | null;
};

export type SellerSummaryResponse = {
    sellerId: string;
    storeId: string;
    storeName: string;
    totalSales: number;
    paidSales: number;
    rejectedPayments: number;
    pendingPayments: number;
    totalSalesAmount: number;
    paidSalesAmount: number;
    rejectedSalesAmount: number;
    pendingSalesAmount: number;
    availableBalance: number;
    pendingBalance: number;
    topProductName: string | null;
    topProductQuantity: number | null;
    message: string | null;
};

export type CustomerSummaryResponse = {
    customerId: string;
    customerName: string;
    totalPurchases: number;
    paidPurchases: number;
    rejectedPayments: number;
    pendingPayments: number;
    totalSpent: number;
    paidAmount: number;
    rejectedAmount: number;
    pendingAmount: number;
    walletBalance: number;
    favoriteStoreId: string | null;
    mostPurchasedProductName: string | null;
    mostPurchasedProductQuantity: number | null;
    message: string | null;
};

export type TopProductResponse = {
    productId: string;
    productName: string;
    quantitySold: number;
    totalAmount: number;
};

export type CustomerSpendingByStoreResponse = {
    storeId: string;
    purchases: number;
    totalSpent: number;
};

export type CustomerSpendingResponse = {
    customerId: string;
    customerName: string;
    totalPurchases: number;
    totalSpent: number;
    paidAmount: number;
    pendingAmount: number;
    rejectedAmount: number;
    spendingByStore: CustomerSpendingByStoreResponse[];
    mostPurchasedProducts: TopProductResponse[];
    message: string | null;
};

export type InsightAskRequest = {
    question: string;
};

export type InsightAskResponse = {
    answer: string;
    source: string | null;
    model: string | null;
    sources?: string[];
    capabilities?: string[];
};

export type AnalyticsPeriod = "today" | "yesterday" | "week" | "month";

export type AnalyticsPeriodSummaryResponse = {
    role: UserRole;
    period: string;
    startDate: string;
    endDate: string;
    totalOrders: number;
    paidOrders: number;
    pendingPayments: number;
    rejectedPayments: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    rejectedAmount: number;
    averageTicket: number;
    topProductName: string | null;
    topProductQuantity: number | null;
    message: string | null;
};

export type AnalyticsChartPointResponse = {
    date: string;
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    rejectedOrders: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    rejectedAmount: number;
};

export type AnalyticsChartResponse = {
    role: UserRole;
    period: string;
    totalOrders: number;
    totalAmount: number;
    points: AnalyticsChartPointResponse[];
};

export type InsightOverview = {
    greetingName: string;
    role: UserRole;
    title: string;
    description: string;
    primaryAmountLabel: string;
    primaryAmount: number;
    orderCountLabel: string;
    orderCount: number;
    pendingPayments: number;
    rejectedPayments: number;
    availableBalanceLabel: string;
    availableBalance: number;
    pendingBalance?: number;
    topProductLabel: string;
    topProductName: string | null;
    topProductQuantity: number | null;
    message?: string | null;
};

export type InsightDashboard = {
    overview: InsightOverview | null;
    periodSummary: AnalyticsPeriodSummaryResponse | null;
    chart: AnalyticsChartResponse | null;
};
