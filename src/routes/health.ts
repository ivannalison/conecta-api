import type { FastifyInstance } from 'fastify';
import { healthSchema } from '../schemas/responses.js';

export interface HealthRoutesOptions {
  /** Verifica se o banco responde. Retorna true quando está tudo certo. */
  checkDatabase: () => Promise<boolean>;
}

/**
 * GET /api/v1/health
 * Informa se a API e o banco estão no ar. Não expõe segredos nem dados internos.
 * - 200: API e banco funcionando.
 * - 503: API no ar, mas o banco não respondeu.
 */
export async function healthRoutes(
  app: FastifyInstance,
  options: HealthRoutesOptions,
): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        tags: ['Saúde'],
        summary: 'Verifica se a API e o banco estão funcionando',
        response: { 200: healthSchema, 503: healthSchema },
      },
    },
    async (_request, reply) => {
      const databaseOk = await options.checkDatabase();

      reply.code(databaseOk ? 200 : 503).header('Cache-Control', 'no-store');
      return {
        status: databaseOk ? 'ok' : 'degradado',
        database: databaseOk ? 'ok' : 'indisponível',
        timestamp: new Date().toISOString(),
      };
    },
  );
}
