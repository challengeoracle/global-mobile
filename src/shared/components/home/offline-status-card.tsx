import { StatusCard } from "./status-card";

const COLOR_GREEN = "#22c55e";

type OfflineStatusCardProps = {
    title?: string;
};

export function OfflineStatusCard({ title = "Operação offline" }: OfflineStatusCardProps) {
    return <StatusCard icon="shield-checkmark-outline" title={title} value="Disponível" description="Local-first por padrão." color={COLOR_GREEN} />;
}
