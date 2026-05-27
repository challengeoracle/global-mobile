import { Text, View } from "react-native";

export default function ExploreScreen() {
    return (
        <View className="flex-1 bg-zinc-950 px-6 py-12">
            <View className="flex-1 justify-center">
                <Text className="mb-3 text-3xl font-bold text-white">Explore</Text>

                <Text className="text-base leading-6 text-zinc-400">Essa é a segunda tela do app. Use ela para testar navegação, componentes e novas funcionalidades.</Text>
            </View>
        </View>
    );
}
