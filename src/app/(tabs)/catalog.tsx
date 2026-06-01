import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { CatalogQrModal } from "@/src/domains/catalog/components/catalog-qr-modal";
import { CatalogScannerModal } from "@/src/domains/catalog/components/catalog-scanner-modal";
import { CatalogToolbar } from "@/src/domains/catalog/components/catalog-toolbar";
import { CustomerCatalogImportScreen } from "@/src/domains/catalog/components/customer-catalog-import-screen";
import { CustomerCatalogModal } from "@/src/domains/catalog/components/customer-catalog-modal";
import { ProductCard } from "@/src/domains/catalog/components/product-card";
import { ProductDetailsModal } from "@/src/domains/catalog/components/product-details-modal";
import { ProductFormModal } from "@/src/domains/catalog/components/product-form-modal";
import { StockAdjustModal } from "@/src/domains/catalog/components/stock-adjust-modal";
import { useCatalogScreen } from "@/src/domains/catalog/hooks/use-catalog-screen";
import { clearCatalog } from "@/src/domains/catalog/repositories/catalog-repository";
import { buildCatalogQrPayload, encodeCatalogQr } from "@/src/domains/catalog/utils/catalog-qr";
import { CartModal } from "@/src/domains/order/components/cart-modal";
import { OrderConfirmationQrModal } from "@/src/domains/order/components/order-confirmation-qr-modal";
import { OrderConfirmationScannerModal } from "@/src/domains/order/components/order-confirmation-scanner-modal";
import { OrderQrModal } from "@/src/domains/order/components/order-qr-modal";
import { OrderScannerModal } from "@/src/domains/order/components/order-scanner-modal";
import { useOrderFlow } from "@/src/domains/order/hooks/use-order-flow";
import { buildOrderConfirmationPayloadFromLocal } from "@/src/domains/order/repositories/order-repository";
import { buildOrderConfirmationQrPayload, encodeOrderQr } from "@/src/domains/order/utils/order-qr";
import { SyncStatusCard } from "@/src/shared/components/sync/sync-status-card";
import { PageHeader } from "@/src/shared/components/ui/page-header";
import { useSyncStatus } from "@/src/shared/hooks/use-sync-status";

type ActiveModal = "catalogQr" | "customerCatalog" | "productDetails" | "productForm" | "stockAdjust" | "cart" | "orderQr" | "sellerConfirmationQr";

const MODAL_TRANSITION_MS = 220;

export default function CatalogScreen() {
    const router = useRouter();
    const catalog = useCatalogScreen();
    const orders = useOrderFlow(catalog.catalogStoreId);
    const catalogSyncStatus = useSyncStatus("catalog");

    const { colorScheme } = useColorScheme();

    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const whiteIcon = "#ffffff";

    const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [orderScannerVisible, setOrderScannerVisible] = useState(false);
    const [orderConfirmationScannerVisible, setOrderConfirmationScannerVisible] = useState(false);
    const [sellerConfirmationQrValue, setSellerConfirmationQrValue] = useState<string | null>(null);
    const [sellerConfirmationSynced, setSellerConfirmationSynced] = useState(false);
    const [sellerConfirmationMessage, setSellerConfirmationMessage] = useState<string | null>(null);
    const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const qrData = useMemo(() => {
        if (!catalog.catalogStoreId || catalog.categories.length === 0) {
            return {
                qrValue: null,
                categoryCount: 0,
                productCount: 0,
            };
        }

        const productCount = catalog.categories.reduce((total, category) => total + category.products.length, 0);
        const payload = buildCatalogQrPayload({
            storeId: catalog.catalogStoreId,
            categories: catalog.categories,
        });

        return {
            qrValue: encodeCatalogQr(payload),
            categoryCount: catalog.categories.length,
            productCount,
        };
    }, [catalog.catalogStoreId, catalog.categories]);

    function clearPendingTransition() {
        if (transitionTimerRef.current) {
            clearTimeout(transitionTimerRef.current);
            transitionTimerRef.current = null;
        }
    }

    function closeActiveModal() {
        clearPendingTransition();
        setActiveModal(null);
    }

    function transitionToModal(nextModal: ActiveModal, beforeOpen?: () => void, delayMs = MODAL_TRANSITION_MS) {
        clearPendingTransition();
        beforeOpen?.();

        if (activeModal === null) {
            setActiveModal(nextModal);
            return;
        }

        setActiveModal(null);
        transitionTimerRef.current = setTimeout(() => {
            setActiveModal(nextModal);
            transitionTimerRef.current = null;
        }, delayMs);
    }

    function openFullScreenScanner(openScanner: () => void) {
        clearPendingTransition();
        setActiveModal(null);
        openScanner();
    }

    function reopenCustomerCatalog() {
        transitionToModal("customerCatalog");
    }

    async function handleClearCustomerCatalog() {
        clearPendingTransition();
        orders.clearCart();
        orders.clearGeneratedOrderQr();

        await clearCatalog();
        await catalog.loadLocalCatalog();

        setActiveModal(null);
        setOrderConfirmationScannerVisible(false);
    }

    async function handleGenerateOrderQr() {
        const generated = await orders.generateOrderQr();

        if (generated) {
            transitionToModal("orderQr");
        }
    }

    function handleOpenConfirmationScannerFromClient() {
        clearPendingTransition();
        setActiveModal(null);
        setTimeout(() => {
            setOrderConfirmationScannerVisible(true);
        }, MODAL_TRANSITION_MS);
    }

    async function handleClientScannedSellerConfirmation(_localOrderId: string) {
        clearPendingTransition();
        setOrderConfirmationScannerVisible(false);
        setActiveModal(null);

        orders.clearGeneratedOrderQr();
        orders.clearCart();

        await orders.refreshPendingOrderCount();
        await catalog.loadLocalCatalog();
        router.push("/(tabs)/orders");
    }

    async function openSellerConfirmationQr(localOrderId: string, synced: boolean) {
        const confirmation = await buildOrderConfirmationPayloadFromLocal(localOrderId);

        if (!confirmation.storeId) {
            throw new Error("Pedido confirmado sem loja vinculada.");
        }

        const qrPayload = buildOrderConfirmationQrPayload({
            type: "OFFPAY_ORDER_CONFIRMATION",
            version: 1,
            localOrderId: confirmation.localOrderId,
            storeId: confirmation.storeId,
            customerId: confirmation.customerId,
            sellerId: confirmation.sellerId,
            sellerDeviceId: confirmation.sellerDeviceId,
            remoteOrderId: confirmation.remoteOrderId,
            confirmedAt: confirmation.confirmedAt,
            totalAmount: confirmation.totalAmount,
            orderStatus: confirmation.orderStatus,
            paymentStatus: confirmation.paymentStatus,
            syncStatus: confirmation.syncStatus,
            message: confirmation.message,
            items: confirmation.items,
        });

        setSellerConfirmationQrValue(encodeOrderQr(qrPayload));
        setSellerConfirmationSynced(synced);
        setSellerConfirmationMessage(confirmation.message ?? null);
        transitionToModal("sellerConfirmationQr");
    }

    async function handleOrderConfirmedBySeller(localOrderId: string) {
        setOrderScannerVisible(false);

        await orders.refreshPendingOrderCount();
        await catalog.loadLocalCatalog();

        let synced = false;

        try {
            const syncResult = await orders.syncPendingOrders(false);
            synced = syncResult.ok && (syncResult.rejected ?? 0) === 0;

            await orders.refreshPendingOrderCount();
            await catalog.loadLocalCatalog();
        } catch {
            synced = false;
        }

        if (!synced) {
            return;
        }

        await openSellerConfirmationQr(localOrderId, synced);
    }

    function handleCloseSellerConfirmationQr() {
        closeActiveModal();
        setSellerConfirmationQrValue(null);
        setSellerConfirmationSynced(false);
        setSellerConfirmationMessage(null);
    }

    if (catalog.loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color={iconColor} size="large" />
            </View>
        );
    }

    if (!catalog.isSeller) {
        return (
            <View className="flex-1 bg-background">
                <CustomerCatalogImportScreen
                    hasImportedCatalog={catalog.products.length > 0}
                    productCount={catalog.products.length}
                    onScanCatalog={() => {
                        clearPendingTransition();
                        setActiveModal(null);
                        setOrderConfirmationScannerVisible(false);
                        setScannerVisible(true);
                    }}
                    onOpenCatalog={() => transitionToModal("customerCatalog")}
                    onClearCatalog={handleClearCustomerCatalog}
                />

                <CatalogScannerModal
                    visible={scannerVisible}
                    onClose={() => setScannerVisible(false)}
                    onImported={async () => {
                        orders.clearCart();
                        await catalog.loadLocalCatalog();

                        setScannerVisible(false);
                        setTimeout(() => {
                            setActiveModal("customerCatalog");
                        }, MODAL_TRANSITION_MS);
                    }}
                />

                <CustomerCatalogModal
                    visible={activeModal === "customerCatalog"}
                    products={catalog.products}
                    categories={catalog.categories}
                    cartCount={orders.itemCount}
                    selectedCategoryId={catalog.selectedCategoryId}
                    search={catalog.search}
                    nameSort={catalog.nameSort}
                    priceSort={catalog.priceSort}
                    stockSort={catalog.stockSort}
                    onClose={closeActiveModal}
                    onProductPress={(product) => transitionToModal("productDetails", () => catalog.openProduct(product))}
                    onOpenCart={() => transitionToModal("cart")}
                    onSearchChange={catalog.setSearch}
                    onCategoryChange={catalog.setSelectedCategoryId}
                    onNameSortChange={catalog.setNameSort}
                    onPriceSortChange={catalog.setPriceSort}
                    onStockSortChange={catalog.setStockSort}
                />

                <ProductDetailsModal
                    visible={activeModal === "productDetails"}
                    product={catalog.selectedProduct}
                    isSeller={false}
                    onClose={closeActiveModal}
                    onEdit={catalog.openEdit}
                    onAdjustStock={catalog.openStock}
                    onDeactivate={catalog.deactivateProduct}
                    onBackToCatalog={reopenCustomerCatalog}
                    onAddToCart={(product) => {
                        orders.addToCart(product);
                        transitionToModal("customerCatalog");
                    }}
                    onAddToCartAndOpenCart={(product) => {
                        orders.addToCart(product);
                        transitionToModal("cart");
                    }}
                />

                <CartModal
                    visible={activeModal === "cart"}
                    items={orders.cartItems}
                    totalAmount={orders.totalAmount}
                    syncing={orders.syncing}
                    message={orders.message}
                    onClose={closeActiveModal}
                    onRemove={orders.removeFromCart}
                    onQuantityChange={orders.updateQuantity}
                    onCheckout={handleGenerateOrderQr}
                    onContinueShopping={reopenCustomerCatalog}
                />

                <OrderQrModal
                    visible={activeModal === "orderQr"}
                    orderQr={orders.generatedOrderQr}
                    onClose={() => {
                        closeActiveModal();
                        orders.clearGeneratedOrderQr();
                    }}
                    onScanConfirmation={handleOpenConfirmationScannerFromClient}
                />

                <OrderConfirmationScannerModal
                    visible={orderConfirmationScannerVisible}
                    onClose={() => {
                        setOrderConfirmationScannerVisible(false);

                        if (orders.generatedOrderQr) {
                            setTimeout(() => {
                                setActiveModal("orderQr");
                            }, MODAL_TRANSITION_MS);
                        }
                    }}
                    onConfirmed={handleClientScannedSellerConfirmation}
                />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="px-6 pb-10 pt-14">
                    <PageHeader eyebrow="Catálogo" title="Minha loja" />

                    <SyncStatusCard
                        variant="contextual"
                        title="Alterações locais do catálogo"
                        onlineLabel={catalogSyncStatus.network.isConnected ? "Online" : "Offline"}
                        onlineColor={catalogSyncStatus.network.color}
                        isConnected={catalogSyncStatus.network.isConnected}
                        isSyncing={catalogSyncStatus.isSyncing}
                        pendingCount={catalogSyncStatus.pendingCount}
                        rejectedCount={catalogSyncStatus.rejectedCount}
                        pendingLabel="alteração(ões) para enviar"
                        lastError={catalogSyncStatus.scopedLastError}
                        syncingNow={catalogSyncStatus.syncingNow}
                    />

                    <CatalogToolbar
                        categories={catalog.categories}
                        selectedCategoryId={catalog.selectedCategoryId}
                        search={catalog.search}
                        nameSort={catalog.nameSort}
                        priceSort={catalog.priceSort}
                        stockSort={catalog.stockSort}
                        isConnected={catalog.network.isConnected}
                        networkLabel={catalog.network.label}
                        refreshing={catalog.refreshing}
                        pendingCount={catalog.pendingCount}
                        isSeller={!!catalog.isSeller}
                        onSearchChange={catalog.setSearch}
                        onCategoryChange={catalog.setSelectedCategoryId}
                        onNameSortChange={catalog.setNameSort}
                        onPriceSortChange={catalog.setPriceSort}
                        onStockSortChange={catalog.setStockSort}
                        onRefresh={catalog.refreshCatalog}
                        onSync={catalog.syncPendingChanges}
                        onDeleteCategory={catalog.removeCategory}
                        onSubmitCategory={catalog.submitCategory}
                    />

                    {catalog.message || catalog.error ? <Text className="mb-5 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{catalog.message || catalog.error}</Text> : null}
                    {orders.message ? <Text className="mb-5 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{orders.message}</Text> : null}

                    <View className="mb-5 gap-4 rounded-3xl border border-border bg-card p-4">
                        <View className="flex-row items-center justify-between gap-3">
                            <View className="flex-1">
                                <Text className="text-lg font-black text-foreground">Produtos</Text>
                                <Text className="mt-1 text-sm text-muted-foreground">{catalog.products.length} item(ns) disponíveis nesta loja.</Text>
                            </View>

                            <View className="rounded-2xl bg-muted px-3 py-2">
                                <Text className="text-xs font-bold text-muted-foreground">{catalog.network.label}</Text>
                            </View>
                        </View>

                        <View className="flex-row flex-wrap gap-3">
                            <Pressable onPress={() => transitionToModal("productForm", catalog.openCreate)} className="min-h-14 min-w-[47%] flex-1 flex-row items-center gap-3 rounded-2xl bg-primary px-4 py-3">
                                <Ionicons name="add" size={18} color={whiteIcon} />
                                <View className="flex-1">
                                    <Text className="text-xs font-black uppercase tracking-[1px] text-white">Novo produto</Text>
                                    <Text className="mt-1 text-xs text-white/80">Cadastrar item no catálogo local</Text>
                                </View>
                            </Pressable>

                            <Pressable onPress={() => transitionToModal("catalogQr")} className="min-h-14 min-w-[47%] flex-1 flex-row items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                                <Ionicons name="qr-code-outline" size={18} color={iconColor} />
                                <View className="flex-1">
                                    <Text className="text-xs font-black uppercase tracking-[1px] text-card-foreground">QR do catálogo</Text>
                                    <Text className="mt-1 text-xs text-muted-foreground">Compartilhar cardápio com cliente</Text>
                                </View>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    setSellerConfirmationQrValue(null);
                                    setSellerConfirmationMessage(null);
                                    openFullScreenScanner(() => setOrderScannerVisible(true));
                                }}
                                className="min-h-14 min-w-[47%] flex-1 flex-row items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                            >
                                <Ionicons name="scan-outline" size={18} color={iconColor} />
                                <View className="flex-1">
                                    <Text className="text-xs font-black uppercase tracking-[1px] text-card-foreground">Ler pedido</Text>
                                    <Text className="mt-1 text-xs text-muted-foreground">Confirmar compra do cliente por QR</Text>
                                </View>
                            </Pressable>
                        </View>
                    </View>

                    <View className="gap-3">
                        {catalog.products.length > 0 ? (
                            catalog.products.map((product) => <ProductCard key={product.id} product={product} onPress={() => transitionToModal("productDetails", () => catalog.openProduct(product))} />)
                        ) : (
                            <View className="rounded-3xl border border-dashed border-border bg-card p-6">
                                <Text className="text-center text-base font-bold text-card-foreground">Nenhum produto encontrado</Text>
                                <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Atualize o catálogo, ajuste os filtros ou crie um produto.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            <CatalogQrModal visible={activeModal === "catalogQr"} storeId={catalog.catalogStoreId} qrValue={qrData.qrValue} categoryCount={qrData.categoryCount} productCount={qrData.productCount} onClose={closeActiveModal} />
            <OrderScannerModal visible={orderScannerVisible} onClose={() => setOrderScannerVisible(false)} onConfirmed={handleOrderConfirmedBySeller} />
            <OrderConfirmationQrModal visible={activeModal === "sellerConfirmationQr"} qrValue={sellerConfirmationQrValue} synced={sellerConfirmationSynced} message={sellerConfirmationMessage} onClose={handleCloseSellerConfirmationQr} />

            <ProductDetailsModal
                visible={activeModal === "productDetails"}
                product={catalog.selectedProduct}
                isSeller={!!catalog.isSeller}
                onClose={closeActiveModal}
                onEdit={() => transitionToModal("productForm", catalog.openEdit)}
                onAdjustStock={() => transitionToModal("stockAdjust", catalog.openStock)}
                onDeactivate={catalog.deactivateProduct}
            />

            <ProductFormModal
                visible={activeModal === "productForm"}
                mode={catalog.formMode}
                categories={catalog.categories}
                initialCategoryId={catalog.selectedCategoryId ?? catalog.categories[0]?.id ?? ""}
                initialProduct={catalog.formMode === "edit" ? catalog.selectedProduct : null}
                onClose={closeActiveModal}
                onSubmit={async (values) => {
                    await catalog.submitProduct(values);
                    closeActiveModal();
                }}
            />

            <StockAdjustModal
                visible={activeModal === "stockAdjust"}
                product={catalog.selectedProduct}
                onClose={closeActiveModal}
                onConfirm={async (quantityDelta) => {
                    await catalog.adjustStock(quantityDelta);
                    closeActiveModal();
                }}
            />
        </View>
    );
}
