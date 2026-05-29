import { randomUUID } from "expo-crypto";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/src/contexts/auth-context";
import { buildPendingOrderPayloads, countPendingLocalOrders, markOrderRejected, markOrderSynced } from "@/src/database/repositories/order-repository";
import { useNetworkStatus } from "@/src/hooks/use-network-status";
import { getOrCreateDeviceId } from "@/src/lib/secure-storage";
import { syncOrders } from "@/src/services/sales-service";
import { CatalogProduct, OrderItemRequest } from "@/src/types/sales";
import { buildOrderQrPayload, encodeOrderQr } from "@/src/utils/order-qr";

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

export function useOrderFlow(storeId?: string | null) {
    const { user } = useAuth();
    const network = useNetworkStatus();
    const syncingRef = useRef(false);

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
        const total = await countPendingLocalOrders();
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

        const deviceId = await getOrCreateDeviceId();
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
            customerId: user.role === "CUSTOMER" ? user.id : null,
            deviceId,
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

        setGeneratedOrderQr(generated);

        // REMOVIDO: clearCart(); daqui.
        // O carrinho só limpa quando o vendedor confirma a venda.

        setMessage("Mostre o QR Code para o vendedor confirmar a venda.");

        return generated;
    }

    async function syncPendingOrders(silent = false) {
        if (syncingRef.current) return false;

        if (!network.isConnected) {
            if (!silent) setMessage("Sem conexão. Pedidos seguem salvos.");
            await refreshPendingOrderCount();
            return false;
        }

        if (!user) {
            if (!silent) setMessage("Usuário não encontrado.");
            await refreshPendingOrderCount();
            return false;
        }

        if (user.role !== "SELLER") {
            if (!silent) setMessage("Somente o vendedor sincroniza pedidos confirmados.");
            await refreshPendingOrderCount();
            return false;
        }

        try {
            syncingRef.current = true;
            setSyncing(true);

            const deviceId = await getOrCreateDeviceId();
            const pendingOrders = await buildPendingOrderPayloads();

            if (!pendingOrders.length) {
                await refreshPendingOrderCount();

                if (!silent) {
                    setMessage("Nenhum pedido pendente.");
                }

                return true;
            }

            const response = await syncOrders({
                deviceId,
                orders: pendingOrders.map((order) => ({
                    localOrderId: order.localOrderId,
                    customerId: order.customerId,
                    offlineCreatedAt: order.offlineCreatedAt,
                    items: order.items,
                })),
            });

            for (const result of response.results) {
                if (result.status === "APPLIED" || result.status === "DUPLICATE") {
                    await markOrderSynced({
                        localOrderId: result.localOrderId,
                        remoteOrderId: result.orderId ?? null,
                        orderStatus: result.orderStatus ?? null,
                        paymentStatus: result.paymentStatus ?? null,
                        syncStatus: result.syncStatus ?? "OFFLINE_SYNCED",
                    });
                } else {
                    await markOrderRejected({
                        localOrderId: result.localOrderId,
                        message: result.message,
                    });
                }
            }

            await refreshPendingOrderCount();

            if (!silent) {
                setMessage("Pedidos sincronizados.");
            }

            return true;
        } catch (err) {
            await refreshPendingOrderCount();

            if (!silent) {
                setMessage(err instanceof Error ? err.message : "Erro ao sincronizar pedidos.");
            }

            return false;
        } finally {
            setSyncing(false);
            syncingRef.current = false;
        }
    }

    useEffect(() => {
        refreshPendingOrderCount();
    }, []);

    useEffect(() => {
        if (!network.isConnected) return;
        if (user?.role !== "SELLER") return;

        syncPendingOrders(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [network.isConnected, user?.role]);

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
