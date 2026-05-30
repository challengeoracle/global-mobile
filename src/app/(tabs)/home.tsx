import { ScrollView, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { CustomerHome } from "@/src/shared/components/home/customer-home";
import { SellerHome } from "@/src/shared/components/home/seller-home";
import { useNetworkStatus } from "@/src/shared/hooks/use-network-status";
import { useOfflineStatus } from "@/src/shared/hooks/use-offline-status";

export default function HomeScreen() {
    const { user } = useAuth();

    const networkInfo = useNetworkStatus();
    const offlineStatus = useOfflineStatus(networkInfo.isConnected);

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-10 pt-14">{user?.role === "SELLER" ? <SellerHome user={user} networkInfo={networkInfo} offlineStatus={offlineStatus} /> : <CustomerHome user={user} networkInfo={networkInfo} offlineStatus={offlineStatus} />}</View>
        </ScrollView>
    );
}
