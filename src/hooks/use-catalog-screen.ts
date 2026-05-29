import { useEffect, useMemo, useState } from "react";

import { SortDirection } from "@/src/components/catalog/catalog-toolbar";
import { ProductFormValues } from "@/src/components/catalog/product-form-modal";
import { useAuth } from "@/src/contexts/auth-context";
import { adjustLocalProductStock, createLocalProduct, deactivateLocalProduct, updateLocalProduct } from "@/src/database/repositories/catalog-repository";
import { enqueueCatalogChange, getPendingCatalogChanges, markCatalogChangeRejected, markCatalogChangeSynced } from "@/src/database/repositories/sync-queue-repository";
import { useNetworkStatus } from "@/src/hooks/use-network-status";
import { syncCatalog } from "@/src/services/sales-service";
import { CatalogProduct, CatalogSyncItem } from "@/src/types/sales";
import { useCatalog } from "./use-catalog";

function now() {
    return new Date().toISOString();
}

// Auxiliar para diminuir linhas repetitivas na lógica do switch de ordenação
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
        autoLoad: !!isSeller,
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

    // Gerenciador inteligente de ordenação
    const products = useMemo(() => {
        const baseProducts = selectedCategoryId ? (catalog.categories.find((category) => category.id === selectedCategoryId)?.products ?? []) : catalog.categories.flatMap((category) => category.products);

        const term = search.trim().toLowerCase();

        const filtered = baseProducts.filter((product) => {
            if (!term) return true;
            return product.name.toLowerCase().includes(term) || product.description?.toLowerCase().includes(term);
        });

        return [...filtered].sort((a, b) => {
            // Prioridade 1: Preço
            if (priceSort === "ASC") return b.price - a.price;
            if (priceSort === "DESC") return a.price - b.price;

            // Prioridade 2: Estoque
            if (stockSort === "ASC") return b.stockQuantity - a.stockQuantity;
            if (stockSort === "DESC") return a.stockQuantity - b.stockQuantity;

            // Prioridade 3: Alfabética Explícita (Z-A ou A-Z)
            if (nameSort === "DESC") return sortByName(a, b, true);

            // Padrão do sistema: Se nada estiver ativo ou nameSort for "ASC", ordena de A-Z
            return sortByName(a, b, false);
        });
    }, [catalog.categories, selectedCategoryId, search, nameSort, priceSort, stockSort]);

    async function refreshPendingCount() {
        const pending = await getPendingCatalogChanges();
        setPendingCount(pending.length);
    }

    async function reloadLocalState(successMessage?: string) {
        await catalog.loadLocalCatalog();
        await refreshPendingCount();
        if (successMessage) setMessage(successMessage);
    }

    async function addCatalogQueue(change: Omit<CatalogSyncItem, "localUpdatedAt">) {
        await enqueueCatalogChange({ ...change, localUpdatedAt: now() });
    }

    useEffect(() => {
        refreshPendingCount();
    }, []);

    async function refreshCatalog() {
        try {
            setMessage("");
            await catalog.syncCatalogFromApi();
            await refreshPendingCount();
            setMessage("Catálogo atualizado.");
        } catch (err) {
            setMessage(getErrorMessage(err, "Erro ao atualizar catálogo."));
        }
    }

    async function syncPendingChanges() {
        try {
            setMessage("");
            if (!network.isConnected) {
                setMessage("Sem conexão. Alterações seguem salvas.");
                return;
            }
            if (!user?.deviceId) {
                setMessage("Device ID não encontrado.");
                return;
            }

            const pending = await getPendingCatalogChanges();
            if (!pending.length) {
                setMessage("Nada para sincronizar.");
                return;
            }

            const response = await syncCatalog({
                deviceId: user.deviceId,
                changes: pending.map(({ queueId, ...change }) => change),
            });

            for (let index = 0; index < pending.length; index++) {
                const queueItem = pending[index];
                const result = response.results[index];
                if (!result) continue;

                const synced = result.status === "APPLIED" || result.status === "DUPLICATE";
                if (synced) {
                    await markCatalogChangeSynced(queueItem.queueId, result.message);
                } else {
                    await markCatalogChangeRejected(queueItem.queueId, result.message);
                }
            }

            await catalog.syncCatalogFromApi();
            await refreshPendingCount();
            setMessage("Mudanças sincronizadas.");
        } catch (err) {
            setMessage(getErrorMessage(err, "Erro ao sincronizar."));
        }
    }

    // Gerenciadores de estado dos modais secundários
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
        if (!catalog.catalogStoreId) throw new Error("Store ID do catálogo não encontrado.");

        const price = Number(values.price);
        const stockQuantity = Number(values.stockQuantity);

        if (formMode === "create") {
            await createLocalProduct({
                categoryId: values.categoryId,
                storeId: catalog.catalogStoreId,
                name: values.name,
                description: values.description,
                price,
                stockQuantity,
            });
            await addCatalogQueue({
                operation: "PRODUCT_CREATE",
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
        await reloadLocalState("Alteração salva.");
    }

    async function adjustStock(quantityDelta: number) {
        if (!selectedProduct) return;
        await adjustLocalProductStock(selectedProduct.id, quantityDelta);
        await addCatalogQueue({
            operation: "STOCK_UPDATE",
            productId: selectedProduct.id,
            quantityDelta,
        });
        await reloadLocalState("Estoque ajustado.");
    }

    async function deactivateProduct() {
        if (!selectedProduct) return;
        await deactivateLocalProduct(selectedProduct.id);
        await addCatalogQueue({
            operation: "PRODUCT_DEACTIVATE",
            productId: selectedProduct.id,
        });
        setDetailsVisible(false);
        await reloadLocalState("Produto desativado.");
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
    };
}
