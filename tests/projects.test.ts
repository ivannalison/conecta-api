import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conteudoTeste } from './fixtures.js';
import { criarAmbiente, type Ambiente } from './helpers.js';

describe('GET /api/v1/projects/:slug', () => {
  let ambiente: Ambiente;
  beforeAll(async () => {
    ambiente = await criarAmbiente(conteudoTeste);
  });
  afterAll(() => ambiente.fechar());

  const get = (slug: string) =>
    ambiente.app.inject({ method: 'GET', url: `/api/v1/projects/${slug}` });

  it('traz os detalhes completos de um projeto publicado', async () => {
    const res = await get('real-um');

    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.json()).toMatchObject({
      slug: 'real-um',
      descricaoCompleta: 'Descrição completa do projeto real um',
      problema: 'Problema',
      objetivo: 'Objetivo',
      solucao: 'Solução',
      funcionalidades: ['Função 1'],
      destaque: true,
    });
    expect(res.json()).not.toHaveProperty('publicado');
    expect(res.json()).not.toHaveProperty('_id');
  });

  it('projeto não publicado responde 404 padronizado', async () => {
    const res = await get('real-oculto');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'PROJECT_NOT_FOUND', message: 'Projeto não encontrado.' },
    });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('projeto inexistente responde 404 padronizado', async () => {
    const res = await get('nao-existe');
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('PROJECT_NOT_FOUND');
  });

  it.each(['Maiusculo', 'com_underline', '%24where'])(
    'slug inválido (%s) responde 400',
    async (slug) => {
      const res = await get(slug);
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_SLUG');
    },
  );

  it('slug longo demais é barrado antes de chegar ao banco (414 padronizado)', async () => {
    const res = await get('a'.repeat(101));
    expect(res.statusCode).toBe(414);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });
});
