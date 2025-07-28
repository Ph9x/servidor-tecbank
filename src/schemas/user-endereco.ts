import { z } from "zod";

const ufValida = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
    "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const validarCep = (cep: string) => {
    return /^\d{5}-\d{3}$/.test(cep);
};

export const EnderecoSchema = z.object({
    cep: z.string()
        .refine(validarCep, { message: "CEP deve ser no formato xxxxx-xxx" }),

    rua: z.string()
        .min(3, "Rua deve ter pelo menos 3 caracteres")
        .max(255, "Rua não pode ter mais de 255 caracteres"),

    numero: z.string()
        .min(1, "Número é obrigatório")
        .max(20),

    cidade: z.string()
        .min(3, "Cidade deve ter pelo menos 3 caracteres")
        .max(255),

    uf: z.string()
        .min(2, "UF deve ter 2 caracteres")
        .max(2, "UF deve ter 2 caracteres")
        .refine(uf => ufValida.includes(uf), { message: "UF inválida" })
})