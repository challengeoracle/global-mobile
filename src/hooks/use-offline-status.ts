import { useMemo } from "react";

export function useOfflineStatus(isConnected: boolean) {
    const statusMessage = useMemo(() => {
        return isConnected ? "Online: dados locais serão sincronizados automaticamente." : "Offline: operação local habilitada por padrão.";
    }, [isConnected]);

    return {
        loading: false,
        offlineEnabled: true,
        offlineExpiresAt: null,
        statusMessage,
        formattedExpiresAt: null,
        formattedExpiresAtWithSeconds: null,
    };
}
