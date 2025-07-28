import { Router } from 'express';
import * as pingController from "../controllers/ping"
import * as authController from "../controllers/autenticacao"
import * as userConsultas from "../services/user";
import * as userCaixinha from "../services/userGuardarDim";
import * as userTransacao from "../services/userTransacao";
import * as userChavePix from "../services/userChavePix";
import * as userPagamentoPix from "../services/userPagamentoPix";
import * as userPagamentoQrCode from "../services/userOutrosPagamentos";
import { logout, VerificarToken } from '../libs/jwt';
import { upload } from '../libs/multer';

export const mainRouter = Router();

mainRouter.get("/ping",VerificarToken, pingController.ping);       //TESTE

//ROTA PARA CRIAR UM NOVO USUÁRIO
mainRouter.post("/auth/register", authController.registrar);

//ROTA PARA FAZER LOGIN COM E-MAIL E SENHA EXISTENTE
mainRouter.post("/auth/login", authController.login)

//ROTA PARA VER SE O CPF EXISTE
mainRouter.post("/auth/check-cpf", authController.checkCPF)

//ROTA PARA VER SE O E-MAIL EXISTE
mainRouter.post("/auth/check-email", authController.checkEmail)

//ROTA PARA VER SE O CELULAR EXISTE
mainRouter.post("/auth/check-celular", authController.checkCelular)

//ROTA PARA CONSULTAR O SALDO DO USUÁRIO
mainRouter.get("/usuario/saldo", VerificarToken, userConsultas.saldoUsuario);

//ROTA PARA CONSULTAR A CONTA DO USUÁRIO
mainRouter.get("/usuario/conta", VerificarToken, userConsultas.ContaUsuario);

//INVALIDAR O TOKEN QUANDO COLOCADO NO CABEÇALHO, QUANDO EU APERTAR NO BOTÃO DE SAIR DO APP ELE SAI
mainRouter.post("/auth/logout", VerificarToken, logout);

//ROTA PARA CONSULTA O NOME DO USUÁRIO
mainRouter.get("/usuario/nome", VerificarToken, userConsultas.nomeUsuario);

//ROTA PARA TROCAR SENHA
mainRouter.post("/auth/trocar-senha", VerificarToken, userConsultas.alterarSenha);



//ROTA PARA CADASTRAR UMA CHAVE PIX
//VERIFICA SE UM USUÁRIO TEM CHAVE PIX CADASTRADA
mainRouter.post("/usuario/chave-pix", VerificarToken, userChavePix.userChavePix);
//VER CHAVES PIX CADASTRADA
mainRouter.get("/usuario/consultar-chavepix", VerificarToken, userChavePix.listarChavesPixDoUsuario)
//ROTA PARA DELETAR CHAVE PIX
mainRouter.post("/usuario/delete-chavepix", VerificarToken, userChavePix.deletarChavePix);
//ROTA PARA VER DADOS E COLOCAR NA CHAVE PIX 
mainRouter.get("/usuario/me",VerificarToken,userChavePix.dadosChavePix)



//ROTA PARA PAGAMENTO VIA PIX
//DADOS E VALOR PIX
mainRouter.post("/usuario/dados-pix",VerificarToken, userPagamentoPix.registrarPix);
//VALIDAR CHAVE PIX
mainRouter.post("/usuario/pix-validar", VerificarToken, userPagamentoPix.validaChavePix);



//ROTA TRANSAÇÕES/EXTRATO
mainRouter.get('/transacoes', VerificarToken, userTransacao.listarTransacoesUsuario);



//ROTAS PARA GUARDAR DINHEIRO
// Adicionar dinheiro na caixinha
mainRouter.post("/usuario/caixinha/adicionar", VerificarToken, userCaixinha.adicionarDinheiro);
// Resgatar dinheiro da caixinha
mainRouter.post("/usuario/caixinha/resgatar", VerificarToken, userCaixinha.resgatarDinheiro);
// Listar caixinhas do usuário
mainRouter.get("/usuario/caixinhas", VerificarToken, userCaixinha.listarCaixinhasUsuario);
//CRIAR UMA CAIXINHA 
mainRouter.post("/usuario/caixinha/criar", VerificarToken, userCaixinha.criarCaixinha);
//DELETAR UMA CAIXINHA 
mainRouter.delete("/usuario/caixinha/excluir", VerificarToken, userCaixinha.excluirCaixinha);


//ROTA GERAR UM QRCODE PARA PAGAMENTO
mainRouter.post("/usuario/pix/qrcode", userPagamentoQrCode.gerarPixQRCode);

// Rota para confirmar pagamento via body
mainRouter.post("/usuario/pix/confirmar-pagamento",VerificarToken, userPagamentoQrCode.confirmarPagamentoPix);

// Rota para ler dados do usuário qrcode
mainRouter.get("/usuario/pix/ler-qrcode",VerificarToken, userPagamentoQrCode.lerPixQRCode);

//ROTA PARA GERAR BOLETO
//mainRouter.post("/usuario/boleto-gerar", userPagamentoQrCode.gerarBoleto);

//ROTA PARA GERAR BOLETO EM FORMA DE IMAGEM
mainRouter.post("/usuario/boleto-gerar/image", userPagamentoQrCode.gerarBoletoImagem);

//ROTA PARA PAGAR UM BOLETO
mainRouter.post("/usuario/boleto-pagar",VerificarToken, userPagamentoQrCode.confirmarPagamentoBoleto);

//ROTA PARA LER DADOS DO USUÁRIO BOLETO
mainRouter.get("/usuario/boleto/ler-boleto", userPagamentoQrCode.lerBoletoCodigoBarras);



//ROTA PARA OBTER O ENDEREÇO DO USUÁRIO 
mainRouter.get("/usuario/cartao/endereco", VerificarToken, userConsultas.obterEnderecoUsuario);

//ROTA PARA OBTER O ENDEREÇO DO USUÁRIO 
mainRouter.put("/usuario/cartao/endereco", VerificarToken, userConsultas.atualizarEnderecoUsuario);

//ROTA PARA ATUALIZAR A TELA DE CARTÃO
mainRouter.put("/usuario/solicitar-cartao", VerificarToken, userConsultas.solicitarCartao);

//ROTA PARA VER SE O CARTÃO FOI SOLICITADO
mainRouter.get("/usuario/solicitar-cartao", VerificarToken, userConsultas.getStatusCartao);

//ROTA PARA VER O RENDIMENTO MENSAL
mainRouter.get("/caixinhas/rendimento", VerificarToken, userCaixinha.simularRendimentoCaixinha);



//ROTA PARA ATUALIZAR IMAGEM
mainRouter.post("/usuario/imagem", VerificarToken,upload.single("imagem"), userConsultas.atualizarImagemPerfil);

//ROTA PARA OBTER IMAGEM
mainRouter.get("/usuario/ver-imagem", VerificarToken, userConsultas.obterImagem);

//ROTA PARA OBTER DADOS DO USUÁRIO E MOSTRAR DE BAIXO DA IMAGEM
mainRouter.get("/usuario/obter-dados", VerificarToken, userConsultas.obterDadosUsuario);