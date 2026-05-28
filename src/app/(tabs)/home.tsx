import { ScrollView, View } from "react-native";

import { CustomerHome } from "@/src/components/home/customer-home";
import { SellerHome } from "@/src/components/home/seller-home";

import { useAuth } from "@/src/contexts/auth-context";
import { useNetworkStatus } from "@/src/hooks/use-network-status";
import { useOfflineSession } from "@/src/hooks/use-offline-session";

export default function HomeScreen() {
    const { user } = useAuth();

    const networkInfo = useNetworkStatus();
    const offlineSession = useOfflineSession(networkInfo.isConnected);

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-10 pt-14">{user?.role === "SELLER" ? <SellerHome user={user} networkInfo={networkInfo} offlineSession={offlineSession} /> : <CustomerHome user={user} networkInfo={networkInfo} offlineSession={offlineSession} />}</View>
        </ScrollView>
    );
}
