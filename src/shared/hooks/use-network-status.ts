import NetInfo, { NetInfoStateType } from "@react-native-community/netinfo";
import { useEffect, useMemo, useState } from "react";

const COLOR_RED = "#dc2626";
const COLOR_GREEN = "#22c55e";
const COLOR_PURPLE = "#7c3aed";

type ConnectionStatus = {
    isConnected: boolean;
    type: NetInfoStateType | "unknown";
};

export function useNetworkStatus() {
    const [connection, setConnection] = useState<ConnectionStatus>({
        isConnected: false,
        type: "unknown",
    });

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setConnection({
                isConnected: Boolean(state.isConnected && state.isInternetReachable),
                type: state.type,
            });
        });

        return unsubscribe;
    }, []);

    const networkInfo = useMemo(() => {
        if (!connection.isConnected) {
            return {
                isConnected: false,
                label: "Sem conexão",
                icon: "cloud-offline-outline" as const,
                color: COLOR_RED,
                description: "Operando localmente.",
            };
        }

        if (connection.type === "wifi") {
            return {
                isConnected: true,
                label: "Wi-Fi",
                icon: "wifi-outline" as const,
                color: COLOR_GREEN,
                description: "Sincronização disponível.",
            };
        }

        if (connection.type === "cellular") {
            return {
                isConnected: true,
                label: "Rede móvel",
                icon: "phone-portrait-outline" as const,
                color: COLOR_PURPLE,
                description: "Conexão limitada.",
            };
        }

        return {
            isConnected: true,
            label: "Online",
            icon: "radio-outline" as const,
            color: COLOR_GREEN,
            description: "Servidor disponível.",
        };
    }, [connection]);

    return networkInfo;
}
