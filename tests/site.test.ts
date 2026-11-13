import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conteudoTeste } from './fixtures.js';
import { criarAmbiente, type Ambiente } from './helpers.js';

describe('GET /api/v1/site', () => {
  let ambiente: Ambiente;
  beforeAll(async () => {
    ambiente = await criarAmbiente(conteudoTeste);
  });
  afterAll(() => ambiente.fechar());

  async function getSite() {
    const res = await ambiente.app.inject({ method: 'GET', url: '/api/v1/site' });
    return { res, body: res.json() };
  }

  it('responde 200 com cache curto de 60 segundos', async () => {
    const { res } = await getSite();
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  });

  it('traz os dados da empresa', async () => {
    const { body } = await getSite();
    expect(body.company).toMatchObject({ nome: 'Empresa Teste', email: 'contato@exemplo.com' });
  });

  it('traz só serviços publicados, na ordem de exibição', async () => {
    const { body } = await getSite();
    expect(body.services.map((s: { slug: string }) => s.slug)).toEqual(['servico-a', 'servico-b']);
  });

  it('separa vitrine (conceito) e projetos reais, só publicados e em ordem', async () => {
    const { body } = await getSite();
    expect(body.projects.conceito.map((p: { slug: string }) => p.slug)).toEqual(['conceito-um']);
    expect(body.projects.real.map((p: { slug: string }) => p.slug)).toEqual(['real-um', 'real-dois']);
  });

  it('projetos conceito trazem o tema; projetos reais não', async () => {
    const { body } = await getSite();
    expect(body.projects.conceito[0].tema).toMatchObject({ primaria: '#111111', fundo: '#000000' });
    expect(body.projects.conceito[0].demo).toBe('demo-um');
    expect(body.projects.real[0].tema).toBeNull();
  });

  it('não expõe campos internos nem os detalhes completos do projeto', async () => {
    const { res } = await getSite();
    for (const campo of ['_id', 'publicado', 'ordem', 'descricaoCompleta', 'problema']) {
      expect(res.body).not.toContain(`"${campo}"`);
    }
  });

  it('com o banco vazio, responde com listas vazias e empresa null', async () => {
    const vazio = await criarAmbiente();
    const res = await vazio.app.inject({ method: 'GET', url: '/api/v1/site' });
    await vazio.fechar();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ company: null, services: [], projects: { conceito: [], real: [] } });
  });
});
