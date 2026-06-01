import NetInfo, { NetInfoStateType } from "@react-native-community/netinfo";
import { useEffect, useMemo, useState } from "react";

const COLOR_RED = "#dc2626";
const COLOR_GREEN = "#22c55e";
const COLOR_PURPLE = "#7c3aed";

type ConnectionStatus = {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: NetInfoStateType | "unknown";
    source: "initial" | "fetch" | "listener";
};

export function useNetworkStatus() {
    const [connection, setConnection] = useState<ConnectionStatus>({
        isConnected: null,
        isInternetReachable: null,
        type: "unknown",
        source: "initial",
    });

    useEffect(() => {
        let mounted = true;

        NetInfo.fetch().then((state) => {
            if (!mounted) {
                return;
            }

            setConnection({
                isConnected: state.isConnected,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
                source: "fetch",
            });
        });

        const unsubscribe = NetInfo.addEventListener((state) => {
            setConnection({
                isConnected: state.isConnected,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
                source: "listener",
            });
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    const networkInfo = useMemo(() => {
        const canAttemptRemote = connection.isConnected === true && connection.isInternetReachable !== false;
        const explicitlyOffline = connection.isConnected === false || connection.isInternetReachable === false;

        if (explicitlyOffline) {
            return {
                isConnected: false,
                canAttemptRemote: false,
                isInternetReachable: connection.isInternetReachable,
                source: connection.source,
                type: connection.type,
                label: "Sem conexão",
                icon: "cloud-offline-outline" as const,
                color: COLOR_RED,
                description: "Operando localmente.",
            };
        }

        if (canAttemptRemote && connection.type === "wifi") {
            return {
                isConnected: true,
                canAttemptRemote: true,
                isInternetReachable: connection.isInternetReachable,
                source: connection.source,
                type: connection.type,
                label: "Wi-Fi",
                icon: "wifi-outline" as const,
                color: COLOR_GREEN,
                description: "Sincronização disponível.",
            };
        }

        if (canAttemptRemote && connection.type === "cellular") {
            return {
                isConnected: true,
                canAttemptRemote: true,
                isInternetReachable: connection.isInternetReachable,
                source: connection.source,
                type: connection.type,
                label: "Rede móvel",
                icon: "phone-portrait-outline" as const,
                color: COLOR_PURPLE,
                description: "Conexão limitada.",
            };
        }

        if (canAttemptRemote) {
            return {
                isConnected: true,
                canAttemptRemote: true,
                isInternetReachable: connection.isInternetReachable,
                source: connection.source,
                type: connection.type,
                label: "Online",
                icon: "radio-outline" as const,
                color: COLOR_GREEN,
                description: "Servidor disponível.",
            };
        }

        return {
            isConnected: false,
            canAttemptRemote: true,
            isInternetReachable: connection.isInternetReachable,
            source: connection.source,
            type: connection.type,
            label: "Verificando rede",
            icon: "hourglass-outline" as const,
            color: COLOR_GREEN,
            description: "Aguardando confirmação da conectividade.",
        };
    }, [connection]);

    return networkInfo;
}
