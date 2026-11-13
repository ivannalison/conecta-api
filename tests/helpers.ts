import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { inject } from 'vitest';
import { aplicarConteudo } from '../scripts/seed-lib.js';
import { buildApp, type BuildAppOptions } from '../src/app.js';
import { connectDatabase, type Database } from '../src/config/database.js';
import { conteudoSchema, type ConteudoEntrada } from '../src/schemas/conteudo.js';

export interface Ambiente {
  app: FastifyInstance;
  database: Database;
  fechar(): Promise<void>;
}

/** Banco novo e isolado no MongoDB em memória. */
export async function novoBanco(): Promise<Database> {
  return connectDatabase({ uri: inject('mongoUri'), dbName: `teste_${randomUUID().slice(0, 8)}` });
}

/**
 * Cria um banco isolado, carrega o conteúdo (pelo mesmo caminho do seed)
 * e monta a API apontando para ele.
 */
export async function criarAmbiente(
  conteudo?: ConteudoEntrada,
  opcoes: Partial<BuildAppOptions> = {},
): Promise<Ambiente> {
  const database = await novoBanco();
  if (conteudo) {
    await aplicarConteudo(database.db, conteudoSchema.parse(conteudo));
  }

  const app = await buildApp({
    db: database.db,
    checkDatabase: () => database.ping(),
    corsOrigins: ['http://localhost:4200'],
    rateLimitMax: 1000,
    ...opcoes,
  });

  return {
    app,
    database,
    async fechar() {
      await app.close();
      try {
        await database.db.dropDatabase();
      } catch {
        // O banco pode já ter sido fechado de propósito pelo teste.
      }
      await database.close();
    },
  };
}
