import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { AuthHeader } from "@/src/domains/auth/components/auth-header";
import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { LoginFormData, loginSchema } from "@/src/domains/auth/utils/auth-schema";
import { FormInput } from "@/src/shared/components/form/form-input";
import { FormPasswordInput } from "@/src/shared/components/form/form-password-input";
import { Button } from "@/src/shared/components/ui/button";
import { Screen } from "@/src/shared/components/ui/screen";

export default function LoginScreen() {
    const { login } = useAuth();

    const [serverError, setServerError] = useState("");

    const {
        control,
        handleSubmit,
        formState: { isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),

        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(data: LoginFormData) {
        try {
            setServerError("");

            await login(data);
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "Não foi possível entrar.");
        }
    }

    return (
        <Screen>
            <View className="w-full">
                <AuthHeader title="Entrar" description="Entre na sua conta para iniciar a operação." />

                <View className="gap-5">
                    <FormInput control={control} name="email" label="Email" placeholder="email@exemplo.com" keyboardType="email-address" />

                    <FormPasswordInput control={control} name="password" label="Senha" placeholder="Sua senha" />

                    {serverError ? (
                        <View className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4">
                            <Text className="text-sm font-medium leading-6 text-red-400">{serverError}</Text>
                        </View>
                    ) : null}

                    <View className="pt-2">
                        <Button title="Entrar" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
                    </View>

                    <Link href={"/signup" as any}>
                        <Text className="mt-2 text-center text-sm font-bold uppercase tracking-[2px] text-primary">Criar conta</Text>
                    </Link>
                </View>
            </View>
        </Screen>
    );
}
