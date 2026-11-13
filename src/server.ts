import { buildApp } from './app.js';
import { connectDatabase, type Database } from './config/database.js';
import { loadEnv } from './config/env.js';

// Lê e valida as variáveis de ambiente (encerra com mensagem clara se algo estiver errado).
const env = loadEnv();

// Conecta ao MongoDB Atlas antes de abrir a porta.
let database: Database;
try {
  database = await connectDatabase({ uri: env.MONGODB_URI, dbName: env.MONGODB_DB_NAME });
} catch (error) {
  // Não mostra a string de conexão; só o tipo do problema.
  const motivo = error instanceof Error ? error.message : String(error);
  console.error(
    'Não foi possível conectar ao MongoDB Atlas. Verifique MONGODB_URI, usuário, senha ' +
      'e se o seu IP está liberado no Atlas (Network Access).\nMotivo: ' + motivo,
  );
  process.exit(1);
}

const app = await buildApp({
  db: database.db,
  checkDatabase: () => database.ping(),
  logLevel: env.LOG_LEVEL,
  corsOrigins: env.CORS_ORIGINS,
  rateLimitMax: env.RATE_LIMIT_MAX,
});

// Desligamento seguro: o Cloud Run envia SIGTERM antes de encerrar o container.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info(`Sinal ${signal} recebido. Encerrando a API...`);
    await app.close();
    await database.close();
    process.exit(0);
  });
}

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Conectado ao banco "${env.MONGODB_DB_NAME}". Documentação em /api/docs`);
} catch (error) {
  app.log.error(error);
  await database.close();
  process.exit(1);
}
