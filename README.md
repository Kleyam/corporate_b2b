# 💳 Corporate B2B Virtual Card Management API

<p align="left">
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Prisma-7.x-2D3748?style=flat-square&logo=prisma&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Zod-3.x-3068B7?style=flat-square"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white"/>
  <img src="https://img.shields.io/badge/status-concluído-brightgreen?style=flat-square"/>
</p>

> API REST para gestão do ciclo de vida completo de **Cartões Virtuais Corporativos de Uso Único (B2B Single-Use Virtual Cards)**, desenvolvida como um estudo de caso focado na arquitetura de serviços financeiros e no ciclo de vida de cartões PJ.
---

## Contexto e Problema de Negócio

O mercado de pagamentos B2B enfrenta um desafio crítico de controle e rastreabilidade: como emitir instrumentos de pagamento corporativo com **segurança, auditabilidade e ciclo de vida controlado**, sem expor dados de cartões físicos ou contas bancárias principais?

Cartões virtuais de uso único resolvem isso diretamente:

- **Isolamento de risco:** cada cartão tem limite próprio, vinculado a um fornecedor específico
- **Rastreabilidade:** todo estado do cartão é auditável (ACTIVE → BLOCKED → REVOKED)
- **Controle granular:** revogação imediata sem impacto em outros instrumentos de pagamento

Esta API implementa o **core de emissão e gestão** desses instrumentos, cobrindo o ciclo completo de vida de um cartão virtual corporativo.

---

## Arquitetura

A aplicação segue **Layered Architecture** com separação estrita de responsabilidades cada camada tem uma única razão para mudar (Single Responsibility Principle).

```
┌──────────────────────────────────────────────────────────────────┐
│                        HTTP Request                              │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Zod Middleware     │  Validação de schema antes
                    │   (schema parse)     │  de tocar no Controller
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │      Routes         │  Mapeamento de URIs
                    │  card.routes.ts     │  e verbos HTTP
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Controllers      │  Orquestração HTTP
                    │ card.controller.ts  │  req → service → res
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │      Services       │  Regras de negócio
                    │  card.service.ts    │  Lógica de domínio
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Prisma Client     │  Abstração ORM
                    │   (type-safe)       │  Query builder
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    PostgreSQL 16     │  Persistência
                    │   (Docker Alpine)    │  com tipos nativos
                    └─────────────────────┘

                    ┌─────────────────────┐
                    │  Error Middleware    │  Camada transversal
                    │  AppError + Prisma  │  Captura global de erros
                    └─────────────────────┘
```

### Por que essa separação importa?

| Camada | Responsabilidade única | Muda quando... |
|---|---|---|
| Routes | Mapear URI + verbo HTTP | A URL mudar |
| Controller | Orquestrar request/response | O contrato HTTP mudar |
| Service | Regras de negócio | A regra de negócio mudar |
| Prisma | Persistência | O modelo de dados mudar |

Isso garante que uma mudança em uma camada **não propague para as outras** princípio fundamental de manutenibilidade em sistemas financeiros.

---

## Stack Tecnológico e Decisões de Design

| Tecnologia | Versão | Decisão arquitetural |
|---|---|---|
| **Node.js** | 22.x LTS | Runtime com suporte nativo a ES2022+, performance madura |
| **TypeScript** | 5.9.x | Contratos de código explícitos crítico em domínio financeiro |
| **Express** | 4.x | Minimalismo intencional sem opinião sobre arquitetura |
| **Prisma ORM** | 7.x | Type-safety end-to-end entre schema e código |
| **PostgreSQL** | 16 Alpine | ACID compliance, suporte nativo a Enum e Decimal |
| **Zod** | 3.x | Parse, não apenas validação transforma e tipifica inputs |
| **Docker Compose** | - | Ambiente reproduzível, sem dependência de setup local |

### Decisões técnicas que merecem destaque

**`Decimal(10,2)` ao invés de `Float` para `maxLimit`**

Sistemas financeiros nunca usam ponto flutuante para valores monetários. `Float` usa representação binária que gera imprecisões:
```
0.1 + 0.2 = 0.30000000000000004  ← Float
0.1 + 0.2 = 0.30                 ← Decimal
```
`Decimal(10,2)` garante precisão exata em cartões corporativos, 1 centavo tem impacto jurídico e contábil.

**`Enum CardStatus` gerenciado pelo PostgreSQL**

O status do cartão não é uma string livre é um tipo nativo do banco. O PostgreSQL rejeita qualquer valor fora de `{ACTIVE, BLOCKED, REVOKED}` diretamente na camada de dados, independente da aplicação. Defense in depth.

**`AppError` com `statusCode` explícito**

Em vez de lançar `Error` genérico e adivinhar o status HTTP no controller, cada erro de domínio carrega seu código HTTP. O middleware global captura e responde de forma consistente em toda a aplicação zero `try/catch` espalhado.

**Zod com `.parse()` ao invés de `.safeParse()`**

Optamos por `parse()` que lança `ZodError` automaticamente em caso de falha. O error middleware global captura e formata isso elimina boilerplate de verificação de erro em cada controller.

---

## Modelo de Domínio

```typescript
VirtualCard {
  id:             UUID        // Identificador único gerado pelo banco
  providerName:   String      // Fornecedor vinculado ao cartão
  maxLimit:       Decimal     // Limite máximo (precisão financeira exata)
  expirationDate: DateTime    // Data de expiração (validada como futura)
  cardNumber:     String      // Gerado no backend único no sistema
  cvv:            String      // Gerado no backend nunca exposto em listagens
  status:         CardStatus  // ACTIVE | BLOCKED | REVOKED
  createdAt:      DateTime    // Imutável gerado na criação
  updatedAt:      DateTime    // Atualizado automaticamente pelo Prisma
}
```

### Ciclo de vida do status

```
                    ┌─────────┐
          criação   │ ACTIVE  │
         ─────────► │         │
                    └────┬────┘
                         │
              ┌──────────┴──────────┐
              │ PATCH /status       │ PATCH /status
              ▼                     ▼
         ┌─────────┐          ┌─────────┐
         │ BLOCKED │          │ REVOKED │
         │         │          │         │
         └────┬────┘          └─────────┘
              │                    ▲
              │ PATCH /status      │ PATCH /status
              └────────────────────┘

    REVOKED é estado terminal — nenhuma transição é permitida a partir dele
```

---

## Endpoints

### `POST /cards` Criar cartão

**Request:**
```json
{
  "providerName": "Amazon AWS",
  "maxLimit": 5000.00,
  "expirationDate": "2027-12-31"
}
```

**Response `201 Created`:**
```json
{
  "id": "e3d6f2a1-9b4c-4f8e-a123-1c2d3e4f5a6b",
  "providerName": "Amazon AWS",
  "maxLimit": "5000.00",
  "expirationDate": "2027-12-31T00:00:00.000Z",
  "cardNumber": "4521 8834 9102 7743",
  "cvv": "847",
  "status": "ACTIVE",
  "createdAt": "2026-03-15T02:14:33.000Z",
  "updatedAt": "2026-03-15T02:14:33.000Z"
}
```

---

### `GET /cards` Listar cartões

**Request:** `GET /cards` ou `GET /cards?status=ACTIVE`

**Response `200 OK`:**
```json
[
  {
    "id": "e3d6f2a1-9b4c-4f8e-a123-1c2d3e4f5a6b",
    "providerName": "Amazon AWS",
    "maxLimit": "5000.00",
    "expirationDate": "2027-12-31T00:00:00.000Z",
    "cardNumber": "4521 8834 9102 7743",
    "cvv": "847",
    "status": "ACTIVE",
    "createdAt": "2026-03-15T02:14:33.000Z",
    "updatedAt": "2026-03-15T02:14:33.000Z"
  }
]
```

---

### `PATCH /cards/:id/status` Alterar status

**Request:**
```json
{
  "status": "BLOCKED"
}
```

**Response `200 OK`:**
```json
{
  "id": "e3d6f2a1-9b4c-4f8e-a123-1c2d3e4f5a6b",
  "providerName": "Amazon AWS",
  "maxLimit": "5000.00",
  "expirationDate": "2027-12-31T00:00:00.000Z",
  "cardNumber": "4521 8834 9102 7743",
  "cvv": "847",
  "status": "BLOCKED",
  "createdAt": "2026-03-15T02:14:33.000Z",
  "updatedAt": "2026-03-15T02:17:10.000Z"
}
```

---

### `DELETE /cards/:id` Remover cartão

**Response `204 No Content`** sem corpo de resposta.

---

## Tratamento de Erros

Sistema de erros em camadas com respostas consistentes em toda a API:

```
ZodError (input inválido)              → 400 + fieldErrors detalhados
AppError (regra de negócio violada)    → statusCode explícito (400, 404...)
PrismaClientKnownRequestError          → mapeamento de códigos para HTTP
Erros não tratados                     → 500 + mensagem genérica + log
```

**Exemplo — validação Zod:**
```json
{
  "message": "Dados inválidos",
  "errors": {
    "maxLimit": ["O limite deve ser maior que zero"],
    "expirationDate": ["A data de expiração deve ser uma data futura"]
  }
}
```

**Exemplo — regra de negócio:**
```json
{
  "message": "Um cartão revogado não pode ter seu status alterado"
}
```

**Códigos Prisma tratados explicitamente:**

| Código | Causa | HTTP Status |
|---|---|---|
| `P2002` | Violação de constraint `@unique` | `409 Conflict` |
| `P2025` | Registro não encontrado para update/delete | `404 Not Found` |
| `P1000` | Falha de autenticação no banco | `500 Internal Server Error` |

---

## Estrutura do Projeto

```
corporate_b2b/
├── src/
│   ├── controllers/
│   │   └── card.controller.ts     # Orquestração HTTP parse Zod + chama Service
│   ├── services/
│   │   └── card.service.ts        # Regras de negócio + geração de cardNumber/CVV
│   ├── routes/
│   │   └── card.routes.ts         # Mapeamento de verbos HTTP + URLs
│   ├── middlewares/
│   │   └── error.middleware.ts    # Handler global ZodError, AppError, Prisma, 500
│   ├── schemas/
│   │   └── card.schema.ts         # Contratos Zod de input + tipos inferidos
│   ├── errors/
│   │   └── AppError.ts            # Classe de erro com statusCode + captureStackTrace
│   └── server.ts                  # Bootstrap Express, middlewares, listen
├── prisma/
│   ├── schema.prisma              # Modelo de domínio + Enum CardStatus
│   └── migrations/                # Histórico versionado do banco (git do banco)
├── prisma.config.ts               # Config Prisma 7 datasource + schema path
├── docker-compose.yml             # PostgreSQL 16 Alpine containerizado
├── .env.example                   # Template de variáveis (sem valores sensíveis)
├── tsconfig.json                  # Target ES2022, strict mode, rootDir src/
└── package.json
```

---

## Regras de Negócio Implementadas

- `maxLimit` deve ser **estritamente maior que zero** validado no Zod e no Service
- `expirationDate` deve ser **data futura** validado com `z.coerce.date().refine()`
- `cardNumber` e `cvv` são **gerados no backend** nunca aceitos como input externo
- Status inicial sempre `ACTIVE` — definido como default no schema Prisma
- Cartão com status `REVOKED` é **estado terminal** nenhuma alteração permitida
- `cardNumber` possui constraint `@unique` tratado com `409 Conflict`

---

## Autor

**Kleyam Guthierrez**
- GitHub: [@Kleyam](https://github.com/Kleyam)
- Projeto: [corporate_b2b](https://github.com/Kleyam/corporate_b2b)
