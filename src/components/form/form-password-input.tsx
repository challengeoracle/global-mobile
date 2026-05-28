import { useColorScheme } from "nativewind";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Text, TextInput, View } from "react-native";

import { FormError } from "./form-error";

type FormPasswordInputProps<T extends FieldValues> = {
    control: Control<T>;
    name: Path<T>;
    label: string;
    placeholder?: string;
};

export function FormPasswordInput<T extends FieldValues>({ control, name, label, placeholder }: FormPasswordInputProps<T>) {
    const { colorScheme } = useColorScheme();

    const isDark = colorScheme === "dark";

    const placeholderColor = isDark ? "#71717a" : "#a1a1aa";
    const selectionColor = isDark ? "#ef4444" : "#dc2626";

    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <View className="gap-2">
                    <Text className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">{label}</Text>

                    <TextInput className="h-14 rounded-2xl border border-border bg-card px-4 text-base text-card-foreground" placeholder={placeholder} placeholderTextColor={placeholderColor} selectionColor={selectionColor} secureTextEntry value={String(field.value ?? "")} onChangeText={field.onChange} autoCapitalize="none" />

                    <FormError message={fieldState.error?.message} />
                </View>
            )}
        />
    );
}
