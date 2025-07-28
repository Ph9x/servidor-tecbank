import { RequestHandler } from "express";
import { ExtendedRequestConta } from "../types/extended-request";
import { prisma } from "../libs/prisma";
import { Prisma } from "@prisma/client";

//CAIXINHA PARA GUARDAR O DINHEIRO
export const adicionarDinheiro: RequestHandler = async (req, res) => {
  const reqExt = req as ExtendedRequestConta;
  const { caixinhaId, valor } = reqExt.body;
  const usuarioId = reqExt.user?.id;
  const contaId = reqExt.user?.contaOrigemId;

  if (!usuarioId || !contaId) {
    return res.status(401).json({ message: "Usuário não autenticado" });
  }

  if (!caixinhaId) {
    return res.status(400).json({ message: "ID da caixinha é obrigatório" });
  }

  if (valor === undefined || isNaN(valor) || valor <= 0) {
    return res.status(400).json({ message: "Valor inválido" });
  }

  try {
    // Buscar a conta do usuário
    const conta = await prisma.conta.findUnique({
      where: { id: contaId },
    });

    if (!conta) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    const saldoConta = new Prisma.Decimal(conta.saldo);
    const valorDecimal = new Prisma.Decimal(valor);

    if (saldoConta.lt(valorDecimal)) {
      return res.status(400).json({ message: "Saldo insuficiente na conta" });
    }

    // Buscar a caixinha
    const caixinha = await prisma.caixinha.findUnique({
      where: { id: caixinhaId },
    });

    if (!caixinha) {
      return res.status(404).json({ message: "Caixinha não encontrada" });
    }

    if (caixinha.usuarioId !== usuarioId) {
      return res.status(403).json({ message: "Caixinha não pertence ao usuário" });
    }

    // Fazer tudo de forma transacional
    const resultado = await prisma.$transaction([
      prisma.conta.update({
        where: { id: contaId },
        data: { saldo: saldoConta.sub(valorDecimal) },
      }),
      prisma.caixinha.update({
        where: { id: caixinhaId },
        data: { saldo: new Prisma.Decimal(caixinha.saldo).add(valorDecimal) },
      }),
    ]);

    return res.status(200).json({
      message: "Dinheiro transferido da conta para a caixinha com sucesso",
      contaAtualizada: resultado[0],
      caixinhaAtualizada: resultado[1],
    });

  } catch (error) {
    console.error("Erro ao adicionar dinheiro na caixinha:", error);
    return res.status(500).json({ message: "Erro interno" });
  }
};

//RESGATAR DINHEIRO DA CAIXINHA 
export const resgatarDinheiro: RequestHandler = async (req, res) => {
  const reqExt = req as ExtendedRequestConta;
  const { caixinhaId, valor } = reqExt.body;
  const usuarioId = reqExt.user?.id;
  const contaId = reqExt.user?.contaOrigemId;

  if (!usuarioId || !contaId) {
    return res.status(401).json({ message: "Usuário não autenticado" });
  }

  if (!caixinhaId) {
    return res.status(400).json({ message: "ID da caixinha é obrigatório" });
  }

  if (valor === undefined || isNaN(valor) || valor <= 0) {
    return res.status(400).json({ message: "Valor inválido" });
  }

  try {
    // Buscar caixinha
    const caixinha = await prisma.caixinha.findUnique({
      where: { id: caixinhaId },
    });

    if (!caixinha) {
      return res.status(404).json({ message: "Caixinha não encontrada" });
    }

    if (caixinha.usuarioId !== usuarioId) {
      return res.status(403).json({ message: "Caixinha não pertence ao usuário" });
    }

    const saldoCaixinha = new Prisma.Decimal(caixinha.saldo);
    const valorDecimal = new Prisma.Decimal(valor);

    if (saldoCaixinha.lt(valorDecimal)) {
      return res.status(400).json({ message: "Saldo insuficiente na caixinha" });
    }

    // Buscar conta
    const conta = await prisma.conta.findUnique({
      where: { id: contaId },
    });

    if (!conta) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    const saldoConta = new Prisma.Decimal(conta.saldo);

    // Transação: tira da caixinha e põe na conta
    const resultado = await prisma.$transaction([
      prisma.caixinha.update({
        where: { id: caixinhaId },
        data: { saldo: saldoCaixinha.sub(valorDecimal) },
      }),
      prisma.conta.update({
        where: { id: contaId },
        data: { saldo: saldoConta.add(valorDecimal) },
      }),
    ]);

    return res.status(200).json({
      message: "Dinheiro resgatado da caixinha com sucesso",
      caixinhaAtualizada: resultado[0],
      contaAtualizada: resultado[1],
    });

  } catch (error) {
    console.error("Erro ao resgatar dinheiro da caixinha:", error);
    return res.status(500).json({ message: "Erro interno" });
  }
};


//LISTAR CAIXINHAS DO USUARIO
export const listarCaixinhasUsuario: RequestHandler = async (req, res) => {
    const reqExt = req as ExtendedRequestConta;
    const usuarioId = reqExt.user?.id;

    if (!usuarioId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
    }

    try {
        const caixinhas = await prisma.caixinha.findMany({
            where: { usuarioId },
            orderBy: { criadoEm: 'desc' },
        });

        return res.status(200).json(caixinhas);

    } catch (error) {
        console.error("Erro ao listar caixinhas:", error);
        return res.status(500).json({ message: "Erro interno" });
    }
};

//CRIAR UMA CAIXINHA 
export const criarCaixinha: RequestHandler = async (req, res) => {
    const reqExt = req as ExtendedRequestConta;
    const usuarioId = reqExt.user?.id;
    const { nome } = req.body;

    if (!usuarioId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
    }

    if (!nome) {
        return res.status(400).json({ message: "Nome da caixinha é obrigatório" });
    }

    try {
        const novaCaixinha = await prisma.caixinha.create({
            data: {
                nome,
                usuarioId,
                saldo: 0,
            },
        });

        return res.status(201).json(novaCaixinha);
    } catch (error) {
        console.error("Erro ao criar caixinha:", error);
        return res.status(500).json({ message: "Erro interno" });
    }
};


//EXCLUI CAIXINHA 
export const excluirCaixinha: RequestHandler = async (req, res) => {
  const reqExt = req as ExtendedRequestConta;
  const usuarioId = reqExt.user?.id;
  const { caixinhaId } = req.body;

  if (!usuarioId) {
    return res.status(401).json({ message: "Usuário não autenticado" });
  }

  if (!caixinhaId) {
    return res.status(400).json({ message: "ID da caixinha é obrigatório" });
  }

  try {
    const caixinha = await prisma.caixinha.findUnique({
      where: { id: caixinhaId },
    });

    if (!caixinha) {
      return res.status(404).json({ message: "Caixinha não encontrada" });
    }

    if (caixinha.usuarioId !== usuarioId) {
      return res.status(403).json({ message: "Caixinha não pertence ao usuário" });
    }

    if (caixinha.saldo.gt(0)) { // usa .gt() do Prisma.Decimal para comparar
      return res.status(400).json({ message: "Não é possível excluir uma caixinha com saldo" });
    }

    await prisma.caixinha.delete({
      where: { id: caixinhaId },
    });

    return res.status(200).json({ message: "Caixinha excluída com sucesso" });

  } catch (error) {
    console.error("Erro ao excluir caixinha:", error);
    return res.status(500).json({ message: "Erro interno" });
  }
};


//SIMULAR RENDIMENTO DA CAIXINHA

const taxaJurosMensal = 0.10; // 10% NO MÊS

export const simularRendimentoCaixinha: RequestHandler = async (req, res) => {
  const reqExt = req as ExtendedRequestConta;
  const usuarioId = reqExt.user?.id;

  if (!usuarioId) {
    return res.status(401).json({ message: "Usuário não autenticado" });
  }

  try {
    const caixinhas = await prisma.caixinha.findMany({
      where: { usuarioId },
    });

    const hoje = new Date();

    const resultado = caixinhas.map(caixinha => {
      const saldoInicial = new Prisma.Decimal(caixinha.saldo);
      const criadoEm = new Date(caixinha.criadoEm);

      // Calcula meses guardados desde a criação, arredondando para baixo
      const mesesGuardados = 6/*Math.max(
        1,
        Math.floor(
          (hoje.getFullYear() - criadoEm.getFullYear()) * 12 +
          (hoje.getMonth() - criadoEm.getMonth())
        )
      );*/

      let saldoSimulado = saldoInicial;
      const historico = [];

      for (let i = 0; i < mesesGuardados; i++) {
        saldoSimulado = saldoSimulado.mul(1 + taxaJurosMensal);
        historico.push({
          mes: i + 1,
          saldo: saldoSimulado.toFixed(2),
        });
      }

      return {
        caixinhaId: caixinha.id,
        nome: caixinha.nome,
        saldoInicial: saldoInicial.toFixed(2),
        historico,
      };
    });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Erro ao simular rendimento das caixinhas:", error);
    return res.status(500).json({ message: "Erro interno" });
  }
};


