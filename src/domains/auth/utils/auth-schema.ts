import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().min(1, "Informe o email.").email("Email inválido."),

    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

export const registerCustomerSchema = z.object({
    name: z.string().min(3, "Informe seu nome."),

    email: z.string().email("Email inválido."),

    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),

    cpf: z.string().min(11, "CPF inválido."),

    phone: z.string().min(10, "Telefone inválido."),
});

export const registerSellerSchema = registerCustomerSchema.extend({
    storeName: z.string().min(2, "Informe o nome da loja."),

    storeCategory: z.string().min(2, "Informe a categoria."),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export type RegisterCustomerFormData = z.infer<typeof registerCustomerSchema>;

export type RegisterSellerFormData = z.infer<typeof registerSellerSchema>;
