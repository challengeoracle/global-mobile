import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { CustomerCatalogModal } from "@/src/domains/catalog/components/customer-catalog-modal";
import { ProductDetailsModal } from "@/src/domains/catalog/components/product-details-modal";
import { decodeCatalogQr } from "@/src/domains/catalog/utils/catalog-qr";
import { CatalogProduct, CatalogQrPayload } from "@/src/domains/catalog/types/catalog";
import { useCatalogScreen } from "@/src/domains/catalog/hooks/use-catalog-screen";
import { CartModal } from "@/src/domains/order/components/cart-modal";
import { OrderConfirmationScannerModal } from "@/src/domains/order/components/order-confirmation-scanner-modal";
import { OrderQrModal } from "@/src/domains/order/components/order-qr-modal";
import { useOrderFlow } from "@/src/domains/order/hooks/use-order-flow";
import { PageHeader } from "@/src/shared/components/ui/page-header";
import { QrScannerModal } from "@/src/shared/components/scanner/qr-scanner-modal";

export default function SellerBuyScreen() {
    const { colorScheme } = useColorScheme();
    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const catalog = useCatalogScreen();

    const [scannerVisible, setScannerVisible] = useState(false);
    const [catalogVisible, setCatalogVisible] = useState(false);
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [cartVisible, setCartVisible] = useState(false);
    const [orderQrVisible, setOrderQrVisible] = useState(false);
    const [confirmationScannerVisible, setConfirmationScannerVisible] = useState(false);
    const [externalCatalog, setExternalCatalog] = useState<CatalogQrPayload | null>(null);

    const buyerOrders = useOrderFlow(externalCatalog?.storeId ?? null);

    const externalCategories = useMemo(() => {
        if (!externalCatalog) {
            return [];
        }

        return externalCatalog.categories.map((category) => ({
            ...category,
            active: true,
            products: category.products.map((product) => ({
                ...product,
                active: true,
            })),
        }));
    }, [externalCatalog]);

    const externalProducts = useMemo(() => {
        if (!externalCatalog) {
            return [];
        }

        const selectedCategory = catalog.selectedCategoryId ? externalCategories.find((category) => category.id === catalog.selectedCategoryId) : null;
        const baseProducts = selectedCategory ? selectedCategory.products : externalCategories.flatMap((category) => category.products);
        const term = catalog.search.trim().toLowerCase();

        const filtered = baseProducts.filter((product) => {
            if (!term) return true;
            return product.name.toLowerCase().includes(term) || product.description?.toLowerCase().includes(term);
        });

        return [...filtered].sort((a, b) => {
            if (catalog.priceSort === "ASC") return b.price - a.price;
            if (catalog.priceSort === "DESC") return a.price - b.price;
            if (catalog.stockSort === "ASC") return b.stockQuantity - a.stockQuantity;
            if (catalog.stockSort === "DESC") return a.stockQuantity - b.stockQuantity;
            if (catalog.nameSort === "DESC") return b.name.localeCompare(a.name);
            return a.name.localeCompare(b.name);
        });
    }, [externalCatalog, externalCategories, catalog.selectedCategoryId, catalog.search, catalog.priceSort, catalog.stockSort, catalog.nameSort]);

    function resetFlow() {
        setCatalogVisible(false);
        setDetailsVisible(false);
        setCartVisible(false);
        setOrderQrVisible(false);
        setConfirmationScannerVisible(false);
        setExternalCatalog(null);
        buyerOrders.clearCart();
        buyerOrders.clearGeneratedOrderQr();
    }

    async function handleCheckout() {
        const generated = await buyerOrders.generateOrderQr();

        if (generated) {
            setCartVisible(false);
            setOrderQrVisible(true);
        }
    }

    return (
        <View className="flex-1 bg-background">
            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="px-6 pb-10 pt-14">
                    <Pressable onPress={() => router.back()} className="mb-6 h-11 w-11 items-center justify-center rounded-2xl bg-card">
                        <Ionicons name="arrow-back" size={20} color={iconColor} />
                    </Pressable>

                    <PageHeader eyebrow="Compras do vendedor" title="Comprar em outra loja" description="Escaneie o catálogo de outra loja, monte o pedido e gere o QR Code da compra usando sua carteira pessoal." />

                    <Pressable onPress={() => setScannerVisible(true)} className="rounded-3xl bg-primary p-5">
                        <Text className="text-sm font-black uppercase tracking-[2px] text-white">Escanear catálogo</Text>
                        <Text className="mt-2 text-sm leading-6 text-white/80">Use o QR Code da outra loja para carregar os produtos apenas nesta compra.</Text>
                    </Pressable>

                    {buyerOrders.message ? <Text className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{buyerOrders.message}</Text> : null}
                    {externalCatalog ? <Text className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">Catálogo da loja {externalCatalog.storeId.slice(0, 8)} carregado. Você pode comprar normalmente, mas a própria loja continua bloqueada.</Text> : null}
                </View>
            </ScrollView>

            <QrScannerModal
                visible={scannerVisible}
                eyebrow="Compra"
                title="Escanear catálogo"
                permissionTitle="Permissão da câmera"
                permissionDescription="Precisamos da câmera para ler o QR Code do catálogo da outra loja."
                instructionTitle="Aponte para o QR do vendedor"
                instructionDescription="Esse catálogo será usado apenas durante esta compra."
                successTone="white"
                onClose={() => setScannerVisible(false)}
                onScan={async (data) => {
                    const payload = decodeCatalogQr(data);

                    if (payload.storeId === catalog.user?.storeId) {
                        throw new Error("Você não pode comprar da própria loja.");
                    }

                    setExternalCatalog(payload);
                    setScannerVisible(false);
                    setCatalogVisible(true);

                    return {
                        successMessage: "Catálogo carregado com sucesso.",
                        closeOnSuccess: true,
                    };
                }}
            />

            {externalCatalog ? (
                <>
                    <CustomerCatalogModal
                        visible={catalogVisible}
                        products={externalProducts as CatalogProduct[]}
                        categories={externalCategories}
                        cartCount={buyerOrders.itemCount}
                        selectedCategoryId={catalog.selectedCategoryId}
                        search={catalog.search}
                        nameSort={catalog.nameSort}
                        priceSort={catalog.priceSort}
                        stockSort={catalog.stockSort}
                        onClose={resetFlow}
                        onProductPress={(product) => {
                            catalog.openProduct(product as CatalogProduct);
                            setCatalogVisible(false);
                            setDetailsVisible(true);
                        }}
                        onOpenCart={() => {
                            setCatalogVisible(false);
                            setCartVisible(true);
                        }}
                        onSearchChange={catalog.setSearch}
                        onCategoryChange={catalog.setSelectedCategoryId}
                        onNameSortChange={catalog.setNameSort}
                        onPriceSortChange={catalog.setPriceSort}
                        onStockSortChange={catalog.setStockSort}
                    />

                    <ProductDetailsModal
                        visible={detailsVisible}
                        product={catalog.selectedProduct}
                        isSeller={false}
                        onClose={resetFlow}
                        onEdit={catalog.openEdit}
                        onAdjustStock={catalog.openStock}
                        onDeactivate={catalog.deactivateProduct}
                        onBackToCatalog={() => {
                            setDetailsVisible(false);
                            setCatalogVisible(true);
                        }}
                        onAddToCart={(product) => {
                            buyerOrders.addToCart(product);
                            setDetailsVisible(false);
                            setCatalogVisible(true);
                        }}
                        onAddToCartAndOpenCart={(product) => {
                            buyerOrders.addToCart(product);
                            setDetailsVisible(false);
                            setCartVisible(true);
                        }}
                    />

                    <CartModal
                        visible={cartVisible}
                        items={buyerOrders.cartItems}
                        totalAmount={buyerOrders.totalAmount}
                        syncing={buyerOrders.syncing}
                        message={buyerOrders.message}
                        onClose={resetFlow}
                        onRemove={buyerOrders.removeFromCart}
                        onQuantityChange={buyerOrders.updateQuantity}
                        onCheckout={handleCheckout}
                        onContinueShopping={() => {
                            setCartVisible(false);
                            setCatalogVisible(true);
                        }}
                    />

                    <OrderQrModal
                        visible={orderQrVisible}
                        orderQr={buyerOrders.generatedOrderQr}
                        onClose={resetFlow}
                        onScanConfirmation={() => {
                            setOrderQrVisible(false);
                            setConfirmationScannerVisible(true);
                        }}
                    />

                    <OrderConfirmationScannerModal
                        visible={confirmationScannerVisible}
                        onClose={() => {
                            setConfirmationScannerVisible(false);
                            setOrderQrVisible(true);
                        }}
                        onConfirmed={async () => {
                            resetFlow();
                            router.push("/(tabs)/orders");
                        }}
                    />
                </>
            ) : null}
        </View>
    );
}
