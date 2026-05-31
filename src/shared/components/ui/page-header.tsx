import { Text, View } from "react-native";

type PageHeaderProps = {
    eyebrow: string;
    title: string;
    description?: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
    return (
        <View className="mb-7">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-primary">{eyebrow}</Text>

            <Text className="text-[34px] font-black tracking-[-1px] text-foreground">{title}</Text>

            {description ? <Text className="mt-2 max-w-[340px] text-sm leading-6 text-muted-foreground">{description}</Text> : null}
        </View>
    );
}
