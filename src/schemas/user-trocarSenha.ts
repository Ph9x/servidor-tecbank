import { z } from 'zod';

export const AlterarSenhaSchema = z.object({
  senhaAtual: z.string().regex(/^\d{6}$/, "Digite a senha do seu aplicativo"),
  novaSenha: z.string().regex(/^\d{6}$/, "A senha deve conter exatamente 6 números"),
  confirmarSenha: z.string().regex(/^\d{6}$/, "A senha deve ser igual a senha acima")
}).refine(data => data.novaSenha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});
