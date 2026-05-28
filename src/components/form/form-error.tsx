import { Text } from "react-native";

type FormErrorProps = {
    message?: string;
};

export function FormError({ message }: FormErrorProps) {
    if (!message) {
        return null;
    }

    return <Text className="mt-2 text-sm font-medium text-red-500">{message}</Text>;
}
