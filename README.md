# Guardian Bay

Base de um e-commerce seguro, com regras de domínio e segurança executadas no servidor. Identidade, catálogo, carrinho autenticado e checkout/pedidos com pagamento acadêmico e estoque server-side estão implementados. O backoffice reúne catálogo/estoque, consulta administrativa de pedidos e auditoria durável selecionada. Budgets server-side limitam novas intenções de checkout e mutations administrativas.

## Pré-requisitos e instalação

- Runtime Next.js: Node.js 20.9 ou superior. Para desenvolvimento e quality gates com Vitest 4.1.11, use Node.js 20.19+ da linha 20, 22.12+ da linha 22 ou 24+.
- Referência do SDLC/CI: Node.js 24.19.0 e PostgreSQL 18.6; browsers de segurança exigem Node 22.12+ ou 24+.
- npm; use o `package-lock.json` versionado. Não use outro package manager neste projeto.

```bash
npm ci
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
| `npm run test:integration` | Migrations, identidade, catálogo, carrinho, pedidos e estoque em PostgreSQL local dedicado; exige `TEST_DATABASE_URL` |
| `npm run test:security` | Unitários, PostgreSQL, build e HTTP/Chromium reais; exige banco dedicado e browser executável |
| `npm run test:watch` | Vitest em modo watch para desenvolvimento |
| `npm run build` | Build de produção, incluindo verificação TypeScript do Next.js |
| `npm run start` | Executa o build de produção existente |
| `npm run ci` | Etapas de runtime do CI: check → PostgreSQL → build → HTTP/browser, uma vez cada |
| `npm run db:check` | Journal/snapshots/drift em cópia temporária, instalação vazia e upgrade da Epic 9 em PostgreSQL 18 |
| `npm run security:setup` | Instala ferramentas SDLC fixadas, com checksum dos binários e venv isolado; Linux x64 |
| `npm run security:dependencies` | Audit produção/tooling com decisões restritas e revisão datada, sem autofix |
| `npm run security:secrets` | Gitleaks e arquivos sensíveis indexados, sem ler env local |
| `npm run security:sast` | Semgrep AST/taint local; findings novos exigem triagem |
| `npm run ci:validate` | Actionlint: sintaxe e expressões do workflow |
| `npm run ci:integrity` | Manifest/lockfile e ausência de alterações/outputs inesperados após gates |

Durante desenvolvimento, execute `npm run check`, `git diff --check` para alterações não staged e `git diff --cached --check` para alterações staged. Antes de merge da branch da Epic, com todas as mudanças commitadas e `origin/main` atualizado, execute:

```bash
npm run verify
git diff --check origin/main...HEAD
```

A [política de quality gates](docs/architecture/README.md#quality-gates-ecmsg-20) define verificações adicionais por risco e tratamento de falhas. Gate obrigatório falhou ou não foi executado: não mergear.

As Actions de autenticação têm [política de requests e abuso](docs/architecture/README.md#boundaries-e-requests-ecmsg-26): body até 16 KiB, schemas estritos e rate limit PostgreSQL antes do hashing. A implantação pública ainda precisa de uma origem/IP confiável e proteção de entrada; headers IP enviados pelo cliente não são usados como autoridade.

O build baixa Geist e Geist Mono via `next/font/google`; o ambiente de compilação precisa acessar `fonts.googleapis.com` e `fonts.gstatic.com`. As fontes são incluídas no build e servidas pela aplicação, sem acesso ao Google Fonts pelo navegador. `next typegen` e build geram arquivos em `.next/` e `next-env.d.ts`, ignorados pelo Git.

A [estratégia de testes](docs/architecture/README.md#testes-ecmsg-19) mantém unitários em `check` e integração em comando separado. Para mudanças de identidade/autenticação/sessão/catálogo/carrinho/checkout/pedidos/estoque, configure `TEST_DATABASE_URL` no ambiente apontando exclusivamente para PostgreSQL local com banco `guardian_bay_test`, diferente de `DATABASE_URL`, e execute `npm run test:integration`. A suíte aplica migrations versionadas, cria fixtures próprias e limpa somente essas fixtures; não cria o banco nem usa a conexão normal como fallback.

## Configuração da base

Next.js 16.3.8, React 19.2.8, Tailwind CSS 4 e React Compiler habilitado. TypeScript mantém `strict`, `noEmit`, resolução `bundler` e alias `@/* → ./src/*`. `allowJs: false` limita o programa TypeScript aos arquivos TS/TSX; o PostCSS continua usando seu arquivo de configuração `.mjs` independente.

Biome 2.4.2 é o único linter/formatter, integrado ao `.gitignore`, com regras recomendadas de React/Next e organização de imports. Enforcement completo de boundaries permanece para trabalho posterior.

PostgreSQL usa Drizzle ORM com Postgres.js; Drizzle Kit e `@next/env` preparam a CLI. Há schemas/migrations de `users`, `sessions`, `login_rate_limits`, `categories`, `products`, `cart_items`, `orders`, `order_items`, `inventory`, `audit_events` e `abuse_budgets`, contratos Zod, Argon2id e [autenticação/sessões server-side](docs/architecture/README.md#autenticação-e-sessões-ecmsg-24), com limites absoluto/idle e ownership. `/register`, `/login` e `/account` oferecem cadastro, login, conta própria e alteração de senha; logout revoga sessão no servidor. UI usa React Hook Form com validação Zod para UX, repetida nas Actions. O catálogo público está em `/products` e `/products/[id]`, com busca/filtros limitados, preço inteiro BRL/Dinero e ilustrações Lucide. `/admin` reúne navegação e dashboard Server; `/admin/catalog` exige role admin persistida e sessão atual para criar/editar/publicar, com revisão concorrente e confirmação Radix de despublicação. `/admin/orders` oferece consulta administrativa paginada/filtrada e `/admin/orders/[id]` mostra snapshot read-only. Cada leitura/Action verifica autorização própria, independentemente do layout; DTOs de pedidos não expõem comprador ou checkoutKey. Cadastro cria somente customer; provisionamento admin é operacional. `/cart` exige sessão e mantém itens persistidos por usuário, com quantidade limitada, preço atual do catálogo e total Dinero server-side; itens despublicados continuam visíveis e removíveis. `/checkout` confirma preços/publicação novamente no servidor e cria pedido idempotente com snapshot; `/orders` e `/orders/[id]` exibem somente pedidos próprios, sem reler catálogo para histórico. Pagamento é simulado: total inferior a R$ 10.000,00 é aprovado; a partir disso, recusado. Recusa preserva carrinho e nova intenção exige nova confirmação. Estoque por produto inicia em zero; admin define quantidade absoluta com revisão. Publicado sem estoque continua no catálogo. Carrinho não reserva e mantém itens insuficientes; checkout rejeita o conjunto inteiro, consome somente PAID na transação e não repete consumo no retry. Não há recuperação self-service, guest cart/checkout, reserva de estoque ou pagamento real. Consulte o [fluxo de banco e migrations](docs/architecture/README.md#postgresql-e-drizzle-ecmsg-16) antes de executar comandos Drizzle.

Consulte [AGENTS.md](AGENTS.md) para invariantes e [a arquitetura aprovada](docs/architecture/README.md) para responsabilidades, colocation e fronteira Server × Client. Antes de alterar APIs/configuração Next.js, consulte `node_modules/next/dist/docs/` da versão instalada.

A [revisão da Epic 4](docs/architecture/README.md#revisão-da-epic-4-ecmsg-53) registra controles, evidências e findings não bloqueantes. A base validada localmente ainda exige proteção de entrada, HTTPS e configuração operacional antes de exposição pública. Para executar a suíte completa com browser real, configure também `SECURITY_BROWSER_PATH` com Chromium/Chrome/Edge instalado e OpenSSL disponível (Windows: Git por padrão; `SECURITY_OPENSSL_PATH` permite outro executável). O teste usa HTTPS loopback e certificado/perfil temporários, sem mudar o sistema. O gate completo falha cedo sem browser; execução direta do script isolado pode informar skip e não valida os formulários completos. Consulte a [matriz de identidade/acesso](docs/architecture/README.md#testes-de-identidade-e-acesso-ecmsg-40).

A [revisão da Epic 5](docs/architecture/README.md#revisão-da-epic-5-ecmsg-65) registra testes de ownership, preço derivado e concorrência do carrinho. Para reproduzir todos os gates PostgreSQL atuais, use PostgreSQL 18: a assertion RESTRICT herdada do catálogo usa SQLSTATE 23001 dessa versão. Banco, credenciais e browser são configuração local, nunca conteúdo versionado.

O harness de segurança inicia Chromium/Chrome real em perfil temporário, usa porta CDP dinâmica e aguarda explicitamente o endpoint DevTools e um target page antes das verificações de runtime/CSP. Falha de inicialização ou timeout produz diagnóstico limitado e sanitizado, sem omitir o teste.

A [revisão da Epic 6](docs/architecture/README.md#revisão-da-epic-6-ecmsg-78) registra idempotência persistente, snapshot monetário, atomicidade do carrinho e races checkout/cart/catalog. Chave de confirmação identifica intenção, nunca ownership; a aplicação não coleta dados financeiros.

A [revisão da Epic 8](docs/architecture/README.md#revisão-da-epic-8-ecmsg-104) registra o backoffice, leitura administrativa privada, filtros allowlisted, conflitos e testes de chamadas diretas/Chromium. Pedidos não possuem edição administrativa de status, itens ou valores. Não há gestão completa de usuários ou refund. Auditoria durável e budgets autenticados são descritos na [revisão da Epic 9](docs/architecture/README.md#revisão-da-epic-9-ecmsg-117); `/admin/audit` é read-only e exige admin atual. Eventos críticos participam da mesma transação do efeito. Retry de checkout existente não consome budget nem duplica evento. Retenção é manutenção operacional manual, sem scheduler.

## SDLC e CI

A [política canônica](docs/architecture/sdlc.md) define PR/revisão, gates bloqueantes, exceções, mudanças críticas e processo de vulnerabilidades. Secure SDLC em `.github/workflows/security.yml` executa em PR, push de main/branch de bootstrap e manualmente; usa npm ci, Node fixado, PostgreSQL 18 isolado, Chromium real e permissões mínimas, sem secrets de produção. Além de ci, executa db:check, dependências, secrets, SAST, actionlint e integridade. Google Fonts, registry e instalação das ferramentas exigem rede; proteção volumétrica/deployment permanece fora desse processo. As ferramentas SDLC exigem Linux x64 e Python com suporte a venv; no Windows, use um ambiente Linux local para esses comandos. Branch protection é recomendada e exige verificação das regras efetivas pelo maintainer. Consulte o template de PR e registre N/A justificado, nunca sucesso fictício.
