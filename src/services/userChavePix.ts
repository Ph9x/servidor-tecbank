import { RequestHandler } from "express";
import { prisma } from "../libs/prisma";
import { ExtendedRequestConta } from "../types/extended-request";

//FUNÇÃO PARA VER SE CHAVE PIX ESTÁ CADASTRADA/CRIAR
export const userChavePix: RequestHandler = async (req, res) => {
    const reqExt = req as ExtendedRequestConta;


    const { tipoChave, chave } = req.body;

    if (!tipoChave || !chave) {
        return res.status(400).json({ message: "tipoChave e chave são obrigatórios" });
    }

    const tiposValidos = ["cpf", "email", "telefone", "aleatoria"];
    if (!tiposValidos.includes(tipoChave)) {
        return res.status(400).json({ message: "tipoChave inválido" });
    }

    try {
        const contaId = reqExt.user?.contaOrigemId;     
        if (!contaId) return res.status(400).json({ message: "Conta do usuário não encontrada" });

        //VERIFICAR SE A CHAVE PIX JÁ EXISTE
        const chaveExistente = await prisma.chavePix.findUnique({ where: { chave } });
        if (chaveExistente) {
            return res.status(400).json({ message: "Chave Pix já cadastrada" });
        }

        const novaChave = await prisma.chavePix.create({
            data: {
                contaId,
                tipo: tipoChave,
                chave,
            },
        });

        return res.status(201).json(novaChave);
    } catch (error) {
        console.error("Erro ao cadastrar chave Pix:", error);
        return res.status(500).json({ message: "Erro interno no servidor" });
    }
};



//FUNÇÃO PARA RETORNAR AS CHAVES CADASTRADAS
export const listarChavesPixDoUsuario: RequestHandler = async (req, res) => {
    const reqExt = req as ExtendedRequestConta;
    try {
        const contaId = reqExt.user?.contaOrigemId;    
        if (!contaId) return res.status(400).json({ message: "Conta não encontrada" });

        const chaves = await prisma.chavePix.findMany({
            where: { contaId },
            select: { tipo: true, chave: true, criadaEm: true },
        });

        return res.json(chaves);
    } catch (error) {
        console.error("Erro ao listar chaves Pix:", error);
        return res.status(500).json({ message: "Erro interno no servidor" });
    }
};


//FUNÇÃO PARA REMOVER CHAVE PIX 
export const deletarChavePix: RequestHandler = async (req, res) => {
    const { chave } = req.body;
    const reqExt = req as ExtendedRequestConta;

    if (!chave) {
        return res.status(400).json({ message: "chave é obrigatória" });
    }

    try {
        const contaId = reqExt.user?.contaOrigemId;        //ALTERADO
        if (!contaId) return res.status(400).json({ message: "Conta do usuário não encontrada" });

        // Verifica se a chave pertence a conta do usuário
        const chavePix = await prisma.chavePix.findUnique({ where: { chave } });
        if (!chavePix || chavePix.contaId !== contaId) {
            return res.status(404).json({ message: "Chave Pix não encontrada para o usuário" });
        }

        await prisma.chavePix.delete({ where: { chave } });

        return res.json({ message: "Chave Pix excluída com sucesso" });
    } catch (error) {
        console.error("Erro ao excluir chave Pix:", error);
        return res.status(500).json({ message: "Erro interno no servidor" });
    }
};



//FUNÇÃO PARA RETORNAR DADOS PARA CHAVE PIX 
export const dadosChavePix: RequestHandler = async (req: any, res) => {
    try {
        const usuarioId = req.user?.id;
        if (!usuarioId) {
            return res.status(401).json({ error: "Usuário não autenticado" });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            select: {
                cpf: true,
                email: true,
                celular: true,
            },
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        return res.json(usuario);
    } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};