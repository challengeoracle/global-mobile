import { useEffect, useMemo, useState } from "react";

import { SortDirection } from "@/src/domains/catalog/components/catalog-toolbar";
import { CategoryFormValues } from "@/src/domains/catalog/components/category-form-modal";
import { ProductFormValues } from "@/src/domains/catalog/components/product-form-modal";
import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { useCatalog } from "@/src/domains/catalog/hooks/use-catalog";
import { adjustLocalProductStock, createLocalCategory, createLocalProduct, deactivateLocalCategory, deactivateLocalProduct, getCatalogStoreIdFromLocal, normalizeLegacyCatalogIds, updateLocalCategory, updateLocalProduct } from "@/src/domains/catalog/repositories/catalog-repository";
import { CatalogCategory, CatalogProduct, CatalogSyncItem } from "@/src/domains/catalog/types/catalog";
import { countPendingCatalogChanges, enqueueCatalogChange } from "@/src/domains/sync/repositories/sync-queue-repository";
import { scheduleSync, syncCatalog } from "@/src/domains/sync/services/sync-engine";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";

function now() {
    return new Date().toISOString();
}

function sortByName(a: CatalogProduct, b: CatalogProduct, invert = false) {
    return invert ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
}

function getErrorMessage(err: unknown, fallback: string) {
    return err instanceof Error ? err.message : fallback;
}

export function useCatalogScreen() {
    const { user } = useAuth();
    const network = useNetworkStatus();
    const isSeller = user?.role === "SELLER";

    const catalog = useCatalog({
        autoLoad: false,
    });

    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [formVisible, setFormVisible] = useState(false);
    const [stockVisible, setStockVisible] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [search, setSearch] = useState("");
    const [nameSort, setNameSort] = useState<SortDirection>("NONE");
    const [priceSort, setPriceSort] = useState<SortDirection>("NONE");
    const [stockSort, setStockSort] = useState<SortDirection>("NONE");
    const [message, setMessage] = useState("");
    const [pendingCount, setPendingCount] = useState(0);
    const [categoryFormVisible, setCategoryFormVisible] = useState(false);
    const [categoryFormMode, setCategoryFormMode] = useState<"create" | "edit">("create");
    const [selectedCategory, setSelectedCategory] = useState<CatalogCategory | null>(null);

    const products = useMemo(() => {
        const baseProducts = selectedCategoryId ? (catalog.categories.find((category) => category.id === selectedCategoryId)?.products ?? []) : catalog.categories.flatMap((category) => category.products);
        const term = search.trim().toLowerCase();

        const filtered = baseProducts.filter((product) => {
            if (!term) return true;
            return product.name.toLowerCase().includes(term) || product.description?.toLowerCase().includes(term);
        });

        return [...filtered].sort((a, b) => {
            if (priceSort === "ASC") return b.price - a.price;
            if (priceSort === "DESC") return a.price - b.price;
            if (stockSort === "ASC") return b.stockQuantity - a.stockQuantity;
            if (stockSort === "DESC") return a.stockQuantity - b.stockQuantity;
            if (nameSort === "DESC") return sortByName(a, b, true);
            return sortByName(a, b, false);
        });
    }, [catalog.categories, selectedCategoryId, search, nameSort, priceSort, stockSort]);

    async function refreshPendingCount() {
        const total = await countPendingCatalogChanges();
        setPendingCount(total);
        return total;
    }

    async function reloadLocalState(successMessage?: string) {
        await catalog.loadLocalCatalog();
        await refreshPendingCount();

        if (successMessage) {
            setMessage(successMessage);
        }
    }

    async function addCatalogQueue(change: Omit<CatalogSyncItem, "localUpdatedAt">) {
        await enqueueCatalogChange({
            ...change,
            localUpdatedAt: now(),
        });
    }

    async function resolveCatalogStoreId() {
        if (catalog.catalogStoreId) {
            return catalog.catalogStoreId;
        }

        const localStoreId = await getCatalogStoreIdFromLocal();
        if (localStoreId) {
            return localStoreId;
        }

        if (user?.storeId) {
            return user.storeId;
        }

        if (network.canAttemptRemote) {
            const remoteCatalog = await catalog.pullRemoteCatalog();
            return remoteCatalog.storeId;
        }

        throw new Error("Loja não encontrada para salvar o catálogo.");
    }

    function scheduleCatalogSync() {
        if (!network.canAttemptRemote || !isSeller) return;

        scheduleSync({
            scopes: ["catalog"],
            isConnected: network.canAttemptRemote,
            canSync: isSeller,
            pullCatalogAfterSync: true,
            forceRetry: true,
            onComplete: async () => {
                await catalog.loadLocalCatalog();
                await refreshPendingCount();
            },
        });
    }

    async function saveLocalAndAutoSync(successMessage: string) {
        await reloadLocalState(successMessage);
        scheduleCatalogSync();
    }

    useEffect(() => {
        async function prepareLocalCatalog() {
            await normalizeLegacyCatalogIds();
            await catalog.loadLocalCatalog();
            await refreshPendingCount();
        }

        prepareLocalCatalog();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        scheduleCatalogSync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSeller, network.canAttemptRemote]);

    async function refreshCatalog() {
        try {
            setMessage("");

            if (!network.canAttemptRemote) {
                await catalog.loadLocalCatalog();
                await refreshPendingCount();
                setMessage("Sem internet no momento. Exibindo os produtos disponíveis.");
                return;
            }

            if (isSeller) {
                const result = await syncCatalog({
                    isConnected: network.canAttemptRemote,
                    canSync: isSeller,
                    pullCatalogAfterSync: true,
                    forceRetry: true,
                });

                await catalog.loadLocalCatalog();
                await refreshPendingCount();
                setMessage(result.message);
                return;
            }

            await catalog.loadLocalCatalog();
            await refreshPendingCount();
            setMessage("Catálogo atualizado.");
        } catch (err) {
            await catalog.loadLocalCatalog();
            await refreshPendingCount();
            setMessage(getErrorMessage(err, "Erro ao atualizar catálogo."));
        }
    }

    async function syncPendingChanges() {
        if (!isSeller) {
            await catalog.loadLocalCatalog();
            await refreshPendingCount();
            setMessage("Catálogo atualizado.");
            return;
        }

        const result = await syncCatalog({
            isConnected: network.canAttemptRemote,
            canSync: isSeller,
            pullCatalogAfterSync: true,
            forceRetry: true,
        });

        await catalog.loadLocalCatalog();
        await refreshPendingCount();
        setMessage(result.message);
    }

    function openProduct(product: CatalogProduct) {
        setSelectedProduct(product);
        setDetailsVisible(true);
    }

    function openCreate() {
        setSelectedProduct(null);
        setFormMode("create");
        setFormVisible(true);
    }

    function openEdit() {
        setFormMode("edit");
        setDetailsVisible(false);
        setFormVisible(true);
    }

    function openStock() {
        setDetailsVisible(false);
        setStockVisible(true);
    }

    async function submitProduct(values: ProductFormValues) {
        const storeId = await resolveCatalogStoreId();
        const price = Number(values.price);
        const stockQuantity = Number(values.stockQuantity);

        if (formMode === "create") {
            const productId = await createLocalProduct({
                categoryId: values.categoryId,
                storeId,
                name: values.name,
                description: values.description,
                price,
                stockQuantity,
            });

            await addCatalogQueue({
                operation: "PRODUCT_CREATE",
                productId,
                categoryId: values.categoryId,
                name: values.name,
                description: values.description,
                price,
                stockQuantity,
            });
        }

        if (formMode === "edit" && selectedProduct) {
            await updateLocalProduct({
                productId: selectedProduct.id,
                categoryId: values.categoryId,
                name: values.name,
                description: values.description,
                price,
                stockQuantity,
            });

            await addCatalogQueue({
                operation: "PRODUCT_UPDATE",
                productId: selectedProduct.id,
                categoryId: values.categoryId,
                name: values.name,
                description: values.description,
                price,
                stockQuantity,
            });
        }

        await saveLocalAndAutoSync("Produto salvo.");
    }

    async function adjustStock(quantityDelta: number) {
        if (!selectedProduct) return;

        await adjustLocalProductStock(selectedProduct.id, quantityDelta);
        await addCatalogQueue({
            operation: "STOCK_UPDATE",
            productId: selectedProduct.id,
            quantityDelta,
        });

        await saveLocalAndAutoSync("Estoque ajustado.");
    }

    async function deactivateProduct() {
        if (!selectedProduct) return;

        await deactivateLocalProduct(selectedProduct.id);
        await addCatalogQueue({
            operation: "PRODUCT_DEACTIVATE",
            productId: selectedProduct.id,
        });

        setDetailsVisible(false);
        await saveLocalAndAutoSync("Produto desativado.");
    }

    function openCreateCategory() {
        setSelectedCategory(null);
        setCategoryFormMode("create");
        setCategoryFormVisible(true);
    }

    function openEditCategory(category: CatalogCategory) {
        setSelectedCategory(category);
        setCategoryFormMode("edit");
        setCategoryFormVisible(true);
    }

    async function submitCategory(values: CategoryFormValues) {
        if (categoryFormMode === "create") {
            const categoryId = await createLocalCategory({
                name: values.name,
                description: values.description || null,
            });

            await addCatalogQueue({
                operation: "CATEGORY_CREATE",
                categoryId,
                name: values.name,
                description: values.description || undefined,
            });

            await saveLocalAndAutoSync("Categoria criada.");
            return;
        }

        if (categoryFormMode === "edit" && selectedCategory) {
            await updateLocalCategory({
                categoryId: selectedCategory.id,
                name: values.name,
                description: values.description || null,
            });

            await addCatalogQueue({
                operation: "CATEGORY_UPDATE",
                categoryId: selectedCategory.id,
                name: values.name,
                description: values.description || undefined,
            });

            await saveLocalAndAutoSync("Categoria atualizada.");
        }
    }

    async function removeCategory(category: CatalogCategory) {
        if (category.products.length > 0) {
            setMessage("Não é possível remover uma categoria com produtos.");
            return;
        }

        await deactivateLocalCategory(category.id);
        await addCatalogQueue({
            operation: "CATEGORY_DEACTIVATE",
            categoryId: category.id,
        });

        if (selectedCategoryId === category.id) {
            setSelectedCategoryId(null);
        }

        await saveLocalAndAutoSync("Categoria desativada.");
    }

    return {
        user,
        network,
        isSeller,
        categories: catalog.categories,
        loading: catalog.loading,
        refreshing: catalog.refreshing,
        error: catalog.error,
        lastSyncAt: catalog.lastSyncAt,
        catalogStoreId: catalog.catalogStoreId,
        loadLocalCatalog: catalog.loadLocalCatalog,
        selectedCategoryId,
        setSelectedCategoryId,
        selectedProduct,
        detailsVisible,
        setDetailsVisible,
        formVisible,
        setFormVisible,
        stockVisible,
        setStockVisible,
        formMode,
        search,
        setSearch,
        nameSort,
        setNameSort,
        priceSort,
        setPriceSort,
        stockSort,
        setStockSort,
        products,
        message,
        pendingCount,
        refreshCatalog,
        syncPendingChanges,
        openProduct,
        openCreate,
        openEdit,
        openStock,
        submitProduct,
        adjustStock,
        deactivateProduct,
        categoryFormVisible,
        setCategoryFormVisible,
        categoryFormMode,
        selectedCategory,
        openCreateCategory,
        openEditCategory,
        submitCategory,
        removeCategory,
    };
}
