import { Pressable, Text, View } from "react-native";

type RoleOption = "SELLER" | "CUSTOMER";

type RoleSelectorProps = {
    value: RoleOption;
    onChange: (value: RoleOption) => void;
};

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
    const isSeller = value === "SELLER";

    return (
        <View className="mb-8 flex-row gap-3">
            <Pressable className={`flex-1 rounded-2xl border px-4 py-4 ${isSeller ? "border-primary bg-primary/10" : "border-border bg-card"}`} onPress={() => onChange("SELLER")}>
                <Text className={`text-sm font-bold uppercase tracking-[2px] ${isSeller ? "text-primary" : "text-foreground"}`}>Vendedor</Text>

                <Text className="mt-2 text-xs leading-5 text-muted-foreground">Loja e recebimentos</Text>
            </Pressable>

            <Pressable className={`flex-1 rounded-2xl border px-4 py-4 ${!isSeller ? "border-primary bg-primary/10" : "border-border bg-card"}`} onPress={() => onChange("CUSTOMER")}>
                <Text className={`text-sm font-bold uppercase tracking-[2px] ${!isSeller ? "text-primary" : "text-foreground"}`}>Cliente</Text>

                <Text className="mt-2 text-xs leading-5 text-muted-foreground">Compras e pagamentos</Text>
            </Pressable>
        </View>
    );
}
