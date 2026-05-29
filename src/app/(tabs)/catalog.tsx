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
import { PageHeader } from "@/src/components/ui/page-header";

import { clearCatalog } from "@/src/database/repositories/catalog-repository";
import { useCatalogScreen } from "@/src/hooks/use-catalog-screen";
import { buildCatalogQrPayload, encodeCatalogQr } from "@/src/utils/catalog-qr";

export default function CatalogScreen() {
    const catalog = useCatalogScreen();
    const { colorScheme } = useColorScheme();

    const iconColor = colorScheme === "dark" ? "#f8fafc" : "#0f172a";
    const whiteIcon = "#ffffff";

    const [qrVisible, setQrVisible] = useState(false);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [customerCatalogVisible, setCustomerCatalogVisible] = useState(false);

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
        await clearCatalog();
        await catalog.loadLocalCatalog();
        setCustomerCatalogVisible(false);
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
                <CustomerCatalogImportScreen hasImportedCatalog={catalog.products.length > 0} productCount={catalog.products.length} onScanCatalog={() => setScannerVisible(true)} onOpenCatalog={() => setCustomerCatalogVisible(true)} onClearCatalog={handleClearCustomerCatalog} />

                <CatalogScannerModal
                    visible={scannerVisible}
                    onClose={() => setScannerVisible(false)}
                    onImported={async () => {
                        await catalog.loadLocalCatalog();
                        setCustomerCatalogVisible(true);
                    }}
                />

                <CustomerCatalogModal visible={customerCatalogVisible} products={catalog.products} onClose={() => setCustomerCatalogVisible(false)} onProductPress={catalog.openProduct} />

                <ProductDetailsModal visible={catalog.detailsVisible} product={catalog.selectedProduct} isSeller={false} onClose={() => catalog.setDetailsVisible(false)} onEdit={catalog.openEdit} onAdjustStock={catalog.openStock} onDeactivate={catalog.deactivateProduct} />
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
                        onSubmitCategory={catalog.submitCategory} // Passando o novo método unificado para o Toolbar
                    />

                    {catalog.message || catalog.error ? <Text className="mb-5 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{catalog.message || catalog.error}</Text> : null}

                    <View className="mb-5 flex-row items-center justify-between">
                        <View>
                            <Text className="text-lg font-black text-foreground">Produtos</Text>

                            <Text className="mt-1 text-sm text-muted-foreground">{catalog.products.length} item(ns)</Text>
                        </View>

                        <View className="flex-row gap-2">
                            <Pressable onPress={() => setQrVisible(true)} className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card">
                                <Ionicons name="qr-code-outline" size={18} color={iconColor} />
                            </Pressable>

                            {/* Botão de criar Categoria removido daqui */}

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

            {/* CategoryFormModal removido daqui, pois agora é gerenciado pelo CatalogToolbar */}

            <ProductDetailsModal visible={catalog.detailsVisible} product={catalog.selectedProduct} isSeller={!!catalog.isSeller} onClose={() => catalog.setDetailsVisible(false)} onEdit={catalog.openEdit} onAdjustStock={catalog.openStock} onDeactivate={catalog.deactivateProduct} />

            <ProductFormModal visible={catalog.formVisible} mode={catalog.formMode} categories={catalog.categories} initialCategoryId={catalog.selectedCategoryId ?? catalog.categories[0]?.id ?? ""} initialProduct={catalog.formMode === "edit" ? catalog.selectedProduct : null} onClose={() => catalog.setFormVisible(false)} onSubmit={catalog.submitProduct} />

            <StockAdjustModal visible={catalog.stockVisible} product={catalog.selectedProduct} onClose={() => catalog.setStockVisible(false)} onConfirm={catalog.adjustStock} />
        </View>
    );
}
