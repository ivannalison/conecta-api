import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply } from 'fastify';
import { MongoError, type Db } from 'mongodb';
import { ApiError, errorBody } from './errors.js';
import { healthRoutes } from './routes/health.js';
import { projectRoutes } from './routes/projects.js';
import { siteRoutes } from './routes/site.js';
import { createContentService } from './services/content.service.js';

export interface BuildAppOptions {
  /** Banco já conectado (o server.ts conecta; os testes usam um banco em memória). */
  db: Db;
  /** Verifica se o banco responde (usado pelo /health). */
  checkDatabase: () => Promise<boolean>;
  /** Nível de log do Fastify. Sem valor, os logs ficam desligados (usado nos testes). */
  logLevel?: string;
  /** Sites autorizados a chamar a API (CORS). */
  corsOrigins?: string[];
  /** Limite de requisições por IP, por minuto. */
  rateLimitMax?: number;
}

/**
 * Monta a aplicação: segurança, documentação, rotas e tratamento de erros.
 * Não abre porta nem conecta ao banco; quem faz isso é o server.ts.
 */
export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logLevel ? { level: options.logLevel } : false,
    // O Cloud Run fica atrás de um proxy do Google; isso permite ver o IP real do visitante
    // (necessário para o limite de requisições por IP).
    trustProxy: true,
    // Erros de endereço malformado ou longo demais (antes de achar a rota):
    // também saem no formato padronizado, sem repetir o endereço recebido.
    frameworkErrors: (error, _request, reply: FastifyReply) => {
      reply
        .code(error.statusCode ?? 400)
        .header('Cache-Control', 'no-store')
        .send(errorBody('BAD_REQUEST', 'Requisição inválida.'));
    },
  });

  configurarErros(app);

  // Cabeçalhos de segurança. A política de conteúdo (CSP) fica desligada porque a API
  // só devolve JSON, e ela bloquearia a página do Swagger.
  // A API é chamada por outro endereço (o front-end), por isso "cross-origin".
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(cors, {
    origin: options.corsOrigins ?? [],
    methods: ['GET', 'HEAD', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: options.rateLimitMax ?? 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () =>
      new ApiError(429, 'RATE_LIMITED', 'Muitas requisições. Tente novamente em instantes.'),
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Conecta Tecnologia — API',
        description:
          'API somente leitura do site da Conecta Tecnologia: empresa, serviços e projetos.',
        version: '1',
      },
      tags: [
        { name: 'Saúde', description: 'Estado da API e do banco' },
        { name: 'Conteúdo', description: 'Dados exibidos no site' },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/api/docs' });

  const content = createContentService(options.db);
  await app.register(
    async (api) => {
      await api.register(healthRoutes, { checkDatabase: options.checkDatabase });
      await api.register(siteRoutes, { content });
      await api.register(projectRoutes, { content });
    },
    { prefix: '/api/v1' },
  );

  return app;
}

/**
 * Todo erro sai no formato { error: { code, message } }, sem detalhes internos.
 * Precisa ser configurado ANTES das rotas, para que todas herdem este tratamento.
 */
function configurarErros(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
    reply.header('Cache-Control', 'no-store');

    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send(errorBody(error.code, error.message));
    }
    if (error instanceof MongoError) {
      request.log.error(error, 'Falha ao consultar o banco');
      return reply
        .code(503)
        .send(errorBody('DATABASE_UNAVAILABLE', 'Serviço temporariamente indisponível.'));
    }
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.code(error.statusCode).send(errorBody('BAD_REQUEST', 'Requisição inválida.'));
    }

    request.log.error(error);
    return reply.code(500).send(errorBody('INTERNAL_ERROR', 'Erro interno do servidor.'));
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).header('Cache-Control', 'no-store');
    return errorBody('NOT_FOUND', 'Recurso não encontrado.');
  });
}
