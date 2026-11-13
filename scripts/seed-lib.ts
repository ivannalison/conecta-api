import { isDeepStrictEqual } from 'node:util';
import type { Collection, Db, Document } from 'mongodb';
import type { Conteudo } from '../src/schemas/conteudo.js';
import { COLLECTIONS } from '../src/services/content.service.js';

export interface RelatorioColecao {
  total: number;
  publicados: number;
  inseridos: number;
  atualizados: number;
  /** Itens que estão no banco mas não estão mais no JSON. */
  ausentes: string[];
  removidos: number;
}

export interface RelatorioSeed {
  services: RelatorioColecao;
  projects: RelatorioColecao;
}

export interface OpcoesSeed {
  /** Apaga do banco os itens que não estão mais no JSON. Padrão: não apaga. */
  removerAusentes?: boolean;
}

/**
 * Grava o conteúdo (já validado) no banco.
 * - Cria o índice único em slug (services e projects): impede duplicados.
 * - Usa o slug como chave: rodar duas vezes não duplica nada, só atualiza.
 */
export async function aplicarConteudo(
  db: Db,
  conteudo: Conteudo,
  opcoes: OpcoesSeed = {},
): Promise<RelatorioSeed> {
  const services = db.collection(COLLECTIONS.services);
  const projects = db.collection(COLLECTIONS.projects);

  await services.createIndex({ slug: 1 }, { unique: true, name: 'slug_unico' });
  await projects.createIndex({ slug: 1 }, { unique: true, name: 'slug_unico' });

  // A empresa é um documento único.
  await db.collection(COLLECTIONS.company).replaceOne({}, conteudo.company, { upsert: true });

  return {
    services: await sincronizar(services, conteudo.services, opcoes),
    projects: await sincronizar(projects, conteudo.projects, opcoes),
  };
}

async function sincronizar(
  colecao: Collection<Document>,
  itens: { slug: string; publicado: boolean }[],
  opcoes: OpcoesSeed,
): Promise<RelatorioColecao> {
  const slugs = itens.map((item) => item.slug);

  // Compara com o que já está no banco: só grava o que é novo ou mudou.
  const existentes = new Map(
    (await colecao.find({ slug: { $in: slugs } }, { projection: { _id: 0 } }).toArray()).map(
      (doc) => [String(doc.slug), doc],
    ),
  );
  const novos = itens.filter((item) => !existentes.has(item.slug));
  const alterados = itens.filter((item) => {
    const atual = existentes.get(item.slug);
    return atual !== undefined && !isDeepStrictEqual(atual, item);
  });

  const gravar = [...novos, ...alterados];
  if (gravar.length > 0) {
    await colecao.bulkWrite(
      gravar.map((item) => ({
        replaceOne: { filter: { slug: item.slug }, replacement: item, upsert: true },
      })),
    );
  }
  const inseridos = novos.length;
  const atualizados = alterados.length;

  const ausentes = (
    await colecao.find({ slug: { $nin: slugs } }, { projection: { _id: 0, slug: 1 } }).toArray()
  ).map((doc) => String(doc.slug));

  let removidos = 0;
  if (opcoes.removerAusentes && ausentes.length > 0) {
    removidos = (await colecao.deleteMany({ slug: { $in: ausentes } })).deletedCount;
  }

  return {
    total: itens.length,
    publicados: itens.filter((item) => item.publicado).length,
    inseridos,
    atualizados,
    ausentes,
    removidos,
  };
}
