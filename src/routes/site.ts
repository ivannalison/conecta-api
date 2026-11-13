import type { FastifyInstance } from 'fastify';
import { errorSchema, siteSchema } from '../schemas/responses.js';
import type { ContentService } from '../services/content.service.js';

export interface SiteRoutesOptions {
  content: ContentService;
}

/**
 * GET /api/v1/site
 * Tudo o que o site precisa na primeira carga: empresa, serviços publicados,
 * projetos conceito (vitrine) e projetos reais, já na ordem de exibição.
 */
export async function siteRoutes(app: FastifyInstance, options: SiteRoutesOptions): Promise<void> {
  app.get(
    '/site',
    {
      schema: {
        tags: ['Conteúdo'],
        summary: 'Empresa, serviços e projetos publicados',
        response: { 200: siteSchema, 503: errorSchema },
      },
    },
    async (_request, reply) => {
      const site = await options.content.getSite();
      reply.header('Cache-Control', 'public, max-age=60');
      return site;
    },
  );
}
