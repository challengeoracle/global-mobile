import { StatusCard } from "./status-card";

type ConnectionStatusCardProps = {
    networkInfo: {
        label: string;
        icon: "cloud-offline-outline" | "wifi-outline" | "phone-portrait-outline" | "radio-outline";
        color: string;
        description: string;
    };
};

export function ConnectionStatusCard({ networkInfo }: ConnectionStatusCardProps) {
    return <StatusCard icon={networkInfo.icon} title="Conexão" value={networkInfo.label} description={networkInfo.description} color={networkInfo.color} />;
}
