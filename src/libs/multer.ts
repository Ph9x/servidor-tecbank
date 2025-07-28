import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads"); // pasta para armazenar arquivos (crie essa pasta)
    },
    filename: (req, file, cb) => {
        // cria nome único para o arquivo
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    },
});

export const upload = multer({ storage });