import { existsSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { aplicarConteudo } from '../scripts/seed-lib.js';
import type { Database } from '../src/config/database.js';
import { conteudoSchema, type ConteudoEntrada } from '../src/schemas/conteudo.js';
import { conteudoTeste } from './fixtures.js';
import { novoBanco } from './helpers.js';

const clonar = (): ConteudoEntrada => structuredClone(conteudoTeste);

describe('Validação do conteúdo (seed)', () => {
  // O conteudo.json real fica só na máquina local (não vai para o GitHub),
  // então no CI este teste é pulado; o formato é coberto pelas fixtures.
  it.skipIf(!existsSync('scripts/conteudo.json'))('o scripts/conteudo.json do projeto é válido', () => {
    const json = JSON.parse(readFileSync('scripts/conteudo.json', 'utf8'));
    const resultado = conteudoSchema.safeParse(json);
    expect(resultado.error?.issues ?? []).toEqual([]);
  });

  it('recusa slug repetido', () => {
    const conteudo = clonar();
    conteudo.services[1]!.slug = conteudo.services[0]!.slug;
    expect(conteudoSchema.safeParse(conteudo).success).toBe(false);
  });

  it('recusa projeto conceito sem tema', () => {
    const conteudo = clonar();
    delete (conteudo.projects[0] as Record<string, unknown>).tema;
    expect(conteudoSchema.safeParse(conteudo).success).toBe(false);
  });

  it('recusa link sem https', () => {
    const conteudo = clonar();
    conteudo.projects[2]!.links = [{ tipo: 'github', rotulo: 'GitHub', url: 'http://github.com/x' }];
    expect(conteudoSchema.safeParse(conteudo).success).toBe(false);
  });

  it('recusa campo desconhecido (erro de digitação)', () => {
    const conteudo = clonar();
    (conteudo.services[0] as Record<string, unknown>).descricoa = 'erro de digitação';
    expect(conteudoSchema.safeParse(conteudo).success).toBe(false);
  });

  it('recusa texto vazio', () => {
    const conteudo = clonar();
    conteudo.services[0]!.descricao = '   ';
    expect(conteudoSchema.safeParse(conteudo).success).toBe(false);
  });
});

describe('Gravação no banco (seed)', () => {
  let database: Database;
  beforeAll(async () => {
    database = await novoBanco();
  });
  afterAll(async () => {
    await database.db.dropDatabase();
    await database.close();
  });

  it('grava tudo e rodar de novo não duplica nada', async () => {
    const conteudo = conteudoSchema.parse(conteudoTeste);

    const primeira = await aplicarConteudo(database.db, conteudo);
    expect(primeira.services.inseridos).toBe(3);
    expect(primeira.projects.inseridos).toBe(4);

    const segunda = await aplicarConteudo(database.db, conteudo);
    expect(segunda.services).toMatchObject({ inseridos: 0, atualizados: 0 });
    expect(segunda.projects).toMatchObject({ inseridos: 0, atualizados: 0 });

    const alterado = structuredClone(conteudo);
    alterado.services[0]!.descricao = 'Nova descrição';
    const terceira = await aplicarConteudo(database.db, alterado);
    expect(terceira.services).toMatchObject({ inseridos: 0, atualizados: 1 });

    expect(await database.db.collection('services').countDocuments()).toBe(3);
    expect(await database.db.collection('projects').countDocuments()).toBe(4);
    expect(await database.db.collection('company').countDocuments()).toBe(1);
  });

  it('cria o índice único em slug', async () => {
    await expect(
      database.db.collection('projects').insertOne({ slug: 'real-um' }),
    ).rejects.toThrow(/duplicate key/);
  });

  it('só apaga itens fora do JSON com --remover-ausentes', async () => {
    const menor = conteudoSchema.parse({ ...conteudoTeste, services: conteudoTeste.services.slice(0, 1) });

    const semRemover = await aplicarConteudo(database.db, menor);
    expect(semRemover.services.ausentes.sort()).toEqual(['servico-a', 'servico-oculto']);
    expect(await database.db.collection('services').countDocuments()).toBe(3);

    const removendo = await aplicarConteudo(database.db, menor, { removerAusentes: true });
    expect(removendo.services.removidos).toBe(2);
    expect(await database.db.collection('services').countDocuments()).toBe(1);
  });
});
