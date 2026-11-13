import { MongoClient, type Db } from 'mongodb';

/**
 * Conexão única com o MongoDB Atlas, reutilizada por toda a API.
 * O driver mantém um pool de conexões; não é preciso abrir uma por requisição.
 */
export interface Database {
  client: MongoClient;
  db: Db;
  /** Responde true se o banco respondeu ao ping dentro do tempo limite. */
  ping(timeoutMs?: number): Promise<boolean>;
  close(): Promise<void>;
}

export interface ConnectOptions {
  uri: string;
  dbName: string;
}

export async function connectDatabase({ uri, dbName }: ConnectOptions): Promise<Database> {
  const client = new MongoClient(uri, {
    appName: 'conecta-api',
    maxPoolSize: 10,
    // Falha rápido se o Atlas não responder (em vez de esperar 30 s, o padrão do driver).
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  const db = client.db(dbName);
  // Confirma de verdade que o banco responde (usuário, senha e acesso de rede corretos).
  await db.command({ ping: 1 });

  return {
    client,
    db,
    async ping(timeoutMs = 2000) {
      try {
        await Promise.race([
          db.command({ ping: 1 }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('tempo esgotado')), timeoutMs).unref(),
          ),
        ]);
        return true;
      } catch {
        return false;
      }
    },
    async close() {
      await client.close();
    },
  };
}
