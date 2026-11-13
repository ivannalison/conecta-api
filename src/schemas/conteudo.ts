import { z } from 'zod';

/**
 * Formato do conteúdo do site (empresa, serviços e projetos).
 *
 * Usado pelo script de seed para validar os dados ANTES de gravar no banco.
 * A API só importa os tipos daqui (para o TypeScript); ela não valida respostas com Zod.
 */

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const LINK_TIPOS = ['site', 'github', 'api', 'documentacao', 'outro'] as const;
export const PROJECT_TIPOS = ['conceito', 'real'] as const;

const texto = z.string().trim().min(1, 'não pode ficar vazio');
/** Texto ainda não definido: fica null (e não é inventado). */
const textoOpcional = texto.nullable().default(null);
const slug = z
  .string()
  .max(100)
  .regex(SLUG_REGEX, 'use só letras minúsculas, números e hífens (ex.: meu-projeto)');
const cor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'use o formato #RRGGBB');
const ordem = z.number().int().min(0);

export const linkSchema = z.strictObject({
  tipo: z.enum(LINK_TIPOS),
  rotulo: texto,
  url: z.url({ protocol: /^https$/, error: 'deve ser um link https válido' }),
});

export const temaSchema = z.strictObject({
  primaria: cor,
  secundaria: cor.nullable().default(null),
  fundo: cor,
  texto: cor.nullable().default(null),
});

export const companySchema = z.strictObject({
  nome: texto,
  slogan: textoOpcional,
  frasePrincipal: textoOpcional,
  descricao: textoOpcional,
  apresentacao: textoOpcional,
  email: z.email('e-mail inválido').nullable().default(null),
  whatsapp: z
    .string()
    .regex(/^\+\d{12,13}$/, 'use o formato +5592999999999 (código do país + DDD + número)')
    .nullable()
    .default(null),
  redesSociais: z.array(linkSchema).default([]),
  fundador: textoOpcional,
});

export const serviceSchema = z.strictObject({
  slug,
  nome: texto,
  descricao: texto,
  descricaoDetalhada: textoOpcional,
  icone: textoOpcional,
  topicos: z.array(texto).default([]),
  ordem,
  publicado: z.boolean(),
});

const projectBase = {
  slug,
  nome: texto,
  descricao: texto,
  descricaoCompleta: textoOpcional,
  problema: textoOpcional,
  objetivo: textoOpcional,
  solucao: textoOpcional,
  funcionalidades: z.array(texto).default([]),
  imagem: textoOpcional,
  tecnologias: z.array(texto).default([]),
  links: z.array(linkSchema).default([]),
  destaque: z.boolean().default(false),
  mensagemWhatsapp: textoOpcional,
  ordem,
  publicado: z.boolean(),
};

/** Projeto conceito (vitrine): precisa de tema (cores) e da demonstração animada. */
const projectConceitoSchema = z.strictObject({
  ...projectBase,
  tipo: z.literal('conceito'),
  tema: temaSchema,
  demo: texto,
});

/** Projeto real (GitHub): não tem tema nem demonstração. */
const projectRealSchema = z.strictObject({
  ...projectBase,
  tipo: z.literal('real'),
  tema: z.null().default(null),
  demo: z.null().default(null),
});

export const projectSchema = z.discriminatedUnion('tipo', [
  projectConceitoSchema,
  projectRealSchema,
]);

function slugsUnicos(lista: { slug: string }[], colecao: string, ctx: z.RefinementCtx): void {
  const vistos = new Set<string>();
  lista.forEach((item, index) => {
    if (vistos.has(item.slug)) {
      ctx.addIssue({
        code: 'custom',
        path: [colecao, index, 'slug'],
        message: `slug repetido: "${item.slug}"`,
      });
    }
    vistos.add(item.slug);
  });
}

export const conteudoSchema = z
  .strictObject({
    company: companySchema,
    services: z.array(serviceSchema),
    projects: z.array(projectSchema),
  })
  .superRefine((conteudo, ctx) => {
    slugsUnicos(conteudo.services, 'services', ctx);
    slugsUnicos(conteudo.projects, 'projects', ctx);
  });

/** Conteúdo como escrito no JSON (campos opcionais podem faltar). */
export type ConteudoEntrada = z.input<typeof conteudoSchema>;
/** Conteúdo validado, como fica gravado no banco. */
export type Conteudo = z.output<typeof conteudoSchema>;
export type CompanyDoc = Conteudo['company'];
export type ServiceDoc = Conteudo['services'][number];
export type ProjectDoc = Conteudo['projects'][number];
