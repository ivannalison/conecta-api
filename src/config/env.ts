import { existsSync } from 'node:fs';
import { z } from 'zod';

// Mensagens de erro do Zod em português.
z.config(z.locales.pt());

/** Converte texto vazio em "não informado" (útil para linhas vazias no .env). */
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  // Banco de dados (obrigatório). Na API, usar o usuário de SOMENTE LEITURA.
  MONGODB_URI: z.preprocess(
    emptyToUndefined,
    z
      .string({ error: 'é obrigatória (string de conexão do MongoDB Atlas)' })
      .regex(/^mongodb(\+srv)?:\/\//, 'deve começar com mongodb:// ou mongodb+srv://'),
  ),
  MONGODB_DB_NAME: z.preprocess(emptyToUndefined, z.string().min(1).default('conecta')),

  // Sites autorizados a chamar a API (CORS), separados por vírgula.
  CORS_ORIGINS: z
    .preprocess(emptyToUndefined, z.string().default('http://localhost:4200'))
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    )
    .pipe(z.array(z.url({ protocol: /^https?$/ })).min(1)),

  // Limite de requisições por IP, por minuto.
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
});

export type Env = z.infer<typeof envSchema>;

/** Valida um conjunto de variáveis. Lança erro se algo estiver inválido. */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  return envSchema.parse(source);
}

/**
 * Lê o arquivo .env (se existir, só no desenvolvimento local) e valida as variáveis.
 * Em produção (Cloud Run) as variáveis vêm do próprio ambiente.
 * Se algo estiver inválido, mostra a lista de problemas e encerra.
 */
export function loadEnv(): Env {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Variáveis de ambiente inválidas:\n' + z.prettifyError(result.error));
    process.exit(1);
  }
  return result.data;
}
