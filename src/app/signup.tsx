import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";

import { AuthHeader } from "@/src/domains/auth/components/auth-header";
import { CustomerSignupForm } from "@/src/domains/auth/components/customer-signup-form";
import { RoleSelector } from "@/src/domains/auth/components/role-selector";
import { SellerSignupForm } from "@/src/domains/auth/components/seller-signup-form";
import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { RegisterCustomerFormData, registerCustomerSchema, RegisterSellerFormData, registerSellerSchema } from "@/src/domains/auth/utils/auth-schema";
import { Screen } from "@/src/shared/components/ui/screen";

type RoleOption = "SELLER" | "CUSTOMER";

export default function SignupScreen() {
    const { signupSeller, signupCustomer } = useAuth();

    const [role, setRole] = useState<RoleOption>("SELLER");

    const [serverError, setServerError] = useState("");

    const sellerForm = useForm<RegisterSellerFormData>({
        resolver: zodResolver(registerSellerSchema),

        defaultValues: {
            name: "",
            email: "",
            password: "",
            cpf: "",
            phone: "",
            storeName: "",
            storeCategory: "",
        },
    });

    const customerForm = useForm<RegisterCustomerFormData>({
        resolver: zodResolver(registerCustomerSchema),

        defaultValues: {
            name: "",
            email: "",
            password: "",
            cpf: "",
            phone: "",
        },
    });

    async function handleSellerSignup(data: RegisterSellerFormData) {
        try {
            setServerError("");
            await signupSeller(data);
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "Erro ao criar conta.");
        }
    }

    async function handleCustomerSignup(data: RegisterCustomerFormData) {
        try {
            setServerError("");
            await signupCustomer(data);
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "Erro ao criar conta.");
        }
    }

    return (
        <Screen scroll>
            <View className="w-full">
                <AuthHeader title="Criar conta" description="Configure sua conta para começar a operar normalmente na plataforma." />

                <RoleSelector value={role} onChange={setRole} />

                {role === "SELLER" ? <SellerSignupForm form={sellerForm} onSubmit={handleSellerSignup} serverError={serverError} /> : <CustomerSignupForm form={customerForm} onSubmit={handleCustomerSignup} serverError={serverError} />}
            </View>
        </Screen>
    );
}
