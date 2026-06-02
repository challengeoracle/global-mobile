import { randomUUID } from "expo-crypto";
import { useEffect, useMemo, useState } from "react";

import { CatalogProduct } from "@/src/domains/catalog/types/catalog";
import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { createLocalOfflineOrder } from "@/src/domains/order/repositories/order-repository";
import { OrderItemRequest } from "@/src/domains/order/types/order";
import { buildOrderQrPayload, encodeOrderQr } from "@/src/domains/order/utils/order-qr";
import { countPendingOrderSyncQueue } from "@/src/domains/sync/repositories/sync-queue-repository";
import { scheduleSync, syncAll } from "@/src/domains/sync/services/sync-engine";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";

export type CartItem = {
    product: CatalogProduct;
    quantity: number;
};

export type GeneratedOrderQr = {
    localOrderId: string;
    qrValue: string;
    totalAmount: number;
    createdAt: string;
    items: OrderItemRequest[];
};

export type OrderSyncFeedback = {
    ok: boolean;
    message: string;
    pendingAfter: number;
    synced?: number;
    rejected?: number;
};

export function useOrderFlow(storeId?: string | null) {
    const { user } = useAuth();
    const network = useNetworkStatus();

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [message, setMessage] = useState("");
    const [syncing, setSyncing] = useState(false);
    const [pendingOrderCount, setPendingOrderCount] = useState(0);
    const [generatedOrderQr, setGeneratedOrderQr] = useState<GeneratedOrderQr | null>(null);

    const totalAmount = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
    }, [cartItems]);

    const itemCount = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.quantity, 0);
    }, [cartItems]);

    async function refreshPendingOrderCount() {
        const total = await countPendingOrderSyncQueue();
        setPendingOrderCount(total);
        return total;
    }

    function addToCart(product: CatalogProduct, quantity = 1) {
        setMessage("");

        if (!product.active) {
            setMessage("Produto indisponível.");
            return;
        }

        if (product.stockQuantity <= 0) {
            setMessage("Produto sem estoque.");
            return;
        }

        setCartItems((current) => {
            const existing = current.find((item) => item.product.id === product.id);

            if (!existing) {
                return [
                    ...current,
                    {
                        product,
                        quantity: Math.min(quantity, product.stockQuantity),
                    },
                ];
            }

            return current.map((item) => {
                if (item.product.id !== product.id) return item;

                return {
                    ...item,
                    quantity: Math.min(item.quantity + quantity, item.product.stockQuantity),
                };
            });
        });
    }

    function removeFromCart(productId: string) {
        setCartItems((current) => current.filter((item) => item.product.id !== productId));
    }

    function updateQuantity(productId: string, quantity: number) {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        setCartItems((current) =>
            current.map((item) => {
                if (item.product.id !== productId) return item;

                return {
                    ...item,
                    quantity: Math.min(quantity, item.product.stockQuantity),
                };
            }),
        );
    }

    function clearCart() {
        setCartItems([]);
    }

    function clearGeneratedOrderQr() {
        setGeneratedOrderQr(null);
    }

    async function generateOrderQr() {
        setMessage("");

        if (!storeId) {
            setMessage("Catálogo sem loja vinculada.");
            return null;
        }

        if (!user) {
            setMessage("Usuário não encontrado.");
            return null;
        }

        if (!cartItems.length) {
            setMessage("Adicione pelo menos um item.");
            return null;
        }

        if (user.storeId && storeId === user.storeId) {
            setMessage("Você não pode comprar da própria loja.");
            return null;
        }

        const localOrderId = randomUUID();
        const createdAt = new Date().toISOString();

        const items = cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.product.price,
        }));

        const qrTotalAmount = cartItems.reduce((total, item) => {
            return total + item.product.price * item.quantity;
        }, 0);

        const payload = buildOrderQrPayload({
            type: "OFFPAY_ORDER",
            version: 1,
            localOrderId,
            storeId,
            customerId: user.id,
            createdAt,
            totalAmount: qrTotalAmount,
            items,
        });

        const generated = {
            localOrderId,
            qrValue: encodeOrderQr(payload),
            totalAmount: qrTotalAmount,
            createdAt,
            items,
        };

        await createLocalOfflineOrder({
            localOrderId,
            storeId,
            customerId: user.id,
            sellerId: null,
            items,
            confirmedBySeller: false,
            offlineCreatedAt: createdAt,
            shouldDecreaseStock: false,
            syncStatus: "PENDING",
            orderStatus: "CREATED",
            paymentStatus: "PENDING_PAYMENT",
            enqueueSync: false,
        });
        setGeneratedOrderQr(generated);
        setMessage("Mostre o QR Code para o vendedor confirmar a venda.");

        return generated;
    }

    async function syncPendingOrders(silent = false): Promise<OrderSyncFeedback> {
        if (!network.canAttemptRemote) {
            const feedback = {
                ok: false,
                message: "Sem conexão. Pedidos seguem salvos localmente.",
                pendingAfter: await refreshPendingOrderCount(),
            };

            if (!silent) setMessage(feedback.message);
            return feedback;
        }

        if (!user) {
            const feedback = {
                ok: false,
                message: "Usuário não encontrado.",
                pendingAfter: await refreshPendingOrderCount(),
            };

            if (!silent) setMessage(feedback.message);
            return feedback;
        }

        if (user.role !== "SELLER") {
            const feedback = {
                ok: false,
                message: "Somente o vendedor sincroniza pedidos confirmados.",
                pendingAfter: await refreshPendingOrderCount(),
            };

            if (!silent) setMessage(feedback.message);
            return feedback;
        }

        try {
            setSyncing(true);

            const result = await syncAll({
                isConnected: network.canAttemptRemote,
                canSync: user.role === "SELLER",
                pullCatalogAfterSync: true,
                forceRetry: true,
            });
            const feedbackMessage = result.orders.rejected > 0 ? result.orders.message : result.catalog.rejected > 0 ? result.catalog.message : result.orders.synced > 0 ? result.orders.message : result.catalog.message;

            const pendingAfter = await refreshPendingOrderCount();

            if (!silent) {
                setMessage(feedbackMessage);
            }

            return {
                ok: result.ok,
                message: feedbackMessage,
                pendingAfter,
                synced: result.orders.synced,
                rejected: result.orders.rejected,
            };
        } catch (err) {
            const fallbackMessage = err instanceof Error ? err.message : "Erro ao sincronizar pedidos.";
            const pendingAfter = await refreshPendingOrderCount();

            if (!silent) {
                setMessage(fallbackMessage);
            }

            return {
                ok: false,
                message: fallbackMessage,
                pendingAfter,
            };
        } finally {
            setSyncing(false);
        }
    }

    useEffect(() => {
        void refreshPendingOrderCount();
    }, []);

    useEffect(() => {
        if (!network.canAttemptRemote) return;
        if (user?.role !== "SELLER") return;

        scheduleSync({
            scopes: ["catalog", "orders"],
            isConnected: network.canAttemptRemote,
            canSync: user.role === "SELLER",
            pullCatalogAfterSync: true,
            forceRetry: true,
            onComplete: async () => {
                await refreshPendingOrderCount();
            },
        });
    }, [network.canAttemptRemote, user?.role]);

    return {
        cartItems,
        itemCount,
        totalAmount,
        message,
        syncing,
        pendingOrderCount,
        generatedOrderQr,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        generateOrderQr,
        clearGeneratedOrderQr,
        syncPendingOrders,
        refreshPendingOrderCount,
    };
}
