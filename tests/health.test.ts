import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarAmbiente, type Ambiente } from './helpers.js';

describe('GET /api/v1/health', () => {
  let ambiente: Ambiente;
  beforeAll(async () => {
    ambiente = await criarAmbiente();
  });
  afterAll(() => ambiente.fechar());

  it('responde 200 quando a API e o banco estão funcionando', async () => {
    const res = await ambiente.app.inject({ method: 'GET', url: '/api/v1/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', database: 'ok' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('responde 503 quando o banco não responde', async () => {
    const outro = await criarAmbiente(undefined, { checkDatabase: async () => false });
    const res = await outro.app.inject({ method: 'GET', url: '/api/v1/health' });
    await outro.fechar();

    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ status: 'degradado', database: 'indisponível' });
  });

  it('não expõe segredos nem dados internos', async () => {
    const res = await ambiente.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(Object.keys(res.json()).sort()).toEqual(['database', 'status', 'timestamp']);
  });
});
