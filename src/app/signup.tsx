import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthHeader } from "../components/auth/auth-header";
import { CustomerSignupForm } from "../components/auth/customer-signup-form";
import { RoleSelector } from "../components/auth/role-selector";
import { SellerSignupForm } from "../components/auth/seller-signup-form";

import { Screen } from "../components/ui/screen";

import { useAuth } from "../contexts/auth-context";

import { View } from "react-native";
import { RegisterCustomerFormData, registerCustomerSchema, RegisterSellerFormData, registerSellerSchema } from "../schemas/auth-schema";

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
