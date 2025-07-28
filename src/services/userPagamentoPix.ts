import { RequestHandler } from "express";
import { prisma } from "../libs/prisma";
import { Prisma } from "@prisma/client";
import { ExtendedRequestConta } from "../types/extended-request";

// FUNÇÃO PARA TRANSFERIR DINHEIRO PARA ALGUMA CHAVE PIX
export const registrarPix: RequestHandler = async (req, res) => {
    const reqExt = req as ExtendedRequestConta;
    const { chaveDestino, valor, descricao } = reqExt.body;
    const contaOrigemId = reqExt.user?.contaOrigemId;

    if (!contaOrigemId) {
        return res.status(401).json({ message: "Conta origem não encontrada no token" });
    }

    if (!chaveDestino) {
        return res.status(400).json({ message: "Faltando dados obrigatórios: chaveDestino" });
    }

    if (valor === undefined || isNaN(valor)) {
        return res.status(400).json({ message: "Faltando dados obrigatórios: valor ou valor não é um número" });
    }

    try {
        //VERIFICA SE ALGUMA CONTA DE ORIGEM EXISTE
        const contaOrigem = await prisma.conta.findUnique({
            where: { id: contaOrigemId },
            include: { usuario: true }, // incluir o CPF do usuário da origem
        });

        if (!contaOrigem) {
            return res.status(404).json({ message: "Conta de origem não encontrada" });
        }

        //VERIFICA A CHAVE PIX DO DESTINO
        const chaveDestinoEncontrada = await prisma.chavePix.findUnique({
            where: { chave: chaveDestino },
        });

        if (!chaveDestinoEncontrada) {
            return res.status(404).json({ message: "Chave Pix de destino não encontrada" });
        }

        //OBTEM O ID DO DESTINO A PARTIR DA CHAVE PIX
        const contaDestino = await prisma.conta.findUnique({
            where: { id: chaveDestinoEncontrada.contaId },
            include: {
                usuario: true, // Inclui o usuário relacionado à conta de destino
            },
        });

        if (!contaDestino) {
            return res.status(404).json({ message: "Conta de destino não encontrada" });
        }

        //VERIFCA SE O CPF DE ORIGEM É IGUAL
        if (contaOrigem.usuario.cpf === contaDestino.usuario.cpf) {
            return res.status(400).json({ message: "Você não pode enviar Pix para você mesmo." });
        }

        //VERIFICA SE TEM SALDO 
        const valorDecimal = new Prisma.Decimal(valor);
        const saldoOrigemDecimal = new Prisma.Decimal(contaOrigem.saldo);

        if (saldoOrigemDecimal.lt(valorDecimal)) {
            return res.status(400).json({ message: "Saldo insuficiente" });
        }

        //CRIA A TRANSAÇÃO PIX
        const novaTransacao = await prisma.transacao.create({
            data: {
                tipo: "PIX",
                contaOrigemId,
                contaDestinoId: contaDestino.id,
                valor: valorDecimal,
                descricao: descricao || "Transação PIX",
                status: "concluida",
            },
        });

        const saldoDestinoDecimal = new Prisma.Decimal(contaDestino.saldo);

        // Atualiza os saldos das contas de origem e destino
        await prisma.conta.update({
            where: { id: contaOrigemId },
            data: { saldo: saldoOrigemDecimal.sub(valorDecimal) },
        });

        await prisma.conta.update({
            where: { id: contaDestino.id },
            data: { saldo: saldoDestinoDecimal.add(valorDecimal) },
        });

        console.log("Saldo origem antes:", saldoOrigemDecimal.toString());
        console.log("Valor a subtrair:", valorDecimal.toString());
        console.log("Saldo destino antes:", saldoDestinoDecimal.toString());

        return res.status(201).json({
            message: "Transação PIX realizada com sucesso",
            transacao: novaTransacao,
            dadosDestino: {
                nome: contaDestino.usuario.nome,
                cpf: contaDestino.usuario.cpf,
                agencia: contaDestino.agencia,
                conta: contaDestino.numero,
                descricao: descricao || "Transação PIX",
            },
        });
    } catch (error) {
        console.error("Erro ao registrar a transação PIX:", error);
        return res.status(500).json({ message: "Erro interno ao registrar a transação" });
    }
};



//FUNÇÃO PARA VALIDAR CHAVE PIX 
export const validaChavePix: RequestHandler = async (req, res) => {
    const { chave } = req.body;

    console.log("Chave recebida:", chave); // Log para ver a chave

    if (!chave || typeof chave !== "string") {
        return res.status(400).json({ erro: "Chave inválida" });
    }

    const chavePix = await prisma.chavePix.findUnique({
        where: { chave },
        include: {
            conta: {
                include: {
                    usuario: {
                        select: {
                            nome: true,
                        },
                    },
                },
            },
        },
    });

    if (!chavePix) {
        return res.status(404).json({ erro: "Chave Pix não encontrada" });
    }

    return res.json({ chavePix });
};
