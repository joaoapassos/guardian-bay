<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Regras invariantes do Guardian Bay

- Antes de implementar, analise código, instruções e configuração existentes. Reutilize padrões e faça a menor alteração correta. Informe conflitos antes de ampliar o escopo; não avance automaticamente entre Tasks.
- Precedência entre instruções do projeto: `AGENTS.md → arquitetura aprovada → regras de segurança → frontend-patterns e recomendações genéricas`. Padrões genéricos cedem às regras específicas do Guardian Bay.
- Consulte [a arquitetura aprovada](docs/architecture/README.md) para responsabilidades e exemplos. Pastas só devem surgir com código real; não antecipe camadas, abstrações ou diretórios globais de tipos/schemas.
- Direção das dependências internas: `app → components, features, lib`; `features → components, db, lib`; `components → lib`; `hooks → lib, components`; `db → lib`. Não inverta essas direções nem crie dependências arbitrárias entre features.
- `app` cuida de rotas e composição; regras de domínio ficam em `features`. Páginas/layouts não acessam Drizzle/PostgreSQL diretamente: use `app → feature/server → db`. UI não acessa DB. `db` trata apenas PostgreSQL/Drizzle; `lib` contém infraestrutura transversal e não conhece features.
- Server é o padrão; Client é exceção para interação ou APIs do navegador. Mantenha páginas/layouts Server e `"use client"` na menor subtree necessária. Reads: `Server Component → feature/server`; writes: `Server Action → feature/server`. Fetching client-side exige motivo concreto; render não realiza mutations.
- `actions/` representa a boundary pública Client → Server; `server/` contém implementação interna privilegiada, protegida com `import "server-only";` quando apropriado. Client pode importar uma Server Action apropriada, mas nunca `feature/server` ou `db`. Actions permanecem finas, são endpoints públicos e validam entradas, autenticação, autorização e ownership novamente nas operações sensíveis.
- Server → Client envia DTO mínimo e serializável, inclusive nos retornos de Actions. Route Handlers exigem interface HTTP real e seguem validação/autorização; não crie endpoint para o próprio Server Component chamar. Proxy e verificações de página não substituem autorização na operação.
- Client Components e suas dependências não acessam DB, secrets, credenciais, sessão interna, autorização ou implementação privilegiada; uma referência remota de Action é a exceção de import descrita acima. Zustand representa estado de UI, nunca a fonte de verdade de regras críticas.
- Um arquivo contém apenas um componente React principal; componentes independentes ficam em arquivos próprios. Mantenha componentes pequenos e coesos, próximos da rota/feature; centralize em `components` apenas com possibilidade real de reutilização. Componentes compartilhados não acessam código server privilegiado.
- Schemas, tipos e hooks específicos ficam próximos da feature/boundary responsável. Prefira inferência de Zod e tipos derivados do Drizzle a representações duplicadas; `hooks` recebe somente hooks transversais.
- Dados do cliente nunca são confiáveis. Validação frontend serve para UX; toda operação sensível valida entradas novamente no servidor.
- Autenticação e autorização são server-side. Esconder UI não autoriza; toda mutation verifica autorização e ownership/permissões no servidor para evitar IDOR/BOLA.
- Cliente envia intenção, nunca autoridade. Preço, desconto, estoque, total, permissões, propriedade de recursos, status de pagamento e outros dados críticos são determinados ou validados pelo servidor. Queries/mutations retornam apenas os dados necessários ao cliente.
- Use Drizzle de forma parametrizada, evite SQL inseguro e considere concorrência e integridade em operações críticas.
- Biome é formatter, linter principal e quality gate; prefira seus recursos para enforcement de boundaries quando possível. Não introduza ESLint ou configuração extensa sem necessidade da Task.

## Skills do projeto

Workflows complementares em `.agents/skills/<skill>/SKILL.md`:

- [architecture](.agents/skills/architecture/SKILL.md): ao planejar ou revisar localização de código e dependências.
- [security-review](.agents/skills/security-review/SKILL.md): ao revisar operações sensíveis ou alterações que cruzem limites de confiança.
- [frontend-patterns](.agents/skills/frontend-patterns/SKILL.md): boas práticas de frontend subordinadas às decisões específicas do projeto.
