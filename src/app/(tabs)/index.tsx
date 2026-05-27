import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function HomeScreen() {
    return (
        <View className="flex-1 bg-zinc-950 px-6 py-12">
            <View className="flex-1 justify-center">
                <Text className="mb-3 text-4xl font-bold text-white">Global Mobile</Text>

                <Text className="mb-8 text-base leading-6 text-zinc-400">Projeto iniciado com Expo Router, TypeScript e NativeWind.</Text>

                <Link href="/explore" className="rounded-2xl bg-white px-5 py-4">
                    <Text className="text-center text-base font-semibold text-zinc-950">Ir para Explore</Text>
                </Link>
            </View>
        </View>
    );
}
