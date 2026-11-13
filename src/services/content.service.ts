import type { Db } from 'mongodb';
import type { CompanyDoc, ProjectDoc, ServiceDoc } from '../schemas/conteudo.js';

/** Nomes das três coleções do banco. */
export const COLLECTIONS = {
  company: 'company',
  services: 'services',
  projects: 'projects',
} as const;

// Campos que nunca saem do banco para a API.
const CAMPOS_INTERNOS = { _id: 0, publicado: 0, ordem: 0 } as const;
// Campos que só aparecem nos detalhes do projeto (GET /projects/:slug).
const CAMPOS_DE_DETALHE = {
  descricaoCompleta: 0,
  problema: 0,
  objetivo: 0,
  solucao: 0,
  funcionalidades: 0,
} as const;

type ProjectSummary = Omit<
  ProjectDoc,
  'publicado' | 'ordem' | keyof typeof CAMPOS_DE_DETALHE
>;

/**
 * Consultas às três coleções. Sempre filtra por publicado: true,
 * para que conteúdo não publicado nunca chegue ao visitante.
 */
export function createContentService(db: Db) {
  const company = db.collection<CompanyDoc>(COLLECTIONS.company);
  const services = db.collection<ServiceDoc>(COLLECTIONS.services);
  const projects = db.collection<ProjectDoc>(COLLECTIONS.projects);

  return {
    async getSite() {
      const [empresa, servicos, projetos] = await Promise.all([
        company.findOne({}, { projection: { _id: 0 } }),
        services
          .find({ publicado: true })
          .sort({ ordem: 1, slug: 1 })
          .project<Omit<ServiceDoc, 'publicado' | 'ordem'>>(CAMPOS_INTERNOS)
          .toArray(),
        projects
          .find({ publicado: true })
          .sort({ ordem: 1, slug: 1 })
          .project<ProjectSummary>({ ...CAMPOS_INTERNOS, ...CAMPOS_DE_DETALHE })
          .toArray(),
      ]);

      return {
        company: empresa,
        services: servicos,
        projects: {
          conceito: projetos.filter((p) => p.tipo === 'conceito'),
          real: projetos.filter((p) => p.tipo === 'real'),
        },
      };
    },

    /** Detalhes de um projeto publicado, ou null se não existir / não estiver publicado. */
    async getProject(slug: string) {
      return projects.findOne({ slug, publicado: true }, { projection: CAMPOS_INTERNOS });
    },
  };
}

export type ContentService = ReturnType<typeof createContentService>;
