import express, { urlencoded } from "express";
import helmet from "helmet";
import cors from "cors";
import { mainRouter } from "./routes/main";

const server = express();
server.use(helmet());
server.use(cors());
server.use(urlencoded({ extended: true }));
server.use(express.json());

// Serve arquivos estáticos da pasta "uploads"
server.use('/uploads', express.static('uploads'));

server.use(mainRouter);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}/`);
});