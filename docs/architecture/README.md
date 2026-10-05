# Arquitetura e fronteiras do sistema

Sistema: E-commerce seguro · Epic 1: Fundação e arquitetura · Task 1: Definir arquitetura e fronteiras do sistema.

Este documento registra as decisões aprovadas. O [AGENTS.md](../../AGENTS.md) estabelece invariantes; as [skills](../../.agents/skills/) descrevem procedimentos para aplicá-las. A fronteira Server × Client aprovada na Task 1 é preservada. A ECMSG-14 (Task 3) complementa este documento com localização de código e convenções, sem implementar funcionalidades.

## Precedência das instruções

A ordem entre instruções do projeto é `AGENTS.md → arquitetura aprovada do Guardian Bay → regras de segurança → frontend-patterns e outras recomendações genéricas`. Exemplos genéricos não alteram as decisões específicas. A skill de frontend conserva seu repertório de composição, fetching e performance; aplique-o dentro dos limites abaixo. Essa precedência não dispensa os invariantes de segurança registrados no projeto.

## Estado observado

O projeto contém o scaffold de Next.js 16.3.8 com React 19.2.8, App Router em `src/app`, Tailwind 4 e React Compiler habilitado. `page.tsx` e `layout.tsx` têm um componente principal cada e não usam `"use client"`. TypeScript está em modo estrito, com `@/* → ./src/*`. Biome 2.4.2 já formata, organiza imports e aplica regras recomendadas de Next/React por `npm run lint`.

Antes desta Task, `docs/`, `.codex/` e `.agents/skills/` estavam vazios. Havia somente o `AGENTS.md` raiz, com o bloco gerenciado pelo Next.js; `CLAUDE.md` já apontava para ele. As pastas `components`, `features`, `db`, `lib` e `hooks` já existiam vazias e foram preservadas, sem placeholders. Não havia comportamento de domínio ou conflito no código a migrar.

PostgreSQL, Drizzle, Radix UI, Zod, Zustand e React Hook Form fazem parte das decisões para uso futuro descritas aqui; não estão instalados nesta execução. Estes exemplos não autorizam instalação nem implementação antecipada.

## Camadas e responsabilidades

A estrutura é conceitual: crie pastas somente quando existir código que as justifique.

```text
src/
├── app/
├── components/
├── features/
├── db/
├── lib/
└── hooks/
```

| Camada | Responsabilidade | Limite |
| --- | --- | --- |
| `app` | Rotas, layouts, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, composição e Route Handlers realmente necessários | Não concentra regras de negócio nem acessa Drizzle/PostgreSQL diretamente |
| `components` | UI verdadeiramente compartilhada | Não acessa DB ou código server privilegiado |
| `features` | Comportamento de funcionalidades/domínios | Separa recursos client-side de módulos server privilegiados |
| `db` | Somente PostgreSQL + Drizzle; conceitualmente `index.ts` e `schema/` | Não conhece React, app, components, features ou hooks |
| `lib` | Infraestrutura transversal, independente das features | Não importa app, features ou components |
| `hooks` | Hooks realmente transversais, como `use-media-query.ts` | Hooks específicos ficam na feature |

Evite antecipar `src/types`, `src/schemas`, `src/server`, `src/utils` e `src/assets`. Tipos, schemas e código server ficam próximos de seus responsáveis.

### Direção das dependências

```text
app        → components, features, lib
features   → components, db, lib
components → lib
hooks      → lib, components
db         → lib
```

O mapa trata dependências internas entre camadas; não exige que todas existam. As restrições de ambiente também se aplicam: a permissão `features → db` é para código server, nunca para componentes, hooks ou stores client-side. Código server da feature pode usar schemas e outros módulos server necessários, respeitando os limites entre domínios. Dependências não apontam de camadas inferiores para superiores; `db → feature` é proibido.

Prefira `app → feature/server → db`. `app` compõe features em vez de criar uma teia como `cart → catalog → orders → auth`. Um workflow server que atravesse domínios precisa primeiro demonstrar o problema concreto e então adotar a menor abstração necessária. Não antecipe `domain`, `application`, `use-cases`, `repositories` ou `services`.

### Colocation e reutilização

Um arquivo contém apenas um componente React principal. Não agrupe componentes independentes: ao dividir uma página, cada componente fica em seu arquivo. Componentes devem ser pequenos, coesos e reutilizáveis.

Um componente exclusivo de uma rota fica próximo dela, por exemplo:

```text
app/(store)/products/[slug]/
├── page.tsx
└── _components/
    ├── product-gallery.tsx
    └── product-details.tsx
```

Mova para a camada compartilhada adequada quando houver possibilidade real de reutilização por outras páginas/features. Não centralize antecipadamente. Em `components`, a organização conceitual é:

- `ui/`: primitives e elementos de design system, principalmente Radix UI + Tailwind, como `button.tsx`, `input.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `table.tsx` e `pagination.tsx`; sem pasta por componente desnecessária.
- `forms/`: infraestrutura genérica de formulário; formulários de domínio ficam na feature.
- `shared/`: componentes compostos reutilizados, como header, footer, logo e navegação.

Features futuras podem ser `auth`, `catalog`, `cart`, `checkout` e `orders`. Cada uma cria somente o necessário: `actions/`, `components/`, `schemas/`, `server/`, `hooks/`, `store.ts` ou `types.ts` são possibilidades, não um scaffold obrigatório.

`lib/money/` é transversal a catálogo, carrinho, checkout e pedidos. Já `get-cart-total.ts` pertence ao domínio do carrinho e fica na feature, não em `lib`. A mesma lógica vale para hooks: `features/cart/hooks/use-cart-drawer.ts` é específico.

## Diretórios e convenções (ECMSG-14)

Esta seção complementa as responsabilidades e o mapa de dependências acima; não cria outra arquitetura. Atualmente, os arquivos versionados de aplicação estão somente em `src/app`. Não há schemas Zod, Drizzle, Actions, handlers ou módulos `server-only` a migrar. Os exemplos abaixo são destinos para código futuro, não diretórios a criar antecipadamente.

### Onde colocar novo código

| Necessidade concreta | Local | Como decidir |
| --- | --- | --- |
| Rota, layout ou composição | `app/<segmento>/` | Preserve as convenções de arquivos do Next.js |
| UI exclusiva de uma rota | `app/<segmento>/_components/` | `_` exclui a pasta do roteamento; não é proteção de segurança |
| Formulário ou UI de um domínio | `features/<dominio>/components/` | Mesmo quando usado em várias rotas, permanece com o domínio |
| Leitura, regra crítica ou mutation interna | `features/<dominio>/server/` | Acesso a DB e projeção de DTO pertencem a essa implementação |
| Entrada por Server Action | `features/<dominio>/actions/` | Boundary pública fina; consulte a seção de writes |
| Schema de entrada ou contrato de saída | Junto da boundary na feature | Um arquivo dedicado basta; `schemas/` e `types.ts` surgem conforme o uso |
| Hook ou estado de UI específico | `features/<dominio>/hooks/` ou `store.ts` | Não promova estado de domínio ao Zustand |
| UI usada concretamente por áreas distintas | `components/ui`, `components/forms` ou `components/shared` | As responsabilidades são as definidas em colocation; `shared` aqui é UI composta, não depósito genérico |
| Hook transversal | `hooks/` | Sua dependência deve respeitar o mapa existente |
| Infraestrutura transversal | `lib/<responsabilidade>/` | Nomeie a responsabilidade, como `money`; não crie `utils`, `helpers`, `services` ou `common` genéricos |
| Conexão e schema PostgreSQL/Drizzle | `db/index.ts` e `db/schema/` | Sem regras de negócio ou contratos públicos derivados automaticamente de tabelas |
| Interface HTTP necessária | `app/<segmento>/route.ts` | Delega à implementação server da feature; não substitui reads diretos do servidor |

Configuração de ferramentas permanece na raiz e arquivos públicos em `public/`. Não coloque secrets em `public/`, módulos client ou variáveis `NEXT_PUBLIC_*`. Grupos como `(store)` organizam layouts sem mudar a URL; use-os apenas quando houver essa necessidade. Preserve segmentos dinâmicos como `[slug]` e nomes especiais do Next.js.

### Nomes e unidades de código

Use termos de domínio em inglês, seguindo `app`, `cart`, `catalog` e `orders` dos exemplos aprovados. Escolha nomes que revelem a operação e permitam localizar arquivo e símbolo sem abrir todo o módulo.

| Elemento | Convenção | Exemplo e finalidade |
| --- | --- | --- |
| Diretório ou arquivo comum | `kebab-case`; `.ts` para lógica, `.tsx` para JSX | `product-details.tsx`, `get-cart-total.ts`; busca consistente entre arquivos |
| React Component | `PascalCase`, um componente principal por arquivo | `ProductDetails` em `product-details.tsx`; props locais como `ProductDetailsProps` |
| Função ou variável | `camelCase`, verbo para operação | `getProducts`, `updateQuantity`; predicados como `isAvailable` |
| Hook | Arquivo `use-*.ts`, função `use*` | `use-cart-drawer.ts` / `useCartDrawer`; explicita a regra de hooks |
| Schema Zod | Arquivo `*.schema.ts`, símbolo `*Schema` | `change-quantity.schema.ts` / `changeQuantitySchema`; distingue validação de tipo |
| Tipo TypeScript ou DTO | `PascalCase`, sem prefixo `I` | `ChangeQuantityInput`, `CartSummaryDto`; nomeia o papel do contrato |
| Server Action | Arquivo `*.action.ts`, função assíncrona `*Action` | `update-quantity.action.ts` / `updateQuantityAction`; distingue endpoint de implementação interna |
| Operação server interna | Nome da operação, sem sufixo de Action | `server/update-quantity.ts` / `updateQuantity`; não é endpoint remoto |
| Route Handler | `route.ts`, exports HTTP exigidos pelo Next.js | `GET`, `POST`; não renomeie exports reservados |
| Schema de banco | Arquivo pelo conjunto de tabelas, símbolos descritivos | `db/schema/products.ts` / `products`; tipos inferidos usados internamente |
| Store de UI | `store.ts` na feature; hook `use*Store` | `useCartUiStore`; não armazena autoridade sobre preço ou permissões |

Nomes reservados (`page.tsx`, `layout.tsx`, `error.tsx`, `route.ts`, `proxy.ts` etc.) e exports exigidos pelo framework prevalecem sobre regras gerais. Não renomeie os componentes atuais `Home` e `RootLayout` por estética. Evite arquivos vagos como `data.ts` quando o nome da operação puder explicar seu conteúdo.

### Imports, exports e pontos de entrada

O alias existente é `@/* → ./src/*`; mantenha-o sem aliases adicionais. Use imports relativos dentro do mesmo módulo/feature e `@/` ao atravessar áreas, sempre para o arquivo responsável. O caminho não concede permissão: aplique o mapa de dependências e a boundary Server × Client também aos imports transitivos.

Prefira exports nomeados para componentes reutilizáveis, funções, schemas e tipos, para que o nome do contrato seja consistente nos consumidores. Preserve default exports onde Next.js exige, e os defaults existentes. Use `import type` e `export type` para dependências exclusivamente de tipos; isso não autoriza expor tipos internos de banco ou sessão como contratos client.

Não crie barrel files (`index.ts` de reexports) automaticamente. Imports diretos tornam o ambiente e a origem visíveis e reduzem ciclos. Um ponto de entrada necessário deve ter exports explícitos, sem `export *`, e responsabilidade única. Nunca reúna componentes client, Actions e implementação server no mesmo barrel. `db/index.ts` é o ponto de conexão previsto, não um barrel para tornar tabelas acessíveis à UI.

Uma feature não importa arbitrariamente `server`, componentes, stores ou outros detalhes internos de outra. Primeiro prefira composição pela rota. Se um workflow exigir colaboração server entre domínios, documente o caso e o contrato mínimo antes de introduzir a dependência; o consumidor só usa esse ponto de entrada explícito e server protegido. Não crie fachadas vazias nem um `index.ts` por domínio preventivamente. A API pública continua sujeita à direção das camadas e ao ambiente do consumidor.

| Import hipotético | Resultado |
| --- | --- |
| `app/page.tsx → @/features/catalog/server/get-products` | Permitido para leitura server |
| `features/cart/actions/update-quantity.action → ../server/update-quantity` | Permitido; a operação verifica a segurança em cada chamada |
| Componente client → Action de arquivo com `"use server"` | Permitido como referência remota, conforme a boundary aprovada |
| Componente client → `features/cart/server/*` ou `db/*` | Proibido, inclusive via reexports e dependências transitivas |
| `components/* → features/*` ou `db/*` | Proibido pelo mapa; UI específica permanece na feature |
| `features/cart/* → features/catalog/server/*` sem contrato aprovado | Proibido; não acople internals entre domínios |
| `db/* → features/*` ou `lib/* → app/*` | Proibido por inverter a direção das dependências |

### Contratos e marcação de ambiente

Mantenha `"use client"` no topo da menor entrada interativa necessária. Não espalhe a diretiva para compensar imports incompatíveis. `"use server"` no topo de arquivo de Actions identifica exports assíncronos remotos; não use essa diretiva como proteção de helpers internos.

Módulos que acessam DB, secrets, autenticação/autorização ou regras privilegiadas devem usar `import "server-only";`, inclusive pontos de entrada server e infraestrutura privilegiada em `db`/`lib`. O nome `server/` ou um sufixo de arquivo sozinho não impede bundling client. Não marque schemas puros de entrada ou contratos seguros compartilhados como server-only apenas pela localização. A implementação desse guard e sua dependência pertencem à Task que introduzir o primeiro módulo privilegiado; nenhum é necessário no scaffold atual.

Tipos inferidos do Drizzle permanecem internos. Um DTO específico, junto da feature, declara os campos mínimos realmente enviados; a implementação server projeta os campos explicitamente, sem espalhar uma entidade inteira. Para inputs, prefira `z.infer` ou, quando houver transformação, `z.input`/`z.output` conforme o lado do contrato. Compartilhe schema com o formulário somente quando for puro, seguro e não trouxer dependências privilegiadas. Consulte as seções de DTO, validação e writes para as garantias da operação; nomes de arquivos e tipos não substituem esses checks.

### Revisão de novas adições

Antes de adicionar um módulo, identifique seu dono, consumidores e ambiente. Confira imports diretos, reexports e dependências transitivas client contra o mapa; revise os campos efetivamente enviados pela boundary. Crie somente os diretórios necessários ao código real e rode `npm run check` e os testes pertinentes disponíveis. O mapa continua sendo verificado em revisão; Biome atual não garante isolamento arquitetural nem ausência de vazamento de dados.

## Fronteira Server × Client aprovada

### Server-first e componentes

Server é o padrão. Client é uma exceção introduzida somente onde interação ou APIs do navegador realmente exigirem. Páginas e layouts permanecem Server sempre que possível; a necessidade de `useState`, Zustand, React Hook Form ou eventos em uma parte não transforma toda a árvore em Client.

```text
page.tsx                 SERVER
├── product-details      SERVER
├── description          SERVER
├── reviews              SERVER
└── add-to-cart           CLIENT
```

Coloque `"use client"` na menor subtree necessária. O módulo e suas dependências ordinárias entram no grafo client, mesmo com pré-renderização no servidor. Não podem importar `feature/server`, `db`, secrets, credenciais, sessão interna ou implementação `server-only`. Uma referência remota de Server Action apropriada é a exceção descrita abaixo: sua implementação continua no servidor.

Cada componente independente tem arquivo próprio, inclusive em composição e compound components. Exemplos genéricos que mostram vários componentes no mesmo bloco demonstram conceitos, não a organização de arquivos deste projeto. Componentes exclusivos ficam próximos da rota/feature; `src/components` exige possibilidade real de reutilização.

### Reads e data loading

O caminho principal de leitura é:

```text
Server Component
  → feature/server
  → autenticação/autorização quando necessário
  → DB
  → DTO mínimo
  → Server Component
  → Client Component somente se necessário
```

Mesmo sendo tecnicamente permitido pelo Next.js, Server Components não acessam Drizzle/PostgreSQL diretamente. `page.tsx → feature/server/get-products → db` centraliza queries, regras, autorização, projeção de DTO e pontos de teste/revisão na feature.

Não substitua essa leitura por `page.tsx → Client → useEffect/SWR/React Query → /api/products` quando o servidor já puder obter o dado. Fetching no browser ou polling é exceção com motivo concreto, como informação dependente de APIs exclusivamente do browser ou atualização periódica necessária. Os exemplos genéricos de fetching da skill só se aplicam após essa justificativa; não autorizam adicionar bibliotecas.

Server Actions não são o mecanismo padrão de data fetching. Render de Server Component faz leitura/composição, sem mutations ou efeitos colaterais relevantes: logout, update e alterações críticas pertencem a uma Action ou Route Handler.

### Server → Client: DTO e serialização

Props e retornos enviados ao cliente fazem parte da boundary. A feature projeta a entidade de banco para um DTO mínimo e serializável segundo React/Next.js; não repasse automaticamente registros completos.

Por exemplo, em vez de enviar `user`, `session` e `product` inteiros a um `CartButton`, passe somente `productId` e `initialQuantity` se forem suficientes. Usuários, endereços, pedidos, sessões, dados administrativos e simulação de pagamento exigem atenção especial à exposição.

Evite instâncias de bibliotecas de domínio quando representações simples bastarem. Dinheiro pode conceitualmente sair de uma instância Dinero no servidor para `{ amount: 12990, currency: "BRL" }`, ou para string formatada quando a UI apenas exibe. Isso é um exemplo de DTO, não a escolha definitiva de dinheiro: a infraestrutura correspondente será decidida posteriormente; Dinero não é implementado aqui.

### Client → Server: intenção e validação

Toda entrada do cliente é não confiável: `FormData`, JSON, `params`, `searchParams`, headers, cookies, hidden inputs, argumentos de Server Actions, `.bind()`, Zustand, `localStorage` e query strings. Ter recebido um valor por props, hidden input ou `.bind()` não lhe concede autoridade. Uma identidade só se torna confiável após verificação server-side da sessão/credencial correspondente.

O cliente informa intenção, como `{ productId: "…", quantity: 2 }`. O servidor valida essa entrada, busca produto/preço/estoque reais e aplica a regra de domínio. Nunca aceite o cliente como autoridade sobre `unitPrice`, `discount`, `subtotal`, `total`, `stock`, `permissions`, `role`, `ownership` ou `payment status`.

React Hook Form e Zod client-side fornecem feedback imediato para UX. A boundary server (Action/Route Handler) valida novamente toda entrada com Zod antes da regra. Reutilize um schema quando seguro e adequado, mantendo-o próximo da feature/boundary e sem importar dependências privilegiadas no cliente. Validação de formato não substitui autorização sobre um ID válido.

### `actions/` × `server/`

Uma feature pode ter `actions/`, `components/`, `schemas/` e `server/`, somente com código real. Não crie essas pastas vazias.

| Local | Responsabilidade | Consumo pelo Client |
| --- | --- | --- |
| `features/<feature>/actions/` | Boundary pública Client → Server, com Server Actions finas | Pode importar uma Action apropriada de arquivo marcado com `"use server"`; recebe referência remota |
| `features/<feature>/server/` | Implementação interna privilegiada, regras, authz, queries e DTO | Não pode importar |
| `db` | PostgreSQL/Drizzle | Não pode importar |

`"use server"` expõe funções como chamadas remotas; não é sinônimo de módulo interno protegido. Use `import "server-only";` em `server/` quando apropriado. A exceção para referências de Actions não autoriza reexportar implementação interna nem importar DB no cliente. Componentes compartilhados continuam sem acesso à implementação privilegiada.

### Writes e Server Actions

O padrão de escrita é `Server Action → feature/server`. Trate Actions como endpoints públicos, invocáveis independentemente da UI ou da navegação legítima.

```text
features/cart/actions/update-quantity.action.ts
  → validar boundary
  → obter identidade quando necessário
  → features/cart/server/update-quantity.ts
  → regra + autorização/ownership + DB
```

A Action permanece fina. Cada operação sensível verifica novamente validação, autenticação, autorização e ownership. Os checks podem ser delegados à implementação server, mas devem ocorrer em cada execução antes do acesso/efeito protegido. Um botão oculto, página autorizada, rota protegida, hidden input ou `.bind()` não substitui esses checks. Verifique ownership/permissões dos IDs para impedir IDOR/BOLA.

O retorno também é boundary: prefira `{ success: true }` ou contrato específico mínimo necessário à UI. Não retorne entidades completas por conveniência. Erros não expõem stack traces, SQL, secrets, detalhes internos ou informações sensíveis; a estratégia completa de erros será refinada na Task correspondente.

### Route Handlers e Proxy

`route.ts` representa uma interface HTTP real: integração externa, webhook, callback, download, API externa, endpoint efetivamente consumido pelo cliente ou polling necessário. Não crie Route Handler para o próprio Server Component chamar: use `page.tsx → feature/server → db`, em vez de `page.tsx → fetch("/api/products") → route.ts → db`.

Trate o handler como entrada pública: `Request → validação → autenticação/autorização conforme a operação → feature/server → Response mínima`. Operações sensíveis verificam ownership e valores críticos com as mesmas garantias das Actions. Mutations HTTP ficam nesses handlers quando a interface HTTP justificar sua existência.

Um futuro `proxy.ts` pode ajudar em redirects, navegação, UX e filtragem inicial. Não é autorização final: a Action/handler e sua operação server verificam a própria autorização novamente.

### Composição Server dentro de Client

Um pai Server pode construir conteúdo Server e passá-lo por props/`children` a um Client, por exemplo `<Modal><Cart /></Modal>`, com `Modal` Client e `Cart` Server criado acima da boundary. Isso preserva composição válida sem o Client importar diretamente o componente Server ou implementação privilegiada.

### Zustand e estado local

Zustand representa UI/cliente: drawer aberto, filtro local, estado temporário, seleção visual ou quantidade antes do submit. Pode exibir dados recebidos, mas nunca é autoridade de domínio sobre preço, desconto, estoque, total, role, permissão, ownership, pedido ou pagamento. Valores reenviados ao servidor passam pelas validações da operação.

## Validação, tipos e segurança

Schemas Zod ficam próximos da feature ou boundary protegida, por exemplo `features/auth/schemas/login.schema.ts`, `features/cart/schemas/change-quantity.schema.ts` e `features/checkout/schemas/address.schema.ts`. A validação frontend melhora UX; toda entrada não confiável deve ser validada novamente no servidor. React Hook Form não fornece garantia de segurança server-side.

Tipos específicos ficam junto de seus donos. Prefira `z.infer<typeof schema>` e tipos derivados do Drizzle. Evite manter schema Zod, interface TypeScript, tipo DB, tipo de formulário e tipo API duplicados sem necessidade concreta.

Autenticação e autorização ocorrem no servidor. Cada mutation verifica permissão e ownership; esconder botões não impede IDOR/BOLA. Queries e mutations expõem somente o necessário. Dados críticos são determinados ou validados pelo servidor, e módulos client não acessam infraestrutura privilegiada.

No banco, use Drizzle de forma parametrizada e evite SQL inseguro. Considere concorrência e integridade nas operações críticas; o mecanismo concreto deve ser escolhido conforme a operação real, sem criar tabelas ou abstrações nesta Task.

## Variáveis de ambiente (ECMSG-15)

### Declaração e classificação

O inventário de configuração da aplicação é o `.env.example` na raiz. Toda nova variável precisa de consumidor concreto ou da próxima Task identificada, classificação server/public e comentário sobre quando é obrigatória. Valores reais são fornecidos em `.env.local` ignorado, ou pelo ambiente de execução/deploy; nunca pelo template. O template usa valores vazios ou placeholders claramente fictícios e não é carregado automaticamente pelo Next.js.

| Variável | Classificação | Consumidor e obrigatoriedade |
| --- | --- | --- |
| `DATABASE_URL` | Exclusivamente server-side, potencialmente contém credenciais | Reservada para a próxima Task de PostgreSQL/Drizzle; ainda sem consumidor e não obrigatória |

Não há variáveis públicas necessárias, nem variáveis de autenticação/sessão justificadas atualmente. Não antecipe `AUTH_SECRET`, `SESSION_SECRET` ou infraestrutura client de configuração. Os nomes aqui são exemplos de categorias privadas, não requisitos atuais.

Privada é a classificação padrão. `NEXT_PUBLIC_*` é informação deliberadamente pública e só se justifica com necessidade real no Client. Nunca inclua credenciais, connection strings, tokens privados, chaves de sessão, infraestrutura interna ou valores usados como autoridade de segurança. Não envie variáveis privadas em props/DTOs, respostas HTTP, logs, mensagens de erro ou bundles client. A proteção nativa do framework não substitui a revisão desses caminhos explícitos de exposição.

### Carregamento nativo do Next.js

A documentação instalada de Next.js 16.3.8 em `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md` é a referência de comportamento. Arquivos `.env*` ficam na raiz, mesmo com código em `src`. O runtime Next.js já os carrega em `process.env`; não adicione `dotenv` ou carregamento manual duplicado.

A precedência é: `process.env` → `.env.$NODE_ENV.local` → `.env.local` → `.env.$NODE_ENV` → `.env`. O primeiro valor encontrado prevalece; `.env.local` não é carregado em `test`. Sem `NODE_ENV` explícito, `next dev` usa `development` e os demais comandos usam `production`. Não use nomes de ambientes personalizados em `NODE_ENV`. Valores com `$` são expandidos; use `\$` para um dólar literal no arquivo.

Leituras estáticas de `process.env.NEXT_PUBLIC_*` são incorporadas ao bundle durante `next build` e ficam congeladas: mudar o ambiente em runtime não altera o bundle já gerado. Acesso dinâmico por nome de variável ou alias de `process.env` não oferece esse inlining. Configuração privada também pode ser avaliada no build se usada em prerenderização; quando houver necessidade de configuração runtime, o consumidor deve usar o fluxo dinâmico apropriado documentado pelo Next.js, sem tornar todas as páginas dinâmicas preventivamente.

Não use `next.config.ts` → `env` para secrets: essa opção incorpora os valores ao JavaScript mesmo sem prefixo público. Preserve o arquivo de configuração atual sem esse campo. Ferramentas futuras fora do runtime Next.js, como CLI do ORM, precisarão de carregamento explícito compatível com `@next/env`; implemente isso somente junto da ferramenta, declarando dependência direta quando usada, sem depender implicitamente de um pacote transitivo.

### Acesso e validação quando houver consumidor

Hoje não há leituras de `process.env` na aplicação nem configuração obrigatória. Portanto, não se cria um módulo sem consumidor, dependência ou validação que impeça o scaffold de funcionar sem banco. Zod não está instalado e não será adicionado apenas para configuração; validação mais sofisticada poderá usá-lo quando entrar por necessidade real.

Ao introduzir o primeiro consumidor privado, crie um módulo pequeno e explícito como `src/lib/env/server.ts`, protegido com `import "server-only";`. Ele lê somente as variáveis declaradas necessárias e exporta acessores ou configuração tipada específica, nunca o objeto inteiro de `process.env`. Features/componentes não fazem leituras arbitrárias: a infraestrutura responsável usa esse ponto de acesso. Para `DATABASE_URL`, a futura infraestrutura `db` obtém o valor validado antes de abrir a conexão; UI não importa configuração privada.

A documentação instalada de Server/Client Components confirma que Next.js trata `server-only` internamente, inclusive produzindo erro de build em import client; instalar o pacote é opcional. Não adicione a dependência por padrão. A convenção de proteção da Task 3 permanece válida: diretório/sufixo não protege o módulo e `"use server"` não substitui esse guard.

O consumidor define quando a variável é obrigatória: valide antes do primeiro uso protegido e, se requerida na inicialização, antes de aceitar operações. Se utilizada durante build/prerenderização, valide nessa fase. Rejeite ausência, string vazia ou composta somente por espaços com erro como `Configuração obrigatória ausente: DATABASE_URL`, sem imprimir valor ou outras variáveis. Valide também o formato exigido pelo consumidor, sem defaults fictícios, non-null assertions ou fallback silencioso para configuração crítica. Não deixe um erro de configuração virar detalhe interno enviado ao usuário; a boundary aplica a política de erros já definida na arquitetura.

Não torne uma variável futura obrigatória só porque aparece no template. A Task que introduzir o consumidor deve atualizar sua obrigatoriedade e verificar ausência, vazio, formato inválido e valor válido com dados fictícios, além da rejeição de import client pelo framework.

Se houver consumidor público no futuro, mantenha o módulo público separado do privado e leia somente nomes públicos explícitos. Um módulo client nunca carrega configuração server para depois selecionar alguns campos. Não crie esse módulo sem necessidade atual.

### Arquivos e revisão de segurança

A regra existente `.env*` com exceção `!.env.example` já ignora arquivos locais, inclusive variantes de produção/desenvolvimento/teste. Mantenha somente o template seguro versionado; a recomendação genérica do Next.js de versionar `.env.test` não se aplica à política deste projeto. Não crie arquivos com valores reais nesta Task.

Revise novas variáveis no template, consumidores e caminhos de exposição. Use `git ls-files -- '.env*' '**/.env*'`, `git check-ignore --no-index .env .env.local .env.production .env.development.local .env.test` e busca por `NEXT_PUBLIC_`/`process.env` no código para confirmar a política. Ignore de Git não é proteção contra vazamentos em runtime nem remove um secret já rastreado.

## Quality gate e escopo

Biome é formatter, linter principal e quality gate. É o mecanismo preferido para enforcement automatizado de boundaries quando possível, futuramente com restricted imports e overrides para limites como `Client × feature/server`, `Client × db`, `components × db`, `lib × features` e `db × features`, respeitando referências remotas de Actions. A configuração atual não impõe o mapa arquitetural: por enquanto, ele é verificado em revisão. Esta Task não adiciona configuração extensa, ESLint ou dependências.

Para futuras mudanças, execute checks disponíveis e pertinentes sem corrigir problemas alheios silenciosamente. Analise primeiro o código existente, preserve padrões e informe conflitos antes de ampliar escopo.

Esta Task apenas registra decisões e prepara instruções: não implementa funcionalidades, banco, tabelas, componentes, Server Actions ou testes. A fronteira Server × Client fica registrada nesta revisão, sem avançar para outra Task.
