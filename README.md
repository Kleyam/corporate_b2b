# Corporate B2B — Virtual Card Management API

> **Status:** 🚧 Em desenvolvimento ativo
> 
> API REST para gestão de **Cartões Virtuais Corporativos de Uso Único**, desenvolvido como estudo de caso para simular as regras de negócio complexas e os padrões de segurança exigidos pelo setor financeiro e de meios de pagamento.

---

## Contexto do Desafio

O mercado B2B de pagamentos corporativos demanda soluções de controle financeiro granulares. Cartões virtuais de uso único resolvem um problema real: **como emitir, rastrear e revogar instrumentos de pagamento corporativo com segurança e auditabilidade**, sem expor dados sensíveis de cartões físicos.

Esta API simula o core de um sistema de emissão de cartões virtuais corporativos, cobrindo o ciclo completo de vida de um cartão: criação, consulta, bloqueio temporário e revogação definitiva.

---

## Arquitetura

A aplicação segue o padrão de **Layered Architecture** com separação estrita de responsabilidades:

```
┌─────────────────────────────────────────────────────┐
│                   HTTP Request                       │
└─────────────────────┬───────────────────────────────┘
                       │
              ┌────────▼────────┐
              │     Routes      │  ← Mapeamento de URIs e verbos HTTP
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   Controllers   │  ← Validação de input (Zod) + orquestração
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │    Services     │  ← Regras de negócio + lógica de domínio
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  Prisma Client  │  ← Abstração do banco de dados (ORM)
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   PostgreSQL    │  ← Persistência
              └─────────────────┘
                       
              ┌─────────────────┐
              │ Error Middleware │  ← Captura global de erros (AppError + Prisma)
              └─────────────────┘
```

### Por que essa separação?

Cada camada tem **uma única razão para mudar**:

- **Routes** só mudam se a URL mudar
- **Controllers** só mudam se o contrato HTTP mudar
- **Services** só mudam se a regra de negócio mudar
- **Prisma** só muda se o modelo de dados mudar

Isso é o princípio **Single Responsibility** aplicado em nível arquitetural um dos pilares do SOLID.

---

## Stack Tecnológico

| Tecnologia | Versão | Papel na arquitetura |
|---|---|---|
| **Node.js** | 22.x LTS | Runtime JavaScript server-side |
| **TypeScript** | 5.9.x | Tipagem estática, contratos de código |
| **Express** | 4.x | Framework HTTP minimalista |
| **Prisma ORM** | 7.x | Abstração de banco com type-safety |
| **PostgreSQL** | 16 (Alpine) | Banco relacional principal |
| **Zod** | 3.x | Schema validation e parsing de inputs |
| **Docker Compose** | - | Ambiente de banco isolado e reproduzível |

### Decisões técnicas relevantes

**`Decimal` ao invés de `Float` para `maxLimit`**

Sistemas financeiros nunca usam ponto flutuante para valores monetários. `Float` usa representação binária que gera imprecisões (ex: `0.1 + 0.2 = 0.30000000000000004`). `Decimal(10,2)` garante precisão exata obrigatório em qualquer contexto de cartões e transações.

**`AppError` com `statusCode` customizado**

Em vez de lançar erros genéricos do Node, criamos uma classe que carrega o HTTP status junto com a mensagem. O middleware global captura e responde de forma consistente, sem que nenhum controller precise de try/catch individual.

**Enum `CardStatus` no banco**

O status do cartão é um tipo enum gerenciado pelo próprio PostgreSQL não uma string livre. Isso significa que o banco rejeita na camada de dados qualquer valor inválido, independente da aplicação.

---

## Entidade Principal

```typescript
VirtualCard {
  id:             String    // UUID v4 identificador único
  providerName:   String    // Nome do fornecedor vinculado ao cartão
  maxLimit:       Decimal   // Limite máximo (> 0, precisão financeira)
  expirationDate: DateTime  // Data de expiração (deve ser futura)
  cardNumber:     String    // Gerado aleatoriamente no backend (único)
  cvv:            String    // Gerado aleatoriamente no backend
  status:         Enum      // ACTIVE | BLOCKED | REVOKED
  createdAt:      DateTime  // Gerenciado automaticamente
  updatedAt:      DateTime  // Atualizado automaticamente pelo Prisma
}
```

### Regras de negócio

- `maxLimit` deve ser **estritamente maior que zero**
- `expirationDate` deve ser uma **data futura**
- `cardNumber` é gerado no backend nunca aceito como input externo
- `cvv` é gerado no backend nunca aceito como input externo
- Status inicial sempre `ACTIVE`

---

## Endpoints

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/cards` | Cria novo cartão virtual com número e CVV gerados |
| `GET` | `/cards` | Lista cartões (aceita `?status=` como filtro opcional) |
| `PATCH` | `/cards/:id/status` | Altera o status do cartão (BLOCKED, REVOKED) |
| `DELETE` | `/cards/:id` | Remove o cartão permanentemente (hard delete) |

---

## Tratamento de Erros

A API possui um sistema de erros em camadas:

```
AppError (erros controlados)     → statusCode explícito (400, 404, 409...)
PrismaClientKnownRequestError    → mapeamento de códigos Prisma para HTTP
Erros não tratados               → 500 com mensagem genérica + log
```

Códigos Prisma tratados explicitamente:

| Código Prisma | Causa | HTTP |
|---|---|---|
| `P2002` | Violação de constraint unique | `409 Conflict` |
| `P2025` | Registro não encontrado para update/delete | `404 Not Found` |
| `P1000` | Falha de autenticação no banco | `500 Internal Server Error` |

---

## Estrutura do Projeto

```
corporate_b2b/
├── src/
│   ├── controllers/
│   │   └── card.controller.ts     # Validação Zod + chamada ao Service
│   ├── services/
│   │   └── card.service.ts        # Regras de negócio + Prisma
│   ├── routes/
│   │   └── card.routes.ts         # Mapeamento de rotas Express
│   ├── middlewares/
│   │   └── error.middleware.ts    # Handler global de erros
│   ├── schemas/
│   │   └── card.schema.ts         # Contratos Zod de input
│   ├── errors/
│   │   └── AppError.ts            # Classe de erro com statusCode
│   └── server.ts                  # Bootstrap da aplicação
├── prisma/
│   ├── schema.prisma              # Modelo de dados
│   └── migrations/                # Histórico versionado do banco
├── prisma.config.ts               # Configuração do Prisma 7
├── docker-compose.yml             # Ambiente PostgreSQL containerizado
├── .env.example                   # Template de variáveis de ambiente
├── tsconfig.json                  # Configuração do compilador TypeScript
└── package.json
```

---

## 👤 Autor

**Kleyam Guthierrez**  
