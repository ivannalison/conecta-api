import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors.js';
import { SLUG_REGEX } from '../schemas/conteudo.js';
import { errorSchema, projectDetailSchema } from '../schemas/responses.js';
import type { ContentService } from '../services/content.service.js';

export interface ProjectRoutesOptions {
  content: ContentService;
}

const paramsSchema = z.object({
  slug: z.string().max(100).regex(SLUG_REGEX),
});

/**
 * GET /api/v1/projects/:slug
 * Detalhes completos de um projeto publicado.
 * Projeto inexistente ou não publicado: 404 padronizado.
 */
export async function projectRoutes(
  app: FastifyInstance,
  options: ProjectRoutesOptions,
): Promise<void> {
  app.get(
    '/projects/:slug',
    {
      schema: {
        tags: ['Conteúdo'],
        summary: 'Detalhes de um projeto publicado',
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string', description: 'Identificador do projeto (ex.: api-gestao-escolar)' },
          },
        },
        response: { 200: projectDetailSchema, 400: errorSchema, 404: errorSchema, 503: errorSchema },
      },
    },
    async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      if (!params.success) {
        throw new ApiError(
          400,
          'INVALID_SLUG',
          'Slug inválido. Use só letras minúsculas, números e hífens.',
        );
      }

      const project = await options.content.getProject(params.data.slug);
      if (!project) {
        throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Projeto não encontrado.');
      }

      reply.header('Cache-Control', 'public, max-age=60');
      return project;
    },
  );
}
