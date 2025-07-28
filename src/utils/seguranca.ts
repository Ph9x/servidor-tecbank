//CRIPTOGRAFAR UMA SENHA E ARMAZENAR NO BANCO DE DADOS
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function gerarHashDaSenha(senha: string): Promise<string> {
    return await bcrypt.hash(senha, SALT_ROUNDS);
}

export async function verificarSenha(senhaDigitada: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(senhaDigitada, hash);
}
