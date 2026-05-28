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
    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <View>
                    <Text className="mb-2 text-sm font-semibold text-foreground">{label}</Text>

                    <TextInput className="h-14 rounded-2xl border border-border bg-card px-4 text-card-foreground" placeholder={placeholder} secureTextEntry value={String(field.value ?? "")} onChangeText={field.onChange} />

                    <FormError message={fieldState.error?.message} />
                </View>
            )}
        />
    );
}
