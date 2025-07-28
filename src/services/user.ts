//TODAS AS CONSULTAS AO BANCO DE DADOS
import bcrypt from "bcrypt";
import { prisma } from "../libs/prisma";
import { RequestHandler, Response } from "express";
import { AlterarSenhaSchema } from "../schemas/user-trocarSenha";
import { ExtendedRequestConta } from "../types/extended-request";

//FUNÇÃO PARA GERAR UM NÚMERO DE CONTA ALEÁTORIO 
function gerarNumeroConta(): string {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}

//FUNÇÃO PARA CRIAR UM USUÁRIO NOVO
export const createUser = async (
    nome: string,
    cpf: string,
    dataNascimento: Date,
    email: string,
    celular: string,
    cep: string,
    rua: string,
    numero: string,
    cidade: string,
    uf: string,
    senhaHash: string) => {

    //RELACIONANDO OS DADOS ACIMA COM O BANCO DE DADOS
    const user = await prisma.usuario.create({
        data: {
            nome,
            cpf,
            dataNascimento,
            email,
            celular,
            senhaHash,
            Endereco: {
                create: {
                    cep,
                    rua,
                    numero,
                    cidade,
                    uf
                },
            },
            //CRIAR UMA CONTA QUANDO O USUÁRIO FOR CRIADO
            Conta: {
                create: {
                    agencia: "0001",     //AGÊNCIA FIXA
                    numero: gerarNumeroConta(),
                    saldo: 0,
                },
            },
        },
        include: {      //ALÉM DOS DADOS DO USUÁRIO IRÁ RETORNAR O ENDERECO E A CONTA
            Endereco: true,
            Conta: true,
        }
    });
    return user;
}

//PROCURAR UM E-MAIL ESPECÍFICO
export const getUserByEmail = async (email: string) => {
    const user = await prisma.usuario.findFirst({
        where: { email }
    });
    return user;
}

//PROCURAR UM CPF ESPECÍFICO
export const getUserByCPF = async (cpf: string) => {
    const user = await prisma.usuario.findFirst({
        where: { cpf }
    });
    return user;
}

//PROCURAR UM CELULAR ESPECÍFICO
export const getUserByCelular = async (celular: string) => {
    const user = await prisma.usuario.findFirst({
        where: { celular }
    });
    return user;
}

//CONSULTAR SALDO DO USUÁRIO
export const saldoUsuario = async (req: any, res: Response) => {
    try {
        const usuarioId = req.user.id;

        const conta = await prisma.conta.findFirst({
            where: { usuarioId },
            select: { saldo: true }
        });

        if (!conta) {
            return res.status(404).json({ error: "Conta não encontrada" });
        }

        return res.json({ saldo: conta.saldo });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao consultar saldo" });
    }
};


//CONSULTAR DADOS DA CONTA USUÁRIO
export const ContaUsuario = async (req: any, res: Response) => {
    try {
        const usuarioId = req.user.id;

        const conta = await prisma.conta.findFirst({
            where: { usuarioId },
            select: { agencia: true, numero: true }
        });

        if (!conta) {
            return res.status(404).json({ error: "Conta não encontrada" });
        }
        return res.json({ agencia: conta.agencia, conta: conta.numero }); //MOSTRAR AGENCIA E CONTA
    } catch (error) {
        return res.status(500).json({ error: "Erro ao consultar agencia e conta" });
    }
}


//CONSULTAR O NOME DO USUÁRIO
export const nomeUsuario = async (req: any, res: Response) => {
    try {
        const usuarioId = req.user.id;      //TROQUEI DE TODAS

        const data = await prisma.usuario.findFirst({
            where: { id: usuarioId },
            select: { nome: true }
        });

        if (!data) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        return res.json({ nome: data.nome });
    } catch (error) {
        console.log("Erro ao consultar nome do usuário:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
}


//TROCAR SENHA
export const alterarSenha = async (req: any, res: Response) => {
    try {
        //VALIDAR COM ZOD
        const parse = AlterarSenhaSchema.safeParse(req.body);

        if (!parse.success) {
            return res.status(400).json({ error: parse.error.errors });
        }

        const { senhaAtual, novaSenha, confirmarSenha } = parse.data;
        const usuarioId = req.user.id; // Supondo que o ID do usuário está no token (req.user.id)

        //BUSCA NO BD
        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            select: { senhaHash: true },
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        //VERIFICA SE SENHA ATUAL ESTÁ CORRETA
        const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senhaHash);
        if (!senhaCorreta) {
            return res.status(401).json({ error: "Senha atual incorreta" });
        }

        //VERIFICA SE SENHAS COINCIDEM
        if (novaSenha !== confirmarSenha) {
            return res.status(400).json({ error: "As senhas não coincidem" });
        }

        //VERIFICA SE TEM 6 CARACTERES
        if (novaSenha.length !== 6) {
            return res.status(400).json({ error: "A nova senha deve ter exatamente 6 caracteres" });
        }

        //GERA NOVO HASH PARA USAR NO BD
        const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

        await prisma.usuario.update({
            where: { id: usuarioId },
            data: { senhaHash: novaSenhaHash },
        });

        return res.json({ ok: true, message: "Senha alterada com sucesso" });

    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};

//CONSULTAR O ENDEREÇO DO USUÁRIO 
export const obterEnderecoUsuario = async (req: any, res: Response) => {
    try {
        const usuarioId = req.user.id;

        const endereco = await prisma.endereco.findUnique({
            where: { userId: usuarioId },
        });

        if (!endereco) {
            return res.status(404).json({ error: "Endereço não encontrado" });
        }

        return res.json(endereco);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao consultar endereço" });
    }
};

//FUNÇÃO PARA ALTERAR O ENDEREÇO
export const atualizarEnderecoUsuario = async (req: any, res: Response) => {
    try {
        const usuarioId = req.user.id;
        const { cep, rua, numero, cidade, uf } = req.body;

        const enderecoExistente = await prisma.endereco.findUnique({
            where: { userId: usuarioId },
        });

        let endereco;

        if (enderecoExistente) {
            // Atualiza endereço existente
            endereco = await prisma.endereco.update({
                where: { userId: usuarioId },
                data: { cep, rua, numero, cidade, uf },
            });
        } else {
            // Cria novo endereço
            endereco = await prisma.endereco.create({
                data: {
                    userId: usuarioId,
                    cep,
                    rua,
                    numero,
                    cidade,
                    uf,
                },
            });
        }

        return res.json(endereco);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar endereço" });
    }
};

//FUNÇÃO PARA ATUALIZAR CARTÃO CASO BOTÃO SEJA APERTADO
export const solicitarCartao = async (req: any, res: Response) => {
    try {
        const usuarioId = req.user.id;

        const usuario = await prisma.usuario.update({
            where: { id: usuarioId },
            data: { cartaoSolicitado: true },
        });

        return res.json({ message: "Cartão solicitado com sucesso." });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao solicitar cartão" });
    }
};

//ROTA PARA VER SE O CARTÃO FOI SOLICITADO
export const getStatusCartao = async (req: any, res: Response) => {
    const usuarioId = req.user.id;
    const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { cartaoSolicitado: true }
    });

    return res.json(usuario);
};


//ATUALIZAR IMAGEM DE PERFIL
export const atualizarImagemPerfil: RequestHandler = async (req, res) => {
    const reqExt = req as ExtendedRequestConta;
    try {
        const usuarioId = reqExt.user?.id;

        if (!req.file) {
            return res.status(400).json({ error: "Arquivo de imagem é obrigatório" });
        }

        // URL da imagem, aqui exemplo que você usa a URL pública do seu servidor + caminho do arquivo salvo
        const imagemUrl = `.168.15.11:3000/uploads/${req.file.filename}`;

        const usuarioAtualizado = await prisma.usuario.update({
            where: { id: usuarioId },
            data: { imagemPerfil: imagemUrl },
        });

        return res.json({ mensagem: "Imagem de perfil atualizada", usuario: usuarioAtualizado });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};



//VER A IMAGEM
export const obterImagem: RequestHandler = async (req, res) => {
    const reqExt = req as ExtendedRequestConta;

    try {
        const usuarioId = reqExt.user?.id;

        if (!usuarioId) {
            return res.status(401).json({ error: "Usuário não autenticado" });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            select: {
                id: true,
                nome: true,
                email: true,
                imagemPerfil: true, // aqui está a URL da imagem
                // selecione outros campos que desejar enviar ao app
            },
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        return res.json({ usuario });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};


//OBTER DADOS DO USUÁRIO PARA MOSTRAR ABAIXO DA IMAGEM
export const obterDadosUsuario = async (req: any, res: Response) => {
    try {
        const usuarioId = req.user.id;

        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            select: {
                nome: true,
                cpf: true,
                dataNascimento: true,
                celular: true,
                email: true
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        return res.json(usuario);
    } catch (error) {
        console.error("Erro ao obter dados do usuário:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};




