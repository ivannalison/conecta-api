import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conteudoTeste } from './fixtures.js';
import { criarAmbiente, type Ambiente } from './helpers.js';

describe('Segurança e padrões da API', () => {
  let ambiente: Ambiente;
  beforeAll(async () => {
    ambiente = await criarAmbiente(conteudoTeste);
  });
  afterAll(() => ambiente.fechar());

  it('rota inexistente responde 404 no formato padronizado', async () => {
    const res = await ambiente.app.inject({ method: 'GET', url: '/api/v1/nao-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' } });
  });

  it('só aceita leitura: POST responde 404', async () => {
    const res = await ambiente.app.inject({ method: 'POST', url: '/api/v1/site', payload: {} });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('CORS libera o front-end autorizado', async () => {
    const res = await ambiente.app.inject({
      method: 'GET',
      url: '/api/v1/site',
      headers: { origin: 'http://localhost:4200' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  it('CORS não libera sites não autorizados', async () => {
    const res = await ambiente.app.inject({
      method: 'GET',
      url: '/api/v1/site',
      headers: { origin: 'https://site-estranho.com' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('envia cabeçalhos de segurança', async () => {
    const res = await ambiente.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('publica a documentação Swagger com os três endpoints', async () => {
    const res = await ambiente.app.inject({ method: 'GET', url: '/api/docs/json' });
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json().paths).sort()).toEqual([
      '/api/v1/health',
      '/api/v1/projects/{slug}',
      '/api/v1/site',
    ]);
  });

  it('limita requisições por IP (429 padronizado)', async () => {
    const limitado = await criarAmbiente(undefined, { rateLimitMax: 2 });
    const pedir = () => limitado.app.inject({ method: 'GET', url: '/api/v1/health' });
    await pedir();
    await pedir();
    const res = await pedir();
    await limitado.fechar();

    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('RATE_LIMITED');
  });

  it('falha no banco responde 503 sem detalhes internos', async () => {
    const quebrado = await criarAmbiente(conteudoTeste);
    await quebrado.database.close();
    const res = await quebrado.app.inject({ method: 'GET', url: '/api/v1/site' });
    await quebrado.fechar();

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'Serviço temporariamente indisponível.' },
    });
  });
});
