import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';

const URI = 'mongodb+srv://usuario:senha@exemplo.mongodb.net/';

describe('Variáveis de ambiente', () => {
  it('exige MONGODB_URI', () => {
    expect(() => parseEnv({})).toThrow();
    expect(() => parseEnv({ MONGODB_URI: '' })).toThrow();
  });

  it('recusa MONGODB_URI em formato errado', () => {
    expect(() => parseEnv({ MONGODB_URI: 'http://exemplo.com' })).toThrow();
  });

  it('aplica os valores padrão', () => {
    const env = parseEnv({ MONGODB_URI: URI });
    expect(env).toMatchObject({
      PORT: 3000,
      MONGODB_DB_NAME: 'conecta',
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_MAX: 100,
    });
  });

  it('lê vários sites no CORS_ORIGINS e remove a barra final', () => {
    const env = parseEnv({
      MONGODB_URI: URI,
      CORS_ORIGINS: 'https://conecta.exemplo.com/, http://localhost:4200',
    });
    expect(env.CORS_ORIGINS).toEqual(['https://conecta.exemplo.com', 'http://localhost:4200']);
  });

  it('recusa CORS_ORIGINS inválido', () => {
    expect(() => parseEnv({ MONGODB_URI: URI, CORS_ORIGINS: 'qualquer-coisa' })).toThrow();
  });
});
