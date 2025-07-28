//CRIANDO UM TOKEN PARA IDENTIFICAR O USUÁRIO E MOSTRAR QUE APENAS USUÁRIO ESPECÍFICOS PODEM ACESSAR ALGUMA ROTA
import jwt from "jsonwebtoken";
import { prisma } from "../libs/prisma";
import { NextFunction, Response, Request } from "express";
import { ExtendedRequest } from "../types/extended-request";

// Chave secreta usada para assinar o token
const JWT_SECRET = process.env.JWT_SECRET as string;

export const criarSessao = async (usuarioId: string) => {
  // Define tempo de expiração (ex: 1 hora)
  const duracaoEmHoras = 1;
  const expiracao = new Date(Date.now() + duracaoEmHoras * 60 * 60 * 1000);

  // Busca uma conta do usuário (a primeira, ou você pode definir uma regra)
  const conta = await prisma.conta.findFirst({
    where: { usuarioId },
    orderBy: { criadoEm: "asc" },  // ou qualquer critério para definir a conta "principal"
  });

  if (!conta) {
    throw new Error("Usuário não possui conta para sessão");
  }

  // Gera o token JWT
  const tokenJwt = jwt.sign(
    {
      sub: usuarioId, // identificação do dono do token
      contaOrigemId: conta.id,  // incluir id da conta no payload do token
    },
    JWT_SECRET,
    {
      expiresIn: `${duracaoEmHoras}h`,
    }
  );

  // Salva no banco
  const sessao = await prisma.sessao.create({
    data: {
      usuarioId,
      tokenJwt,
      expiracao,
      ativo: true,
    },
  });

  // Retorna o token gerado
  return tokenJwt;
};


//FUNÇÃO PARA VALIDAR O TOKEN Middleware DEPOIS DO LOGIN, SÓ USUÁRIOS AUTENTICADOS CONSEGUIRAM ACESSAR AS MINHAS ROTAS INTERNAS
export const VerificarToken = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {   //CASO O TOKEN SEJA DIFERENTE DE Bearer  
    return res.status(401).json({ error: "Acesso negado: token não fornecido ou mal formatado" });
  }

  const token = authHeader.split(" ")[1]; //Bearer <token>

  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    async (err, decode: any) => {
      if (err || !decode) {     //CASO O TOKEN SEJA IGUAL A Bearer E ESTEJA EXPIRADO
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }

      try {
        // Verificar no banco de dados se a sessão ainda está ativa
        const sessao = await prisma.sessao.findFirst({
          where: { tokenJwt: token },
        });
        // Se a sessão não for encontrada ou estiver inativa, retornar erro
        if (!sessao || !sessao.ativo) {
          return res.status(401).json({ error: "Sessão inativa ou inválida" });
        }
        // Busca a conta do usuário para obter contaOrigemId
        const conta = await prisma.conta.findFirst({
          where: { usuarioId: decode.sub || decode.id },
        });

        if (!conta) {
          return res.status(404).json({ error: "Conta do usuário não encontrada" });
        }



        req.user = {
          id: decode.sub || decode.id,
          contaOrigemId: conta.id,
        };
        next();
      } catch (error) {
        return res.status(500).json({ error: "Erro ao verificar sessão no banco de dados" });
      }
    }
  );
}

//FUNÇÃO PARA INVÁLIDAR O TOKEN
export const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(400).json({ error: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Remove ou marca o token como inválido no banco
    await prisma.sessao.updateMany({
      where: {
        tokenJwt: token,
        ativo: true,
      },
      data: {
        ativo: false
      }
    });

    return res.status(200).json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao fazer logout" });
  }
}
