import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/src/contexts/auth-context";
import { getCustomerOfflineStatus, getSellerDevice } from "@/src/services/auth-service";

function formatDate(date?: string | null, withSeconds = false) {
    if (!date) return null;

    return new Date(date).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: withSeconds ? "medium" : "short",
    });
}

export function useOfflineSession(isConnected: boolean) {
    const { user, activateOffline } = useAuth();

    const [loading, setLoading] = useState(false);
    const [offlineEnabled, setOfflineEnabled] = useState(false);
    const [offlineExpiresAt, setOfflineExpiresAt] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState("Sessão offline ainda não verificada.");

    const checkOfflineStatus = useCallback(async () => {
        try {
            setLoading(true);

            if (user?.role === "SELLER") {
                const response = await getSellerDevice();

                setOfflineEnabled(response.offlineEnabled);
                setOfflineExpiresAt(response.offlineExpiresAt);

                setStatusMessage(response.offlineEnabled ? `Offline ativo até ${formatDate(response.offlineExpiresAt, true)}` : "Sessão offline desativada.");

                return;
            }

            const response = await getCustomerOfflineStatus();

            setOfflineEnabled(response.offlineEnabled);
            setOfflineExpiresAt(response.expiresAt);

            setStatusMessage(response.offlineEnabled ? `Offline ativo até ${formatDate(response.expiresAt, true)}` : "Sessão offline expirada.");
        } catch (err) {
            setStatusMessage(err instanceof Error ? err.message : "Erro ao verificar sessão.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        checkOfflineStatus();
    }, [checkOfflineStatus]);

    async function handleActivateOffline() {
        if (!isConnected) {
            setStatusMessage("Conecte-se à internet para ativar ou renovar a autorização offline.");
            return;
        }

        try {
            setLoading(true);

            await activateOffline();

            setStatusMessage(offlineEnabled ? "Autorização offline renovada." : "Sessão offline ativada.");

            await checkOfflineStatus();
        } catch (err) {
            setStatusMessage(err instanceof Error ? err.message : "Erro ao ativar offline.");
        } finally {
            setLoading(false);
        }
    }

    return {
        loading,
        offlineEnabled,
        offlineExpiresAt,
        statusMessage,
        formattedExpiresAt: formatDate(offlineExpiresAt),
        formattedExpiresAtWithSeconds: formatDate(offlineExpiresAt, true),
        checkOfflineStatus,
        handleActivateOffline,
    };
}
