import { z } from "zod";

export const LoginSchema = z.object({
    cpf: z.string({message: "Esse campo é obrigatório"}).regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos"),
    senha: z.string({message: "Preencha a senha"}).regex(/^\d{6}$/, "A senha deve conter exatamente 6 números"),
})
