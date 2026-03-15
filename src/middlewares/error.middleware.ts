import { AppError } from "../errors/AppError";
import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (
  err: Error, 
  req: Request,
  res: Response,
  _next: NextFunction
) => {  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Tratamento específico para erros conhecidos do Prisma
    switch (err.code) {
      
      case 'P2002':
        return res.status(409).json({
          message: 'Este registro já está cadastrado no sistema.',
        });

      case 'P1000':
        return res.status(500).json({
          message: 'Erro interno: Falha ao conectar com o banco de dados.',
        });

      case 'P2025':
        return res.status(404).json({
          message: 'O registro que você tentou atualizar ou deletar não foi encontrado.',
        });

    }
  }

  console.error(err);
  // Erro genérico para outros tipos de erros
  return res.status(500).json({
    message: 'Ops! Algo deu errado do nosso lado. Nossa equipe já foi notificada',
  });
}; 