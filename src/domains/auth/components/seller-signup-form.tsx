import { UseFormReturn } from "react-hook-form";
import { Text, View } from "react-native";

import { FormInput } from "@/src/shared/components/form/form-input";
import { FormPasswordInput } from "@/src/shared/components/form/form-password-input";
import { Button } from "@/src/shared/components/ui/button";
import { Masks } from "react-native-mask-input";
import { RegisterSellerFormData } from "@/src/domains/auth/utils/auth-schema";

type SellerSignupFormProps = {
    form: UseFormReturn<RegisterSellerFormData>;
    onSubmit: (data: RegisterSellerFormData) => void;
    serverError?: string;
};

export function SellerSignupForm({ form, onSubmit, serverError }: SellerSignupFormProps) {
    return (
        <View className="gap-5">
            <FormInput control={form.control} name="name" label="Nome" placeholder="Seu nome" />

            <FormInput control={form.control} name="email" label="Email" placeholder="email@exemplo.com" keyboardType="email-address" />

            <FormPasswordInput control={form.control} name="password" label="Senha" placeholder="Sua senha" />

            <FormInput control={form.control} name="cpf" label="CPF" placeholder="00000000000" keyboardType="numeric" mask={Masks.BRL_CPF} />

            <FormInput control={form.control} name="phone" label="Telefone" placeholder="11999999999" keyboardType="phone-pad" mask={Masks.BRL_PHONE} />

            <FormInput control={form.control} name="storeName" label="Nome da loja" placeholder="Minha loja" />

            <FormInput control={form.control} name="storeCategory" label="Categoria" placeholder="Mercado" />

            {serverError ? <Text className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm font-medium text-red-400">{serverError}</Text> : null}

            <View className="pt-2">
                <Button title="Criar conta" onPress={form.handleSubmit(onSubmit)} loading={form.formState.isSubmitting} />
            </View>
        </View>
    );
}
