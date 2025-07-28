import { z } from "zod";

// Validação do modelo Conta
export const ContaSchema = z.object({
    agencia: z.string()
        .min(1, "Agência não pode ser vazia")
        .max(10, "Agência não pode ter mais de 10 caracteres"),

    numero: z.string()
        .min(1, "Número da conta não pode ser vazio")
        .max(20, "Número da conta não pode ter mais de 20 caracteres")
        .regex(/^\d+$/, "Número da conta deve ser composto apenas por números"), // Valida que o número seja apenas numérico

});
