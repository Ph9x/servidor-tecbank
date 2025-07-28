import { z } from "zod";

// IDADE MÍNIMA 18
const hoje = new Date();
const idadeMinima = new Date(
    hoje.getFullYear() - 18,
    hoje.getMonth(),
    hoje.getDate()
);

// Função para formatar o celular
const formatarCelular = (celular: string) => {
    // Remove qualquer caractere não numérico (para limpar o número)
    const celularLimpo = celular.replace(/\D/g, "");

    // Verifica se o celular tem 11 dígitos (DD + número)
    if (celularLimpo.length !== 11) {
        throw new Error("Número de celular inválido");
    }

    // Formata no padrão (XX) XXXXX-XXXX
    return `(${celularLimpo.substring(0, 2)}) ${celularLimpo.substring(2, 7)}-${celularLimpo.substring(7)}`;
};

export const RegisterSchema = z.object({
    nome: z.string({ message: "Campo nome é obrigatório" }).min(2, "Nome deve ter pelo menos 2 caracteres"),

    cpf: z.string().regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos"),

    email: z.string({ message: "Campo E-mail é obrigatório" }).email("E-mail inválido"),

    celular: z.string()
        .min(11, "Celular deve conter DDD + número")
        .max(15, "Celular não pode ter mais que 15 caracteres")
        .transform(formatarCelular),  // Formata o celular

    //SENHA COM NÚMEROS EM STRING
    senhaHash: z.string().regex(/^\d{6}$/, "A senha deve conter exatamente 6 números"),
    confirmarSenhaHash: z.string().regex(/^\d{6}$/, "A confirmação deve conter exatamente 6 números"),

    dataNascimento: z.coerce.date().max(idadeMinima, {
        message: "Usuário deve ter pelo menos 18 anos",
    }).refine((date) => date <= new Date(), {
        message: "A data de nascimento não pode ser no futuro",
    }),
})
    .refine((data) => data.senhaHash === data.confirmarSenhaHash, {
        message: "As senhas não coincidem",
        path: ["confirmarSenhaHash"],
    });
