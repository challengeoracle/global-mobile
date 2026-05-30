import { Text, View } from "react-native";

type AuthHeaderProps = {
    title: string;
    description: string;
};

export function AuthHeader({ title, description }: AuthHeaderProps) {
    return (
        <View className="mb-10">
            <View className="mb-8">
                <View className="flex-row items-baseline">
                    <Text className="text-[28px] font-thin tracking-[6px] text-foreground">OFF</Text>

                    <Text className="text-[28px] font-black text-primary">PAY</Text>
                </View>

                <View className="mt-2 h-[3px] w-14 rounded-full bg-primary" />
            </View>

            <View>
                <Text className="text-[34px] font-black tracking-[-1px] text-foreground">{title}</Text>

                <Text className="mt-3 max-w-[320px] text-base leading-7 text-muted-foreground">{description}</Text>
            </View>
        </View>
    );
}
