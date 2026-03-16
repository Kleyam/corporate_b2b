import { PrismaClient } from '@prisma/client';
import { AppError } from '../errors/AppError';
import { CreateCardInput, UpdateCardStatusInput } from '../schemas/card.schema';

const prisma = new PrismaClient();

// Gera um número de cartão fictício no formato: 4 grupos de 4 dígitos
// Exemplo: 1234 5678 9012 3456
const generateCardNumber = (): string => {
  return Array.from({ length: 4 }, () =>
    Math.floor(1000 + Math.random() * 9000)
  ).join(' ');
};

const generateCVV = (): string => {
  return Math.floor(100 + Math.random() * 900).toString();
};

export class CardService {

  async create(data: CreateCardInput) {
    if (data.maxLimit <= 0) {
      throw new AppError(400, 'O limite máximo deve ser maior que zero');
    }

    if (data.expirationDate <= new Date()) {
      throw new AppError(400, 'A data de expiração deve ser uma data futura');
    }

    const card = await prisma.virtualCard.create({
      data: {
        providerName: data.providerName,
        maxLimit:     data.maxLimit,
        expirationDate: data.expirationDate,
        cardNumber: generateCardNumber(),
        cvv:        generateCVV(),
        status: 'ACTIVE',
      },
    });

    return card;
  }

  async list(status?: 'ACTIVE' | 'BLOCKED' | 'REVOKED') {
    const cards = await prisma.virtualCard.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return cards;
  }

  async updateStatus(id: string, data: UpdateCardStatusInput) {
    const card = await prisma.virtualCard.findUnique({ where: { id } });

    if (!card) {
      throw new AppError(404, 'Cartão não encontrado');
    }

    // Regra de negócio: cartão REVOGADO não pode ser alterado
    if (card.status === 'REVOKED') {
      throw new AppError(400, 'Um cartão revogado não pode ter seu status alterado');
    }

    const updated = await prisma.virtualCard.update({
      where: { id },
      data: { status: data.status },
    });

    return updated;
  }

  async delete(id: string) {
    const card = await prisma.virtualCard.findUnique({ where: { id } });

    if (!card) {
      throw new AppError(404, 'Cartão não encontrado');
    }

    await prisma.virtualCard.delete({ where: { id } });
  }
}