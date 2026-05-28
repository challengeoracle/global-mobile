import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { CatalogQrModal } from "@/src/components/catalog/catalog-qr-modal";
import { CatalogScannerModal } from "@/src/components/catalog/catalog-scanner-modal";
import { CatalogToolbar } from "@/src/components/catalog/catalog-toolbar";
import { CustomerCatalogImportScreen } from "@/src/components/catalog/customer-catalog-import-screen";
import { ProductCard } from "@/src/components/catalog/product-card";
import { ProductDetailsModal } from "@/src/components/catalog/product-details-modal";
import { ProductFormModal } from "@/src/components/catalog/product-form-modal";
import { StockAdjustModal } from "@/src/components/catalog/stock-adjust-modal";
import { PageHeader } from "@/src/components/ui/page-header";

import { useCatalogScreen } from "@/src/hooks/use-catalog-screen";

export default function CatalogScreen() {
    const catalog = useCatalogScreen();

    const [qrVisible, setQrVisible] = useState(false);
    const [scannerVisible, setScannerVisible] = useState(false);

    if (catalog.loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color="rgb(var(--primary))" size="large" />
            </View>
        );
    }

    if (!catalog.isSeller) {
        return (
            <View className="flex-1 bg-background">
                <CustomerCatalogImportScreen products={catalog.products} onScanCatalog={() => setScannerVisible(true)} onProductPress={catalog.openProduct} />

                <CatalogScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onImported={catalog.loadLocalCatalog} />

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
                    />

                    {catalog.message || catalog.error ? <Text className="mb-5 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">{catalog.message || catalog.error}</Text> : null}

                    <View className="mb-5 flex-row items-center justify-between">
                        <View>
                            <Text className="text-lg font-black text-foreground">Produtos</Text>
                            <Text className="mt-1 text-sm text-muted-foreground">{catalog.products.length} item(ns)</Text>
                        </View>

                        <View className="flex-row gap-2">
                            <Pressable onPress={() => setQrVisible(true)} className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card">
                                <Ionicons name="qr-code-outline" size={18} color="rgb(var(--foreground))" />
                            </Pressable>

                            <Pressable onPress={catalog.openCreate} className="h-11 flex-row items-center gap-2 rounded-2xl bg-primary px-4">
                                <Ionicons name="add" size={18} color="#fff" />

                                <Text className="text-xs font-black uppercase tracking-[1px] text-primary-foreground">Produto</Text>
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

            <CatalogQrModal visible={qrVisible} storeId={catalog.catalogStoreId} categories={catalog.categories} onClose={() => setQrVisible(false)} />

            <ProductDetailsModal visible={catalog.detailsVisible} product={catalog.selectedProduct} isSeller={!!catalog.isSeller} onClose={() => catalog.setDetailsVisible(false)} onEdit={catalog.openEdit} onAdjustStock={catalog.openStock} onDeactivate={catalog.deactivateProduct} />

            <ProductFormModal visible={catalog.formVisible} mode={catalog.formMode} categories={catalog.categories} initialCategoryId={catalog.selectedCategoryId ?? catalog.categories[0]?.id ?? ""} initialProduct={catalog.formMode === "edit" ? catalog.selectedProduct : null} onClose={() => catalog.setFormVisible(false)} onSubmit={catalog.submitProduct} />

            <StockAdjustModal visible={catalog.stockVisible} product={catalog.selectedProduct} onClose={() => catalog.setStockVisible(false)} onConfirm={catalog.adjustStock} />
        </View>
    );
}
