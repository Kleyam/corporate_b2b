import { z } from 'zod';

// Schema para POST /cards — valida o body da criação
export const createCardSchema = z.object({
  body: z.object({
    // Nome do fornecedor vinculado ao cartão
    providerName: z.string({ required_error: 'O nome do fornecedor é obrigatório' })
      .min(2, 'O nome do fornecedor deve ter pelo menos 2 caracteres'),

    // Limite financeiro — deve ser positivo (regra de negócio)
    maxLimit: z.number({ 
      required_error: 'O limite máximo é obrigatório',
      invalid_type_error: 'O limite deve ser um número' 
    }).positive('O limite deve ser maior que zero'),

    // z.coerce.date() converte a string "2027-01-01" para objeto Date automaticamente
    // .refine() é uma validação customizada — retorna true se válido
    expirationDate: z.coerce.date({ required_error: 'A data de expiração é obrigatória' })
      .refine((date) => date > new Date(), {
        message: 'A data de expiração deve ser uma data futura',
      }),
  }),
});

// Schema para GET /cards — valida o query param ?status=ACTIVE (opcional)
export const listCardsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['ACTIVE', 'BLOCKED', 'REVOKED']).optional(),
  }),
});

// Schema para rotas com :id na URL (DELETE e PATCH)
export const cardIdParamSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'O ID do cartão é obrigatório na URL' })
      .uuid('O ID fornecido não é um UUID válido'),
  }),
});

// Schema para PATCH /cards/:id/status — valida params + body
export const updateCardStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('O ID fornecido não é um UUID válido'),
  }),
  body: z.object({
    // Enum deve bater EXATAMENTE com o enum do Prisma
    status: z.enum(['ACTIVE', 'BLOCKED', 'REVOKED'], {
      required_error: 'O status é obrigatório',
      invalid_type_error: 'Status inválido. Use: ACTIVE, BLOCKED ou REVOKED',
    }),
  }),
});

// Tipos inferidos automaticamente pelo Zod — evita reescrever interfaces manualmente
// Use esses tipos nos Controllers e Services
export type CreateCardInput = z.infer<typeof createCardSchema>['body'];
export type UpdateCardStatusInput = z.infer<typeof updateCardStatusSchema>['body'];