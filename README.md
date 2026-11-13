# conecta-api

API REST **somente leitura** do site da Conecta Tecnologia. Entrega os dados da empresa, os serviços e os projetos ao front-end.

Visitante → Front-end Angular → **API (esta)** → MongoDB Atlas

## Tecnologias

Node.js 22 · TypeScript · Fastify 5 · driver oficial do MongoDB · MongoDB Atlas · Zod (variáveis de ambiente, parâmetros e validação do seed) · Swagger/OpenAPI · Vitest

## Endpoints

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/v1/health` | Estado da API e do banco (200 ok, 503 banco indisponível) |
| GET | `/api/v1/site` | Empresa, serviços publicados, vitrine (projetos conceito) e projetos reais |
| GET | `/api/v1/projects/:slug` | Detalhes de um projeto publicado (404 se não existir ou não estiver publicado) |
| GET | `/api/docs` | Documentação Swagger |

Erros sempre no formato `{ "error": { "code": "...", "message": "..." } }`.

Códigos: `NOT_FOUND`, `PROJECT_NOT_FOUND`, `INVALID_SLUG`, `BAD_REQUEST`, `RATE_LIMITED` (429), `DATABASE_UNAVAILABLE` (503), `INTERNAL_ERROR` (500).

## Segurança

- Apenas GET. Conteúdo não publicado nunca sai na API.
- CORS restrito aos sites de `CORS_ORIGINS`.
- Limite de requisições por IP (`RATE_LIMIT_MAX` por minuto).
- Cabeçalhos de segurança (Helmet). Cache de 60 s nas respostas de conteúdo.
- A API usa um usuário do Atlas **só de leitura**; o seed usa outro usuário, de escrita.

## Como rodar

```powershell
npm install
Copy-Item .env.example .env          # preencher MONGODB_URI (usuário de leitura)
npm run dev                          # http://localhost:3000/api/v1/health
```

## Conteúdo (seed)

O conteúdo fica em `scripts/conteudo.json`. Esse arquivo **não é versionado** (está no `.gitignore`): fica só na máquina de quem roda o seed, até os textos serem aprovados.

```powershell
Copy-Item .env.seed.example .env.seed   # preencher MONGODB_URI (usuário de escrita)
npm run seed:check                      # só valida o JSON, não grava nada
npm run seed                            # valida e grava (não duplica; só grava o que mudou)
npm run seed -- --remover-ausentes      # também apaga do banco o que saiu do JSON
```

Para um item aparecer no site, ele precisa estar com `"publicado": true`.

## Variáveis de ambiente

| Variável | Obrigatória | Padrão |
|---|---|---|
| `MONGODB_URI` | sim | — |
| `MONGODB_DB_NAME` | não | `conecta` |
| `PORT` / `HOST` | não | `3000` / `0.0.0.0` |
| `LOG_LEVEL` | não | `info` |
| `CORS_ORIGINS` | não | `http://localhost:4200` |
| `RATE_LIMIT_MAX` | não | `100` |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento com recarga automática |
| `npm run build` / `npm start` | Compila para `dist/` e roda a versão compilada |
| `npm run typecheck` | Verifica os tipos (src, scripts e testes) |
| `npm test` | Testes com Vitest e MongoDB em memória (sem credenciais reais) |
| `npm run seed:check` / `npm run seed` | Valida / grava o conteúdo |
