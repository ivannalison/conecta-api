/**
 * Carga do conteúdo do site no MongoDB Atlas.
 *
 *   npm run seed:check   valida o conteudo.json, sem conectar e sem gravar nada
 *   npm run seed         valida e grava (usa o .env.seed, usuário de escrita)
 *   npm run seed -- --remover-ausentes   também apaga do banco o que saiu do JSON
 */
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { MongoClient } from 'mongodb';
import { z } from 'zod';
import { conteudoSchema, type Conteudo } from '../src/schemas/conteudo.js';
import { aplicarConteudo, type RelatorioColecao } from './seed-lib.js';

z.config(z.locales.pt());

const args = process.argv.slice(2);
const simulacao = args.includes('--dry-run');
const removerAusentes = args.includes('--remover-ausentes');

function falhar(mensagem: string): never {
  console.error(`\n✖ ${mensagem}\n`);
  process.exit(1);
}

// 1. Lê e valida o conteúdo.
const arquivo = new URL('./conteudo.json', import.meta.url);
let bruto: unknown;
try {
  bruto = JSON.parse(readFileSync(arquivo, 'utf8'));
} catch (error) {
  falhar(`Não foi possível ler scripts/conteudo.json: ${(error as Error).message}`);
}

const validacao = conteudoSchema.safeParse(bruto);
if (!validacao.success) {
  falhar('O conteudo.json tem problemas:\n' + z.prettifyError(validacao.error));
}
const conteudo: Conteudo = validacao.data;

console.log('✔ conteudo.json válido');
console.log(`  Empresa: ${conteudo.company.nome}`);
console.log(resumo('Serviços', conteudo.services));
console.log(resumo('Projetos', conteudo.projects));

if (simulacao) {
  console.log('\nSimulação: nada foi gravado no banco.');
  process.exit(0);
}

// 2. Lê a conexão do .env.seed (usuário com permissão de escrita).
if (!existsSync('.env.seed')) {
  falhar('Arquivo .env.seed não encontrado. Copie o .env.seed.example e preencha.');
}
const seedEnv = z
  .object({
    MONGODB_URI: z
      .string({ error: 'é obrigatória no .env.seed' })
      .regex(/^mongodb(\+srv)?:\/\//, 'deve começar com mongodb:// ou mongodb+srv://'),
    MONGODB_DB_NAME: z.string().min(1).default('conecta'),
  })
  .safeParse(parseEnv(readFileSync('.env.seed', 'utf8')));
if (!seedEnv.success) {
  falhar('O .env.seed tem problemas:\n' + z.prettifyError(seedEnv.error));
}

// 3. Grava.
const client = new MongoClient(seedEnv.data.MONGODB_URI, {
  appName: 'conecta-seed',
  serverSelectionTimeoutMS: 10000,
});
try {
  await client.connect();
  const relatorio = await aplicarConteudo(client.db(seedEnv.data.MONGODB_DB_NAME), conteudo, {
    removerAusentes,
  });
  console.log(`\n✔ Gravado no banco "${seedEnv.data.MONGODB_DB_NAME}"`);
  console.log('  Empresa: atualizada');
  console.log(detalhe('Serviços', relatorio.services));
  console.log(detalhe('Projetos', relatorio.projects));
} catch (error) {
  // Mostra só a mensagem, nunca a string de conexão.
  falhar(`Falha ao gravar no banco: ${(error as Error).message}`);
} finally {
  await client.close();
}

function resumo(nome: string, itens: { publicado: boolean }[]): string {
  const publicados = itens.filter((item) => item.publicado).length;
  return `  ${nome}: ${itens.length} (${publicados} publicados, ${itens.length - publicados} não publicados)`;
}

function detalhe(nome: string, r: RelatorioColecao): string {
  let linha = `  ${nome}: ${r.inseridos} novos, ${r.atualizados} alterados, ${r.total - r.inseridos - r.atualizados} sem mudança`;
  if (r.removidos > 0) {
    linha += `, ${r.removidos} removidos (${r.ausentes.join(', ')})`;
  } else if (r.ausentes.length > 0) {
    linha += `\n    ⚠ No banco, mas fora do JSON: ${r.ausentes.join(', ')} (use --remover-ausentes para apagar)`;
  }
  return linha;
}
