import { RequestHandler } from "express";
import { ExtendedRequestConta } from "../types/extended-request";
import { prisma } from "../libs/prisma";

export const listarTransacoesUsuario: RequestHandler = async (req, res) => {
    const reqExt = req as ExtendedRequestConta;
    const usuarioId = reqExt.user?.id;

    try {
        // Busca todas as contas do usuário
        const contas = await prisma.conta.findMany({
            where: { usuarioId },
            select: { id: true },
        });

        const contaIds = contas.map((conta) => conta.id);

        // Transações (PIX)
        const transacoes = await prisma.transacao.findMany({
            where: {
                OR: [
                    { contaOrigemId: { in: contaIds } },
                    { contaDestinoId: { in: contaIds } },
                ],
            },
            include: {
                contaOrigem: { include: { usuario: true } },
                contaDestino: { include: { usuario: true } },
            },
        });

        const transacoesFormatadas = transacoes.map((transacao) => {
            const ehEnvio = contaIds.includes(transacao.contaOrigemId);

            return {
                id: transacao.id,
                tipo: transacao.tipo,
                status: transacao.status,
                valor: transacao.valor,
                descricao: transacao.descricao,
                data: transacao.dataTransacao,
                ehEnvio,
                remetente: {
                    nome: transacao.contaOrigem.usuario.nome,
                    cpf: transacao.contaOrigem.usuario.cpf,
                    numeroConta: transacao.contaOrigem.numero,
                    agencia: transacao.contaOrigem.agencia,
                },
                destinatario: transacao.contaDestino
                    ? {
                          nome: transacao.contaDestino.usuario.nome,
                          cpf: transacao.contaDestino.usuario.cpf,
                          numeroConta: transacao.contaDestino.numero,
                          agencia: transacao.contaDestino.agencia,
                      }
                    : null,
            };
        });

        // Pagamentos via QR Code
        const pagamentos = await prisma.pagamentoPixSimulado.findMany({
            where: {
                contaId: { in: contaIds },
                status: "concluida",
            },
            include: {
                conta: { include: { usuario: true } },
            },
        });

        const pagamentosFormatados = pagamentos.map((pagamento) => ({
            id: pagamento.id,
            tipo: "PIX_QRCODE",
            status: pagamento.status,
            valor: pagamento.valor,
            descricao: "Pagamento via QR Code",
            data: pagamento.pagoEm || pagamento.expiraEm,
            ehEnvio: true,
            remetente: {
                nome: pagamento.conta.usuario.nome,
                cpf: pagamento.conta.usuario.cpf,
                numeroConta: pagamento.conta.numero,
                agencia: pagamento.conta.agencia,
            },
            destinatario: null,
        }));

        // Pagamentos de boletos
        const boletos = await prisma.pagamentoBoleto.findMany({
            where: {
                contaId: { in: contaIds },
                status: "concluida",
            },
            include: {
                conta: { include: { usuario: true } },
            },
        });

        const boletosFormatados = boletos.map((boleto) => ({
            id: boleto.id,
            tipo: "BOLETO",
            status: boleto.status,
            valor: boleto.valor,
            descricao: "Pagamento de Boleto",
            data: boleto.pagoEm || boleto.criadoEm,
            ehEnvio: true,
            codigoBarras:boleto.codigoBarras,
            cidade: "SAOPAULO",
            remetente: {
                nome: boleto.conta.usuario.nome,
                cpf: boleto.conta.usuario.cpf,
                numeroConta: boleto.conta.numero,
                agencia: boleto.conta.agencia,
            },
            destinatario: null,
        }));

        // Combina e ordena todos por data (decrescente)
        const resultado = [
            ...transacoesFormatadas,
            ...pagamentosFormatados,
            ...boletosFormatados,
        ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

        return res.status(200).json(resultado);
    } catch (error) {
        console.error("Erro ao listar transações:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};
