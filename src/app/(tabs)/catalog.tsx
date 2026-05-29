import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { CatalogQrModal } from "@/src/components/catalog/catalog-qr-modal";
import { CatalogScannerModal } from "@/src/components/catalog/catalog-scanner-modal";
import { CatalogToolbar } from "@/src/components/catalog/catalog-toolbar";
import { CustomerCatalogImportScreen } from "@/src/components/catalog/customer-catalog-import-screen";
import { CustomerCatalogModal } from "@/src/components/catalog/customer-catalog-modal";
import { ProductCard } from "@/src/components/catalog/product-card";
import { ProductDetailsModal } from "@/src/components/catalog/product-details-modal";
import { ProductFormModal } from "@/src/components/catalog/product-form-modal";
import { StockAdjustModal } from "@/src/components/catalog/stock-adjust-modal";
import { CartModal } from "@/src/components/orders/cart-modal";
import { OrderConfirmationQrModal } from "@/src/components/orders/order-confirmation-qr-modal";
import { OrderConfirmationScannerModal } from "@/src/components/orders/order-confirmation-scanner-modal";
import { OrderQrModal } from "@/src/components/orders/order-qr-modal";
import { OrderScannerModal } from "@/src/components/orders/order-scanner-modal";
import { PageHeader } from "@/src/components/ui/page-header";

import { clearCatalog } from "@/src/database/repositories/catalog-repository";
import { buildOrderConfirmationPayloadFromLocal } from "@/src/database/repositories/order-repository";
import { useCatalogScreen } from "@/src/hooks/use-catalog-screen";
import { useOrderFlow } from "@/src/hooks/use-order-flow";
import { buildCatalogQrPayload, encodeCatalogQr } from "@/src/utils/catalog-qr";
import { buildOrderConfirmationQrPayload, encodeOrderQr } from "@/src/utils/order-qr";

export default function CatalogScreen() {
    const catalog = useCatalogScreen();
    const orders = useOrderFlow(catalog.catalogStoreId);

    const { colorScheme } = useColorScheme();

    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const whiteIcon = "#ffffff";

    const [qrVisible, setQrVisible] = useState(false);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [customerCatalogVisible, setCustomerCatalogVisible] = useState(false);
    const [cartVisible, setCartVisible] = useState(false);

    const [orderQrVisible, setOrderQrVisible] = useState(false);
    const [orderScannerVisible, setOrderScannerVisible] = useState(false);

    const [orderConfirmationScannerVisible, setOrderConfirmationScannerVisible] = useState(false);
    const [sellerConfirmationQrVisible, setSellerConfirmationQrVisible] = useState(false);
    const [sellerConfirmationQrValue, setSellerConfirmationQrValue] = useState<string | null>(null);
    const [sellerConfirmationSynced, setSellerConfirmationSynced] = useState(false);

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

    async function handleClearCustomerCatalog() {
        orders.clearCart();

        await clearCatalog();
        await catalog.loadLocalCatalog();

        setCustomerCatalogVisible(false);
        setCartVisible(false);
        setOrderQrVisible(false);
        setOrderConfirmationScannerVisible(false);
        orders.clearGeneratedOrderQr();
    }

    function handleOpenCustomerCatalog() {
        setCustomerCatalogVisible(true);
    }

    function handleOpenCart() {
        setCartVisible(true);
    }

    async function handleGenerateOrderQr() {
        const generated = await orders.generateOrderQr();

        if (generated) {
            // A MÁGICA ACONTECE AQUI:
            // Nós NÃO fechamos o carrinho (`setCartVisible(false)` foi removido).
            // O modal do QR Code simplesmente sobe por cima do carrinho de forma fluida.
            // Isso evita 100% dos bugs de animação travada do React Native.
            setOrderQrVisible(true);
        }
    }

    function handleOpenConfirmationScannerFromClient() {
        setOrderQrVisible(false);

        setTimeout(() => {
            setOrderConfirmationScannerVisible(true);
        }, 500);
    }

    // Fluxo final do CLIENTE - O cliente viu que o vendedor confirmou a venda
    async function handleClientScannedSellerConfirmation() {
        // AQUI SIM, com a venda salva, fechamos todas as janelas que estavam empilhadas
        setOrderConfirmationScannerVisible(false);
        setOrderQrVisible(false);
        setCartVisible(false);
        setCustomerCatalogVisible(false);

        // Limpamos tudo para a próxima compra
        orders.clearGeneratedOrderQr();
        orders.clearCart();

        await orders.refreshPendingOrderCount();
        await catalog.loadLocalCatalog();
    }

    // Fluxo do VENDEDOR - Escaneando o QR do Cliente para receber o pedido
    async function handleOrderConfirmedBySeller(localOrderId: string) {
        setOrderScannerVisible(false);

        await orders.refreshPendingOrderCount();
        await catalog.loadLocalCatalog();

        let synced = false;

        if (catalog.network.isConnected) {
            synced = await orders.syncPendingOrders(false);

            await orders.refreshPendingOrderCount();
            await catalog.loadLocalCatalog();
        }

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
            items: confirmation.items,
        });

        setTimeout(() => {
            setSellerConfirmationQrValue(encodeOrderQr(qrPayload));
            setSellerConfirmationSynced(synced);
            setSellerConfirmationQrVisible(true);
        }, 500);
    }

    function handleCloseSellerConfirmationQr() {
        setSellerConfirmationQrVisible(false);
        setSellerConfirmationQrValue(null);
        setSellerConfirmationSynced(false);
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
                        setCustomerCatalogVisible(false);
                        setCartVisible(false);
                        setOrderQrVisible(false);
                        setOrderConfirmationScannerVisible(false);
                        setScannerVisible(true);
                    }}
                    onOpenCatalog={handleOpenCustomerCatalog}
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
                            setCustomerCatalogVisible(true);
                        }, 500);
                    }}
                />

                <CustomerCatalogModal visible={customerCatalogVisible} products={catalog.products} cartCount={orders.itemCount} onClose={() => setCustomerCatalogVisible(false)} onProductPress={catalog.openProduct} onOpenCart={handleOpenCart} />

                <ProductDetailsModal
                    visible={catalog.detailsVisible}
                    product={catalog.selectedProduct}
                    isSeller={false}
                    onClose={() => catalog.setDetailsVisible(false)}
                    onEdit={catalog.openEdit}
                    onAdjustStock={catalog.openStock}
                    onDeactivate={catalog.deactivateProduct}
                    onAddToCart={(product) => {
                        orders.addToCart(product);
                        catalog.setDetailsVisible(false);
                    }}
                />

                <CartModal visible={cartVisible} items={orders.cartItems} totalAmount={orders.totalAmount} syncing={orders.syncing} message={orders.message} onClose={() => setCartVisible(false)} onRemove={orders.removeFromCart} onQuantityChange={orders.updateQuantity} onCheckout={handleGenerateOrderQr} />

                <OrderQrModal
                    visible={orderQrVisible}
                    orderQr={orders.generatedOrderQr}
                    onClose={() => {
                        // Se o cliente fechar o QR Code sem querer, ele volta pro carrinho com os itens.
                        setOrderQrVisible(false);
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
                                setOrderQrVisible(true);
                            }, 500);
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

                    <View className="mb-5 flex-row items-center justify-between">
                        <View>
                            <Text className="text-lg font-black text-foreground">Produtos</Text>

                            <Text className="mt-1 text-sm text-muted-foreground">{catalog.products.length} item(ns)</Text>
                        </View>

                        <View className="flex-row gap-2">
                            <Pressable
                                onPress={() => {
                                    setSellerConfirmationQrVisible(false);
                                    setSellerConfirmationQrValue(null);
                                    setOrderScannerVisible(true);
                                }}
                                className="h-11 flex-row items-center gap-2 rounded-2xl border border-border bg-card px-4"
                            >
                                <Ionicons name="scan-outline" size={18} color={iconColor} />

                                <Text className="text-xs font-black uppercase tracking-[1px] text-card-foreground">Pedido</Text>
                            </Pressable>

                            <Pressable onPress={() => setQrVisible(true)} className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card">
                                <Ionicons name="qr-code-outline" size={18} color={iconColor} />
                            </Pressable>

                            <Pressable onPress={catalog.openCreate} className="h-11 flex-row items-center gap-2 rounded-2xl bg-primary px-4">
                                <Ionicons name="add" size={18} color={whiteIcon} />

                                <Text className="text-xs font-black uppercase tracking-[1px] text-white">Produto</Text>
                            </Pressable>
                        </View>
                    </View>

                    <View className="gap-3">
                        {catalog.products.length > 0 ? (
                            catalog.products.map((product) => <ProductCard key={product.id} product={product} onPress={() => catalog.openProduct(product)} />)
                        ) : (
                            <View className="rounded-3xl border border-dashed border-border bg-card p-6">
                                <Text className="text-center text-base font-bold text-card-foreground">Nenhum produto encontrado</Text>

                                <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">Atualize o catálogo, ajuste os filtros ou crie um produto.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            <CatalogQrModal visible={qrVisible} storeId={catalog.catalogStoreId} qrValue={qrData.qrValue} categoryCount={qrData.categoryCount} productCount={qrData.productCount} onClose={() => setQrVisible(false)} />

            <OrderScannerModal visible={orderScannerVisible} onClose={() => setOrderScannerVisible(false)} onConfirmed={handleOrderConfirmedBySeller} />

            <OrderConfirmationQrModal visible={sellerConfirmationQrVisible} qrValue={sellerConfirmationQrValue} synced={sellerConfirmationSynced} onClose={handleCloseSellerConfirmationQr} />

            <ProductDetailsModal visible={catalog.detailsVisible} product={catalog.selectedProduct} isSeller={!!catalog.isSeller} onClose={() => catalog.setDetailsVisible(false)} onEdit={catalog.openEdit} onAdjustStock={catalog.openStock} onDeactivate={catalog.deactivateProduct} />

            <ProductFormModal visible={catalog.formVisible} mode={catalog.formMode} categories={catalog.categories} initialCategoryId={catalog.selectedCategoryId ?? catalog.categories[0]?.id ?? ""} initialProduct={catalog.formMode === "edit" ? catalog.selectedProduct : null} onClose={() => catalog.setFormVisible(false)} onSubmit={catalog.submitProduct} />

            <StockAdjustModal visible={catalog.stockVisible} product={catalog.selectedProduct} onClose={() => catalog.setStockVisible(false)} onConfirm={catalog.adjustStock} />
        </View>
    );
}
