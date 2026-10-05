# Guardian Bay

Base de um e-commerce seguro, com regras de domínio e segurança executadas no servidor. Esta etapa prepara a infraestrutura; funcionalidades comerciais serão implementadas nas próximas Tasks.

## Pré-requisitos e instalação

- Node.js 20.9 ou superior, conforme o requisito do Next.js instalado.
- npm; use o `package-lock.json` versionado. Não use outro package manager neste projeto.

```bash
npm install
npm run dev
```

Acesse http://localhost:3000. O App Router está em `src/app/`.

## Variáveis de ambiente

Nenhuma variável é obrigatória nesta fase. `.env.example` documenta esse estado e contém apenas comentários seguros; não é necessário copiá-lo para iniciar o projeto.

Quando houver configuração real, mantenha `.env.local` e demais arquivos privados na raiz, fora do Git. Somente `.env.example` é permitido para versionamento, sempre sem credenciais reais. Secrets ficam no servidor; nunca use `NEXT_PUBLIC_*` para valores privados nem os envie em props/DTOs ao cliente.

## Comandos e quality gates

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run lint` | Biome: valida formatter, lint e organização de imports, sem modificar arquivos |
| `npm run format` | Biome: aplica formatação e modifica arquivos; não é quality gate de CI |
| `npm run typecheck` | Gera tipos de rotas com `next typegen` pelo hook `pretypecheck`, depois executa `tsc --noEmit` |
| `npm run check` | Executa lint e typecheck, sem autofix |
| `npm run build` | Build de produção, incluindo verificação TypeScript do Next.js |
| `npm run start` | Executa o build de produção existente |

Para validar a base:

```bash
npm run check
npm run build
```

O build atual usa Geist via `next/font/google` e precisa de acesso ao Google Fonts durante a compilação. `next typegen` e build geram arquivos em `.next/` e `next-env.d.ts`, ignorados pelo Git.

## Configuração da base

Next.js 16.3.8, React 19.2.8, Tailwind CSS 4 e React Compiler habilitado. TypeScript mantém `strict`, `noEmit`, resolução `bundler` e alias `@/* → ./src/*`. `allowJs: false` limita o programa TypeScript aos arquivos TS/TSX; o PostCSS continua usando seu arquivo de configuração `.mjs` independente.

Biome 2.4.2 é o único linter/formatter, integrado ao `.gitignore`, com regras recomendadas de React/Next e organização de imports. Enforcement completo de boundaries permanece para trabalho posterior.

Nenhuma dependência de banco, autenticação, formulário, estado client ou dinheiro é necessária nesta fase. As dependências futuras só serão adicionadas com uso concreto.

Consulte [AGENTS.md](AGENTS.md) para invariantes e [a arquitetura aprovada](docs/architecture/README.md) para responsabilidades, colocation e fronteira Server × Client. Antes de alterar APIs/configuração Next.js, consulte `node_modules/next/dist/docs/` da versão instalada.
