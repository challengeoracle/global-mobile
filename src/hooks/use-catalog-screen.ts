import { useEffect, useMemo, useRef, useState } from "react";

import { SortDirection } from "@/src/components/catalog/catalog-toolbar";
import { CategoryFormValues } from "@/src/components/catalog/category-form-modal";
import { ProductFormValues } from "@/src/components/catalog/product-form-modal";
import { useAuth } from "@/src/contexts/auth-context";
import { adjustLocalProductStock, createLocalCategory, createLocalProduct, deactivateLocalCategory, deactivateLocalProduct, getCatalogStoreIdFromLocal, normalizeLegacyCatalogIds, updateLocalCategory, updateLocalProduct } from "@/src/database/repositories/catalog-repository";
import { enqueueCatalogChange, getPendingCatalogChanges, markCatalogChangeRejected, markCatalogChangeSynced } from "@/src/database/repositories/sync-queue-repository";
import { useNetworkStatus } from "@/src/hooks/use-network-status";
import { syncCatalog } from "@/src/services/sales-service";
import { CatalogCategory, CatalogProduct, CatalogSyncItem } from "@/src/types/sales";
import { useCatalog } from "./use-catalog";

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
        autoLoad: true,
    });

    const syncingRef = useRef(false);

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
        const pending = await getPendingCatalogChanges();

        setPendingCount(pending.length);

        return pending.length;
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

        if (network.isConnected) {
            const remoteCatalog = await catalog.pullRemoteCatalog();

            return remoteCatalog.storeId;
        }

        throw new Error("Store ID não encontrado para salvar o catálogo local.");
    }

    async function flushPendingCatalogChanges(options?: { pullAfterSync?: boolean; silent?: boolean }) {
        const pullAfterSync = options?.pullAfterSync ?? true;
        const silent = options?.silent ?? false;

        if (syncingRef.current) {
            return false;
        }

        if (!network.isConnected) {
            if (!silent) {
                setMessage("Sem conexão. Alterações seguem salvas.");
            }

            await refreshPendingCount();

            return false;
        }

        if (!user?.deviceId) {
            if (!silent) {
                setMessage("Device ID não encontrado.");
            }

            await refreshPendingCount();

            return false;
        }

        try {
            syncingRef.current = true;

            await normalizeLegacyCatalogIds();

            const pending = await getPendingCatalogChanges();

            if (!pending.length) {
                await refreshPendingCount();

                if (pullAfterSync && isSeller) {
                    await catalog.pullRemoteCatalog();
                }

                if (!silent) {
                    setMessage("Catálogo atualizado.");
                }

                return true;
            }

            const response = await syncCatalog({
                deviceId: user.deviceId,
                changes: pending.map(({ queueId, ...change }) => change),
            });

            let hasRejected = false;

            for (let index = 0; index < pending.length; index++) {
                const queueItem = pending[index];
                const result = response.results[index];

                if (!result) continue;

                const synced = result.status === "APPLIED" || result.status === "DUPLICATE";

                if (synced) {
                    await markCatalogChangeSynced(queueItem.queueId, result.message);
                } else {
                    hasRejected = true;

                    await markCatalogChangeRejected(queueItem.queueId, result.message);
                }
            }

            await refreshPendingCount();

            if (hasRejected) {
                await catalog.loadLocalCatalog();

                if (!silent) {
                    setMessage("Algumas alterações foram rejeitadas. Verifique os dados e tente novamente.");
                }

                return false;
            }

            if (pullAfterSync && isSeller) {
                await catalog.pullRemoteCatalog();
            } else {
                await catalog.loadLocalCatalog();
            }

            await refreshPendingCount();

            if (!silent) {
                setMessage("Mudanças sincronizadas.");
            }

            return true;
        } catch (err) {
            await catalog.loadLocalCatalog();
            await refreshPendingCount();

            if (!silent) {
                setMessage(getErrorMessage(err, "Erro ao sincronizar. Alterações seguem salvas localmente."));
            }

            return false;
        } finally {
            syncingRef.current = false;
        }
    }

    async function saveLocalAndAutoSync(successMessage: string) {
        await reloadLocalState(successMessage);

        if (network.isConnected && isSeller) {
            await flushPendingCatalogChanges({
                pullAfterSync: true,
                silent: true,
            });

            await refreshPendingCount();
        }
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
        if (!isSeller) return;
        if (!network.isConnected) return;

        flushPendingCatalogChanges({
            pullAfterSync: true,
            silent: true,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSeller, network.isConnected]);

    async function refreshCatalog() {
        try {
            setMessage("");

            if (!network.isConnected) {
                await catalog.loadLocalCatalog();
                await refreshPendingCount();

                setMessage("Sem conexão. Catálogo carregado localmente.");

                return;
            }

            if (isSeller) {
                await flushPendingCatalogChanges({
                    pullAfterSync: true,
                    silent: false,
                });

                return;
            }

            await catalog.loadLocalCatalog();
            await refreshPendingCount();

            setMessage("Catálogo local atualizado.");
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
            setMessage("Catálogo local atualizado.");

            return;
        }

        await flushPendingCatalogChanges({
            pullAfterSync: true,
            silent: false,
        });
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

        await saveLocalAndAutoSync(network.isConnected ? "Produto salvo." : "Produto salvo offline.");
    }

    async function adjustStock(quantityDelta: number) {
        if (!selectedProduct) return;

        await adjustLocalProductStock(selectedProduct.id, quantityDelta);

        await addCatalogQueue({
            operation: "STOCK_UPDATE",
            productId: selectedProduct.id,
            quantityDelta,
        });

        await saveLocalAndAutoSync(network.isConnected ? "Estoque ajustado." : "Estoque ajustado offline.");
    }

    async function deactivateProduct() {
        if (!selectedProduct) return;

        await deactivateLocalProduct(selectedProduct.id);

        await addCatalogQueue({
            operation: "PRODUCT_DEACTIVATE",
            productId: selectedProduct.id,
        });

        setDetailsVisible(false);

        await saveLocalAndAutoSync(network.isConnected ? "Produto desativado." : "Produto desativado offline.");
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

            await saveLocalAndAutoSync(network.isConnected ? "Categoria criada." : "Categoria salva offline.");

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

            await saveLocalAndAutoSync(network.isConnected ? "Categoria atualizada." : "Categoria atualizada offline.");
        }
    }

    async function removeCategory(category: CatalogCategory) {
        if (category.products.length > 0) {
            setMessage("Não desative uma categoria com produtos. Mova ou desative os produtos antes.");

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

        await saveLocalAndAutoSync(network.isConnected ? "Categoria desativada." : "Categoria desativada offline.");
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
