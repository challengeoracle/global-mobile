import { Text, View } from "react-native";

type PageHeaderProps = {
    eyebrow: string;
    title: string;
    description?: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
    return (
        <View className="mb-8">
            <Text className="mb-2 text-sm font-semibold uppercase tracking-[3px] text-primary">{eyebrow}</Text>

            <Text className="text-4xl font-black tracking-[-1px] text-foreground">{title}</Text>

            {description ? <Text className="mt-3 max-w-[320px] text-base leading-7 text-muted-foreground">{description}</Text> : null}
        </View>
    );
}
