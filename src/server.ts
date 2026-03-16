import 'dotenv/config';
import express from 'express';
import { errorMiddleware } from './middlewares/error.middleware';  

export const application = express();

// Registrando o middleware de tratamento de erros
application.use(express.json());
// application.use('/cards', cardRoutes) // Registrarei em breve
application.use(errorMiddleware);



const PORT = process.env.PORT || 3000;

application.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});