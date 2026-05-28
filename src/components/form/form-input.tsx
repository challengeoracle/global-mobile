import { useColorScheme } from "nativewind";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { KeyboardTypeOptions, Text, TextInputProps, View } from "react-native";

import MaskInput from "react-native-mask-input";

type FormInputProps<T extends FieldValues> = {
    control: Control<T>;
    name: Path<T>;
    label: string;
    placeholder?: string;
    keyboardType?: KeyboardTypeOptions;
    secureTextEntry?: boolean;
    mask?: any;
} & TextInputProps;

export function FormInput<T extends FieldValues>({ control, name, label, placeholder, keyboardType, secureTextEntry, mask, ...props }: FormInputProps<T>) {
    const { colorScheme } = useColorScheme();

    const isDark = colorScheme === "dark";

    const placeholderColor = isDark ? "#71717a" : "#a1a1aa";
    const selectionColor = isDark ? "#ef4444" : "#dc2626";

    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <View className="gap-2">
                    <Text className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">{label}</Text>

                    <MaskInput value={String(value ?? "")} onChangeText={onChange} mask={mask} placeholder={placeholder} keyboardType={keyboardType} secureTextEntry={secureTextEntry} autoCapitalize="none" className="h-14 rounded-2xl border border-border bg-card px-4 text-base text-card-foreground" placeholderTextColor={placeholderColor} selectionColor={selectionColor} {...props} />

                    {error ? <Text className="text-sm text-red-400">{error.message}</Text> : null}
                </View>
            )}
        />
    );
}
