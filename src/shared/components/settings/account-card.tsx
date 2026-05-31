import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type AccountCardProps = {
    name?: string;
    email?: string;
    role?: string;
    storeName?: string | null;
};

export function AccountCard({ name, email, role, storeName }: AccountCardProps) {
    const roleLabel = role === "SELLER" ? "Vendedor" : "Cliente";

    return (
        <View className="mb-6 rounded-3xl border border-border bg-card p-5">
            <View className="mb-5 flex-row items-center gap-4">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Ionicons name="person-outline" size={24} color="#dc2626" />
                </View>

                <View className="flex-1">
                    <Text className="text-lg font-black text-card-foreground">{name}</Text>
                    <Text className="mt-1 text-sm text-muted-foreground">{email}</Text>
                </View>
            </View>

            <View className="gap-3">
                <AccountInfo label="Perfil" value={roleLabel} />
                {role === "SELLER" ? <AccountInfo label="Loja" value={storeName ?? "Não vinculada"} /> : null}
            </View>
        </View>
    );
}

function AccountInfo({ label, value }: { label: string; value: string }) {
    return (
        <View className="rounded-2xl border border-border bg-background px-4 py-3">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">{label}</Text>
            <Text className="mt-1 text-sm font-bold text-foreground" numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}
