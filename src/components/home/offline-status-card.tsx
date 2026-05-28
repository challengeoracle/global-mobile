import { StatusCard } from "./status-card";

const COLOR_RED = "#dc2626";
const COLOR_GREEN = "#22c55e";

type OfflineStatusCardProps = {
    title?: string;
    offlineEnabled: boolean;
    offlineExpiresAt?: string | null;
};

export function OfflineStatusCard({ title = "Sessão offline", offlineEnabled, offlineExpiresAt }: OfflineStatusCardProps) {
    return <StatusCard icon="shield-checkmark-outline" title={title} value={offlineEnabled ? "Ativa" : "Inativa"} description={offlineEnabled && offlineExpiresAt ? `Até ${offlineExpiresAt}` : "Sem autorização."} color={offlineEnabled ? COLOR_GREEN : COLOR_RED} />;
}
