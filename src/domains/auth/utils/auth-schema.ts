import { z } from "zod";

const NAME_MAX_LENGTH = 120;
const EMAIL_MAX_LENGTH = 255;
const PASSWORD_MAX_LENGTH = 72;
const CPF_MAX_LENGTH = 14;
const PHONE_MAX_LENGTH = 16;
const STORE_NAME_MAX_LENGTH = 120;
const STORE_CATEGORY_MAX_LENGTH = 100;

export const loginSchema = z.object({
    email: z.string().min(1, "Informe o email.").max(EMAIL_MAX_LENGTH, "O email pode ter no máximo 255 caracteres.").email("Email inválido."),
    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").max(PASSWORD_MAX_LENGTH, "A senha pode ter no máximo 72 caracteres."),
});

export const registerCustomerSchema = z.object({
    name: z.string().min(3, "Informe seu nome.").max(NAME_MAX_LENGTH, "O nome pode ter no máximo 120 caracteres."),
    email: z.string().max(EMAIL_MAX_LENGTH, "O email pode ter no máximo 255 caracteres.").email("Email inválido."),
    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").max(PASSWORD_MAX_LENGTH, "A senha pode ter no máximo 72 caracteres."),
    cpf: z.string().min(11, "CPF inválido.").max(CPF_MAX_LENGTH, "O CPF pode ter no máximo 14 caracteres."),
    phone: z.string().min(10, "Telefone inválido.").max(PHONE_MAX_LENGTH, "O telefone pode ter no máximo 16 caracteres."),
});

export const registerSellerSchema = registerCustomerSchema.extend({
    storeName: z.string().min(2, "Informe o nome da loja.").max(STORE_NAME_MAX_LENGTH, "O nome da loja pode ter no máximo 120 caracteres."),
    storeCategory: z.string().min(2, "Informe a categoria.").max(STORE_CATEGORY_MAX_LENGTH, "A categoria pode ter no máximo 100 caracteres."),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterCustomerFormData = z.infer<typeof registerCustomerSchema>;
export type RegisterSellerFormData = z.infer<typeof registerSellerSchema>;
