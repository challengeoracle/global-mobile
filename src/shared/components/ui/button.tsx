import { ActivityIndicator, Pressable, Text } from "react-native";

type ButtonProps = {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: "primary" | "secondary";
};

export function Button({ title, onPress, loading, disabled, variant = "primary" }: ButtonProps) {
    const isPrimary = variant === "primary";

    return (
        <Pressable onPress={onPress} disabled={disabled || loading} className={`h-14 items-center justify-center rounded-2xl active:opacity-90 ${isPrimary ? "bg-primary" : "border border-border bg-card"} disabled:opacity-60`}>
            {loading ? <ActivityIndicator color={isPrimary ? "rgb(var(--primary-foreground))" : "rgb(var(--foreground))"} /> : <Text className={`text-sm font-bold uppercase tracking-[2px] ${isPrimary ? "text-primary-foreground" : "text-card-foreground"}`}>{title}</Text>}
        </Pressable>
    );
}
