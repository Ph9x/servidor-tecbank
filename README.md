# servidor-tecbank
INSTALAR PASSPORT (BIBLIOTECA QUE AUXILIA O PROCESSO DE AUTENTICAÇÃO)
npm i passport
npm i -D @types/passport

INSTALAR AS BIBLIOTECAS QUE LIDAM COM JWT:
npm install passport-jwt jsonwebtoken
npm install -D @types/passport-jwt @types/jsonwebtoken

INSTALAR BIBLIOTECAS PARA O PROJETO
npm i cors express helmet mailtrap uuid zod
npm i -D @types/cors @types/express @types/node @types/uuid typescript tsx

INSTALANDO O PRISMA
npm i -D prisma
npx prisma init


//ASSIM QUE CRIAR O BANCO DE DADOS E COLOCAR AS INFOS NO ARQUIVO .env
npm i @prisma/client
//COLOCAR AS INFORMAÇÕES CRIADAS NO SCHEMA.PRISMA NO BANCO DE DADOS
npx prisma migrate dev


//INSTALEI PARA CRIPTOGRAFAR AS SENHAS E ARMAZENAR NO MEU BANCO DE DADOS
npm install bcrypt
npm install --save-dev @types/bcrypt        //TYPES

//INSTALEI A BIBLIOTECA DO QR-CODE PARA CRIAR UM QR-CODE PARA PAGAMENTO
npm install qrcode
npm install @types/qrcode                   //TYPES

//INSTALEI 
npm install date-fns


//INSTALEI BIBLIOTECA PARA GERAR BOLETO 
npm install bwip-js

//INSTALEI O MULTER PARA IMAGENS E ARQUIVOS 
npm install multer
npm install @types/multer

