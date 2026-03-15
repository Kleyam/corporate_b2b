import "dotenv/config";
import { defineConfig, env } from "prisma/config"; // Importamos o 'env' auxiliar

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"), // A propriedade 'url' fica dentro do bloco 'datasource'
  },
});