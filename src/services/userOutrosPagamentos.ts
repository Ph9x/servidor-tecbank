import { RequestHandler } from "express";
import QRCode from "qrcode";
import { prisma, Decimal } from "../libs/prisma"; // ajuste conforme seu projeto
import { addDays, addMinutes } from "date-fns";
import { Prisma, StatusTransacao } from "@prisma/client";
import bwipjs from "bwip-js";               //BIBLIOTECA PARA GERAR BOLETOS
import { ExtendedRequestConta } from "../types/extended-request";


export const gerarPixQRCode: RequestHandler = async (req, res) => {
    try {
        const { chave, valor, contaId } = req.body;

        if (!chave || !contaId) {
            return res.status(400).json({ message: "Campos chave e contaId são obrigatórios" });
        }

        const valorDecimal = valor ? new Decimal(valor) : new Decimal("0.00");

        const pagamento = await prisma.pagamentoPixSimulado.create({
            data: {
                contaId,
                codigoPix: chave,
                valor: valorDecimal,
                status: "pendente",
                criadoEm: new Date(),
                expiraEm: addMinutes(new Date(), 15),
            },
        });

        const payloadPix = pagamento.id;
        const qrCodeBuffer = await QRCode.toBuffer(payloadPix);

        res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": qrCodeBuffer.length,
            "X-Pagamento-Id": pagamento.id,
        });
        return res.end(qrCodeBuffer);

    } catch (error) {
        console.error("Erro ao gerar QR code PIX:", error);
        return res.status(500).json({ message: "Erro interno ao gerar QR code" });
    }
};



//FUNÇÃO PARA CONFIRMAR PAGAMENTO
export const confirmarPagamentoPix: RequestHandler = async (req, res) => {
    try {
        const reqExt = req as ExtendedRequestConta;
        const { pagamentoId } = req.body;

        if (!pagamentoId) {
            return res.status(400).json({ message: "PagamentoId é obrigatório no body" });
        }

        const usuarioId = reqExt.user?.id;
        if (!usuarioId) {
            return res.status(401).json({ message: "Não autorizado" });
        }

        // Busca o pagamento
        const pagamento = await prisma.pagamentoPixSimulado.findUnique({
            where: { id: pagamentoId },
        });

        if (!pagamento) {
            return res.status(404).json({ message: "Pagamento não encontrado" });
        }

        if (new Date() > pagamento.expiraEm) {
            return res.status(400).json({ message: "Pagamento expirado" });
        }

        if (pagamento.status !== StatusTransacao.pendente) {
            return res.status(400).json({ message: "Pagamento já confirmado ou inválido" });
        }

        // Busca a conta do usuário autenticado
        const contaOrigem = await prisma.conta.findFirst({
            where: { usuarioId },
        });

        if (!contaOrigem) {
            return res.status(404).json({ message: "Conta do usuário não encontrada" });
        }

        const valorPagamento = new Prisma.Decimal(pagamento.valor);
        const saldoAtual = new Prisma.Decimal(contaOrigem.saldo);

        // Verifica se a conta tem saldo suficiente
        if (saldoAtual.lt(valorPagamento)) {
            return res.status(400).json({ message: "Saldo insuficiente para confirmar o pagamento" });
        }

        // Transação para debitar e confirmar
        const [_, pagamentoAtualizado] = await prisma.$transaction([
            prisma.conta.update({
                where: { id: contaOrigem.id },
                data: {
                    saldo: saldoAtual.sub(valorPagamento),
                },
            }),
            prisma.pagamentoPixSimulado.update({
                where: { id: pagamentoId },
                data: {
                    status: StatusTransacao.concluida,
                    pagoEm: new Date(),
                    contaId: contaOrigem.id, // atualiza quem realmente pagou
                },
            }),
        ]);

        return res.json({
            message: "Pagamento confirmado com sucesso e saldo debitado",
            pagamento: pagamentoAtualizado,
        });
    } catch (error) {
        console.error("Erro ao confirmar pagamento PIX:", error);
        return res.status(500).json({ message: "Erro interno ao confirmar pagamento" });
    }
};

//LER OS DADOS COLOCADOS
export const lerPixQRCode: RequestHandler = async (req, res) => {
    try {
        const chave = req.query.chave as string;

        if (!chave) {
            return res.status(400).json({ message: "Chave não informada" });
        }

        const pagamento = await prisma.pagamentoPixSimulado.findUnique({
            where: { id: chave },
            include: {
                conta: {
                    include: {
                        usuario: true,
                    },
                },
            },
        });

        if (!pagamento) {
            return res.status(404).json({ message: "QR Code não encontrado" });
        }

        const agora = new Date();
        if (pagamento.expiraEm < agora) {
            return res.status(410).json({ message: "QR Code expirado" });
        }

        const { codigoPix, conta, valor } = pagamento;

        return res.status(200).json({
            chave: codigoPix,
            nome: conta.usuario.nome,
            cidade: "SAOPAULO",
            valor: valor.toFixed(2),
            contaId: conta.id,
        });
    } catch (error) {
        console.error("Erro ao ler QR Code PIX:", error);
        return res.status(500).json({ message: "Erro interno ao ler QR Code" });
    }
};


//FUNÇÃO PARA GERAR BOLETO
/* Simula um código de barras
function gerarCodigoBarras(): string {
  return Array.from({ length: 47 }, () => Math.floor(Math.random() * 10)).join("");
}

export const gerarBoleto: RequestHandler = async (req, res) => {
  try {
    const { valor, contaId } = req.body;

    if (!valor || !contaId) {
      return res.status(400).json({ message: "Campos valor e contaId são obrigatórios" });
    }

    const valorDecimal = new Decimal(valor);
    const codigoBarras = gerarCodigoBarras();

    const boleto = await prisma.pagamentoBoleto.create({
      data: {
        contaId:contaId.toString(),
        valor: valorDecimal,
        codigoBarras,
        status: StatusTransacao.pendente,
        criadoEm: new Date(),
        expiraEm: addDays(new Date(), 3),
      },
    });

    return res.status(201).json({
      boletoId: boleto.id,
      codigoBarras,
      valor: boleto.valor.toFixed(2),
      expiraEm: boleto.expiraEm,
    });
  } catch (error) {
    console.error("Erro ao gerar boleto:", error);
    return res.status(500).json({ message: "Erro interno ao gerar boleto" });
  }
};*/

//FUNÇÃO PARA GERAR BOLETO EM IMAGEM
export const gerarBoletoImagem: RequestHandler = async (req, res) => {
    try {
        const { valor, contaId } = req.body;

        if (!contaId) {
            return res.status(400).json({ message: "Campo contaId é obrigatório" });
        }

        const valorDecimal = valor ? new Decimal(valor) : new Decimal("0.00");

        // Gera número fictício para boleto
        const numeroBoleto = Math.random().toString().slice(2, 12);

        // Monta o código de barras (exemplo de boleto)
        let codigoBarras = `2379${numeroBoleto}000000${valorDecimal
            .toFixed(2)
            .replace(".", "")}12345678901`;

        if (codigoBarras.length % 2 !== 0) {
            codigoBarras = "0" + codigoBarras; // adiciona zero à esquerda para pares
        }

        // Salva no banco no modelo PagamentoBoleto
        const pagamento = await prisma.pagamentoBoleto.create({
            data: {
                contaId: contaId.toString(),
                codigoBarras: codigoBarras,
                valor: valorDecimal,
                status: StatusTransacao.pendente,
                criadoEm: new Date(),
                expiraEm: addMinutes(new Date(), 60),
            },
        });

        // Gera imagem do código de barras (Interleaved 2 of 5)
        const barcodeBuffer = await bwipjs.toBuffer({
            bcid: "code128",
            text: codigoBarras,
            scale: 2,
            height: 8,
            includetext: true,
            textxalign: "center",
            paddingwidth: 100,
            paddingheight: 30
        });

        // Envia a imagem como resposta com ID do pagamento no header
        res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": barcodeBuffer.length,
            "X-Pagamento-Id": pagamento.id,
        });

        return res.end(barcodeBuffer);
    } catch (error) {
        console.error("Erro ao gerar boleto imagem:", error);
        return res.status(500).json({ message: "Erro interno ao gerar boleto" });
    }
};

//FUNÇÃO PARA CONFIRMAR PAGAMENTO 
export const confirmarPagamentoBoleto: RequestHandler = async (req, res) => {
    try {
        const reqExt = req as ExtendedRequestConta;
        const { codigoBarras } = req.body;

        if (!codigoBarras) {
            return res.status(400).json({ message: "Código de barras é obrigatório" });
        }

        // 🔐 Garante que o usuário está autenticado
        const usuarioId = reqExt.user?.id;
        if (!usuarioId) {
            return res.status(401).json({ message: "Não autorizado" });
        }

        // Busca o boleto pelo código de barras
        const boleto = await prisma.pagamentoBoleto.findUnique({
            where: { codigoBarras },
        });

        if (!boleto) {
            return res.status(404).json({ message: "Boleto não encontrado" });
        }

        if (new Date() > boleto.expiraEm) {
            return res.status(400).json({ message: "Boleto expirado" });
        }

        if (boleto.status !== StatusTransacao.pendente) {
            return res.status(400).json({ message: "Boleto já pago ou inválido" });
        }

        // Busca a conta associada ao usuário autenticado
        const conta = await prisma.conta.findFirst({
            where: { usuarioId },
        });

        if (!conta) {
            return res.status(404).json({ message: "Conta não encontrada para o usuário logado" });
        }

        const valorBoleto = new Decimal(boleto.valor);
        const saldoAtual = new Decimal(conta.saldo);

        // Verifica se o saldo é suficiente
        if (saldoAtual.lt(valorBoleto)) {
            return res.status(400).json({ message: "Saldo insuficiente para pagar o boleto" });
        }

        // Executa a transação para debitar e atualizar status do boleto
        const boletoPago = await prisma.$transaction([
            prisma.conta.update({
                where: { id: conta.id },
                data: {
                    saldo: saldoAtual.sub(valorBoleto),
                },
            }),
            prisma.pagamentoBoleto.update({
                where: { id: boleto.id },
                data: {
                    status: StatusTransacao.concluida,
                    pagoEm: new Date(),
                    contaId: conta.id, // opcional: registra quem pagou
                },
            }),
        ]);

        return res.json({
            message: "Boleto pago com sucesso e saldo debitado",
            boleto: boletoPago[1],
        });
    } catch (error) {
        console.error("Erro ao pagar boleto:", error);
        return res.status(500).json({ message: "Erro interno ao pagar boleto" });
    }
};

//FUNÇÃO PARA VER DADOS DO USUÁRIO DO BOLETO
export const lerBoletoCodigoBarras: RequestHandler = async (req, res) => {
    try {
        const codigoBarras = req.query.codigoBarras as string;

        if (!codigoBarras) {
            return res.status(400).json({ message: "Código de barras não informado" });
        }

        // Busca o boleto pelo código
        const boleto = await prisma.pagamentoBoleto.findUnique({
            where: { codigoBarras },
            include: {
                conta: {
                    include: {
                        usuario: true,
                    },
                },
            },
        });

        if (!boleto) {
            return res.status(404).json({ message: "Boleto não encontrado" });
        }

        const agora = new Date();
        if (boleto.expiraEm < agora) {
            return res.status(410).json({ message: "Boleto expirado" });
        }

        return res.status(200).json({
            codigoBarras: boleto.codigoBarras,
            nome: boleto.conta.usuario.nome,
            cidade: "SAOPAULO", // pode ser um campo do usuário se quiser tornar isso dinâmico
            valor: boleto.valor.toFixed(2),
            contaId: boleto.conta.id,
        });
    } catch (error) {
        console.error("Erro ao ler boleto:", error);
        return res.status(500).json({ message: "Erro interno ao ler boleto" });
    }
};