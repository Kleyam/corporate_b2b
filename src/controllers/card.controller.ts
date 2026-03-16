import { Request, Response, NextFunction } from 'express';
import { CardService } from '../services/card.service';
import {
  createCardSchema,
  listCardsQuerySchema,
  cardIdParamSchema,
  updateCardStatusSchema,
} from '../schemas/card.schema';

const cardService = new CardService();

export class CardController {

  // POST /cards
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // Zod valida e transforma o body se inválido, lança ZodError
      const { body } = createCardSchema.parse({ body: req.body });
      const card = await cardService.create(body);
      return res.status(201).json(card);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = listCardsQuerySchema.parse({ query: req.query });
      const cards = await cardService.list(query.status);
      return res.status(200).json(cards);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { params, body } = updateCardStatusSchema.parse({
        params: req.params,
        body: req.body,
      });
      const card = await cardService.updateStatus(params.id, body);
      return res.status(200).json(card);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { params } = cardIdParamSchema.parse({ params: req.params });
      await cardService.delete(params.id);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}