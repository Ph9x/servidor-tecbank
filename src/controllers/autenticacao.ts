import { RequestHandler } from "express-serve-static-core";
import { RegisterSchema } from "../schemas/user-registro";
import { EnderecoSchema } from "../schemas/user-endereco";
import { createUser, getUserByCelular, getUserByCPF, getUserByEmail } from "../services/user";
import { LoginSchema } from "../schemas/user-login";
import bcrypt from "bcryptjs";
import { gerarHashDaSenha } from "../utils/seguranca";
import { criarSessao } from "../libs/jwt";




//CRIAR UM NOVO USUARIO
export const registrar: RequestHandler = async (req, res) => {
    //VALIDAR OS DADOS RECEBIDOS
    const dataUser = RegisterSchema.safeParse(req.body);
    const dataEndereco = EnderecoSchema.safeParse(req.body);
    if (!dataUser.success || !dataEndereco.success) {        //VERIFICA SE ALGUM DOS DOIS FALHOU
        res.json({          //MOSTRA OS ERROS 
            errorUser: dataUser.success ? null : dataUser.error.flatten().fieldErrors,
            errorEndereco: dataEndereco.success ? null : dataEndereco.error.flatten().fieldErrors,
        });

        return;         //INTERROMPE A EXECUÇÃO
    }

    //VERIFICAR SE OS DADOS ÚNICOS JÁ EXISTEM
    //EMAIL
    const emailExistente = await getUserByEmail(dataUser.data.email);
    if (emailExistente) {
        res.json({ error: "Já existe usuário com este e-mail." });
        return;
    }
    //CPF
    const cpfExistente = await getUserByCPF(dataUser.data.email);
    if (cpfExistente) {
        res.json({ error: "Já existe usuário com este CPF." });
        return;
    }
    //CELULAR
    const celularExistente = await getUserByCelular(dataUser.data.email);
    if (celularExistente) {
        res.json({ error: "Já existe usuário com este celular." });
        return;
    }

    const senhaHash = await gerarHashDaSenha(dataUser.data.senhaHash);  //CRIPTOGRAFAR SENHA

    //CRIAR UM NOVO USUÁRIO
    const newUser = await createUser(
        dataUser.data.nome,
        dataUser.data.cpf,
        dataUser.data.dataNascimento,
        dataUser.data.email,
        dataUser.data.celular,
        dataEndereco.data.cep,
        dataEndereco.data.rua,
        dataEndereco.data.numero,
        dataEndereco.data.cidade,
        dataEndereco.data.uf,
        senhaHash       //SENHA SERÁ CRIPTOGRAFADA E ENVIADA AO MEU BANCO DE DADOS
    );

    //RETORNAR OS DADOS DO USUÁRIO RECÉM-CRIADO
    res.status(201).json({ user: newUser, userEndereco: dataEndereco });

}


//FAZER O LOGIN COM UM CPF E SENHA EXISTENTE
export const login: RequestHandler = async (req, res) => {
    const data = LoginSchema.safeParse(req.body);
    if (!data.success) {        //VERIFICA SE OCORREU ALGUM ERRO
        res.json({ error: data.error.flatten().fieldErrors });
        return;
    }

    //VERIFICAR SE O CPF EXISTE
    const { cpf, senha } = data.data

    //BUSCAR USER PELO CPF
    const user = await getUserByCPF(data.data.cpf);
    if (!user) {        //CASO NÃO ACHE O CPF
        res.json({ error: "Usuário não encontrado" });
        return;
    }

    //Comparar a senha fornecida com a senha criptografada no banco de dados
    const senhaCorreta = await bcrypt.compare(senha, user.senhaHash);
    if (!senhaCorreta) {  //CASO A SENHA ESTEJA INCORRETA
        res.json({ error: "Senha Incorreta" });
        return;
    }

    const tokenJwt = await criarSessao(user.id);
    res.json({
        message: "Tudo certo",
        token: tokenJwt,        //COLOCA O TOKEN NO BANCO DE DADOS
    })
}

//VERIFICAR SE UM CPF JÁ EXISTE
export const checkCPF: RequestHandler = async (req, res) => {
    const { cpf } = req.body;

    if (!cpf) {
        return res.status(400).json({ error: "CPF é obrigatório" });
    }


    const usuario = await getUserByCPF(cpf);
    if (usuario) {
        return res.status(200).json({ exists: true, message: "CPF já cadastrado." });
    }
    return res.status(200).json({ exists: false });   //CASO NÃO ESTEJA CADASTRADO

}

//VERIFICAR SE UM E-MAIL JÁ EXISTE
export const checkEmail: RequestHandler = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: "CPF é obrigatório" });
    }

    const usuario = await getUserByEmail(email);
    if (usuario) {
        return res.status(200).json({ exists: true, message: "E-mail já cadastrado" });
    }
    return res.status(200).json({ exists: false });
}

//VERIFICAR SE UM CELULAR JÁ EXISTE
export const checkCelular: RequestHandler = async (req, res) => {
    const { celular } = req.body;
    if (!celular) {
        return res.status(400).json({ error: "Celular é obrigatório" });
    }

    const usuario = await getUserByCelular(celular);
    if (usuario) {
        return res.status(200).json({ exists: true, message: "Celular já cadastrado" });
    }
    return res.status(200).json({ exists: false });
}

