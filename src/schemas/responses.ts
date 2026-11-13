import { LINK_TIPOS, PROJECT_TIPOS } from './conteudo.js';

/**
 * Contratos de resposta (JSON Schema) usados pelo Fastify e pelo Swagger.
 * Além de documentar, o Fastify só envia os campos listados aqui:
 * campos internos (_id, publicado, ordem) nunca saem na resposta.
 */

const textoOuNulo = { type: 'string', nullable: true } as const;
const listaDeTextos = { type: 'array', items: { type: 'string' } } as const;

export const errorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', example: 'PROJECT_NOT_FOUND' },
        message: { type: 'string', example: 'Projeto não encontrado.' },
      },
    },
  },
} as const;

const linkSchema = {
  type: 'object',
  required: ['tipo', 'rotulo', 'url'],
  properties: {
    tipo: { type: 'string', enum: [...LINK_TIPOS] },
    rotulo: { type: 'string' },
    url: { type: 'string', format: 'uri' },
  },
} as const;

const temaSchema = {
  type: 'object',
  nullable: true,
  description: 'Cores do projeto (só projetos conceito).',
  required: ['primaria', 'fundo'],
  properties: {
    primaria: { type: 'string' },
    secundaria: textoOuNulo,
    fundo: { type: 'string' },
    texto: textoOuNulo,
  },
} as const;

const companySchema = {
  type: 'object',
  nullable: true,
  description: 'Dados institucionais. null enquanto não forem cadastrados.',
  required: ['nome'],
  properties: {
    nome: { type: 'string' },
    slogan: textoOuNulo,
    frasePrincipal: textoOuNulo,
    descricao: textoOuNulo,
    apresentacao: textoOuNulo,
    email: textoOuNulo,
    whatsapp: textoOuNulo,
    redesSociais: { type: 'array', items: linkSchema },
    fundador: textoOuNulo,
  },
} as const;

const serviceSchema = {
  type: 'object',
  required: ['slug', 'nome', 'descricao'],
  properties: {
    slug: { type: 'string' },
    nome: { type: 'string' },
    descricao: { type: 'string' },
    descricaoDetalhada: textoOuNulo,
    icone: textoOuNulo,
    topicos: listaDeTextos,
  },
} as const;

const projectSummaryProperties = {
  slug: { type: 'string' },
  nome: { type: 'string' },
  tipo: { type: 'string', enum: [...PROJECT_TIPOS] },
  descricao: { type: 'string' },
  imagem: textoOuNulo,
  tecnologias: listaDeTextos,
  links: { type: 'array', items: linkSchema },
  destaque: { type: 'boolean' },
  tema: temaSchema,
  demo: { ...textoOuNulo, description: 'Qual demonstração animada o front-end exibe.' },
  mensagemWhatsapp: textoOuNulo,
} as const;

const projectSummarySchema = {
  type: 'object',
  required: ['slug', 'nome', 'tipo', 'descricao'],
  properties: projectSummaryProperties,
} as const;

export const projectDetailSchema = {
  type: 'object',
  required: ['slug', 'nome', 'tipo', 'descricao'],
  properties: {
    ...projectSummaryProperties,
    descricaoCompleta: textoOuNulo,
    problema: textoOuNulo,
    objetivo: textoOuNulo,
    solucao: textoOuNulo,
    funcionalidades: listaDeTextos,
  },
} as const;

export const siteSchema = {
  type: 'object',
  required: ['company', 'services', 'projects'],
  properties: {
    company: companySchema,
    services: { type: 'array', items: serviceSchema },
    projects: {
      type: 'object',
      required: ['conceito', 'real'],
      properties: {
        conceito: {
          type: 'array',
          description: 'Vitrine: projetos conceito, na ordem de exibição.',
          items: projectSummarySchema,
        },
        real: {
          type: 'array',
          description: 'Projetos reais (GitHub), na ordem de exibição.',
          items: projectSummarySchema,
        },
      },
    },
  },
} as const;

export const healthSchema = {
  type: 'object',
  required: ['status', 'database', 'timestamp'],
  properties: {
    status: { type: 'string', enum: ['ok', 'degradado'] },
    database: { type: 'string', enum: ['ok', 'indisponível'] },
    timestamp: { type: 'string', format: 'date-time' },
  },
} as const;
