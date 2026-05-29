import { StatusCard } from "./status-card";

const COLOR_GREEN = "#22c55e";

type OfflineStatusCardProps = {
    title?: string;
    offlineEnabled: boolean;
    offlineExpiresAt?: string | null;
};

export function OfflineStatusCard({ title = "Operação offline", offlineEnabled, offlineExpiresAt }: OfflineStatusCardProps) {
    return <StatusCard icon="shield-checkmark-outline" title={title} value={offlineEnabled ? "Disponível" : "Indisponível"} description={offlineEnabled && offlineExpiresAt ? `Até ${offlineExpiresAt}` : "Local-first por padrão."} color={COLOR_GREEN} />;
}
