import { ScrollView, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { CustomerHome } from "@/src/shared/components/home/customer-home";
import { SellerHome } from "@/src/shared/components/home/seller-home";
import { SyncStatusCard } from "@/src/shared/components/sync/sync-status-card";
import { useSyncStatus } from "@/src/shared/hooks/use-sync-status";

export default function HomeScreen() {
    const { user } = useAuth();
    const syncStatus = useSyncStatus("all");

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-10 pt-14">
                <SyncStatusCard
                    variant="compact"
                    title="Estado local"
                    onlineLabel={syncStatus.network.isConnected ? "Online" : "Offline"}
                    onlineColor={syncStatus.network.color}
                    isConnected={syncStatus.network.isConnected}
                    isSyncing={syncStatus.isSyncing}
                    pendingCount={syncStatus.pendingCount}
                    pendingLabel="registro(s) aguardando envio"
                />

                <View className="mt-6">{user?.role === "SELLER" ? <SellerHome user={user} /> : <CustomerHome user={user} />}</View>
            </View>
        </ScrollView>
    );
}
