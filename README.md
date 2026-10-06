# Guardian Bay

Base de um e-commerce seguro, com regras de domínio e segurança executadas no servidor. Esta etapa prepara a infraestrutura; funcionalidades comerciais serão implementadas nas próximas Tasks.

## Pré-requisitos e instalação

- Runtime Next.js: Node.js 20.9 ou superior. Para desenvolvimento e quality gates com Vitest 4.1.11, use Node.js 20.19+ da linha 20, 22.12+ da linha 22 ou 24+.
- npm; use o `package-lock.json` versionado. Não use outro package manager neste projeto.

```bash
npm install
npm run dev
```

Acesse http://localhost:3000. O App Router está em `src/app/`.

## Variáveis de ambiente

`DATABASE_URL` é obrigatória para operações de banco e comandos Drizzle Kit. O template `.env.example` mantém seu valor vazio. Configure o valor real no ambiente ou em `.env.local` ignorado; rotas sem acesso ao banco continuam funcionando sem ele.

Quando houver configuração real, mantenha `.env.local` e demais arquivos privados na raiz, fora do Git. Somente `.env.example` é permitido para versionamento, sempre sem credenciais reais. Secrets ficam no servidor; nunca use `NEXT_PUBLIC_*` para valores privados nem os envie em props/DTOs ao cliente.

A estratégia de carregamento, validação e acesso está na [arquitetura: variáveis de ambiente](docs/architecture/README.md#variáveis-de-ambiente-ecmsg-15).

## Comandos e quality gates

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run lint` | Biome: valida formatter, lint e organização de imports, sem modificar arquivos |
| `npm run format` | Biome: aplica formatação e modifica arquivos; não é quality gate de CI |
| `npm run typecheck` | Gera tipos de rotas com `next typegen` pelo hook `pretypecheck`, depois executa `tsc --noEmit` |
| `npm run check` | Gate rápido: lint, typecheck e unitários, sem autofix ou serviços externos |
| `npm run verify` | Gate completo: check seguido do build de produção |
| `npm test` | Vitest em modo não interativo; adequado para CI |
| `npm run test:watch` | Vitest em modo watch para desenvolvimento |
| `npm run build` | Build de produção, incluindo verificação TypeScript do Next.js |
| `npm run start` | Executa o build de produção existente |

Durante desenvolvimento, execute `npm run check`, `git diff --check` para alterações não staged e `git diff --cached --check` para alterações staged. Antes de merge da branch da Epic, com todas as mudanças commitadas e `origin/main` atualizado, execute:

```bash
npm run verify
git diff --check origin/main...HEAD
```

A [política de quality gates](docs/architecture/README.md#quality-gates-ecmsg-20) define verificações adicionais por risco e tratamento de falhas. Gate obrigatório falhou ou não foi executado: não mergear.

O build baixa Geist e Geist Mono via `next/font/google`; o ambiente de compilação precisa acessar `fonts.googleapis.com` e `fonts.gstatic.com`. As fontes são incluídas no build e servidas pela aplicação, sem acesso ao Google Fonts pelo navegador. `next typegen` e build geram arquivos em `.next/` e `next-env.d.ts`, ignorados pelo Git.

A [estratégia de testes](docs/architecture/README.md#testes-ecmsg-19) define colocation, separação de integração/E2E e casos de segurança. Os testes atuais são unitários, sem PostgreSQL, rede ou configuração real.

## Configuração da base

Next.js 16.3.8, React 19.2.8, Tailwind CSS 4 e React Compiler habilitado. TypeScript mantém `strict`, `noEmit`, resolução `bundler` e alias `@/* → ./src/*`. `allowJs: false` limita o programa TypeScript aos arquivos TS/TSX; o PostCSS continua usando seu arquivo de configuração `.mjs` independente.

Biome 2.4.2 é o único linter/formatter, integrado ao `.gitignore`, com regras recomendadas de React/Next e organização de imports. Enforcement completo de boundaries permanece para trabalho posterior.

PostgreSQL usa Drizzle ORM com Postgres.js; Drizzle Kit e `@next/env` preparam a CLI. Há schema `users` e migration inicial para [identidade e credenciais](docs/architecture/README.md#identidade-e-credenciais-ecmsg-23), com Zod e Argon2id server-only, sem cadastro/login/sessão. Consulte o [fluxo de banco e migrations](docs/architecture/README.md#postgresql-e-drizzle-ecmsg-16) antes de executar `npm run db:generate`, `npm run db:migrate` ou `npm run db:studio`. As demais dependências futuras só serão adicionadas com uso concreto.

Consulte [AGENTS.md](AGENTS.md) para invariantes e [a arquitetura aprovada](docs/architecture/README.md) para responsabilidades, colocation e fronteira Server × Client. Antes de alterar APIs/configuração Next.js, consulte `node_modules/next/dist/docs/` da versão instalada.
