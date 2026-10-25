---
name: guardian-bay-components
description: Use when planning, implementing or reviewing Guardian Bay React components, pages, UI composition, forms, client state or notifications. Does not implement backend-only tasks or authorize new product features.
---

# Componentização do Guardian Bay

Construir a interface em **React + TypeScript/TSX**. “Nativo” significa elementos semânticos (`button`, `input`, `select`, `nav`, `table`) dentro de React, sem biblioteca extra para comportamento simples; não significa substituir React por HTML avulso.

## Começar pela Task e suas fontes

1. Aplicar [AGENTS](../../../AGENTS.md), [invariantes](../../../docs/agent-invariants.md) e a [arquitetura](../../../docs/architecture/README.md). Consultar as skills `architecture` e `frontend-patterns` conforme a responsabilidade afetada.
2. Ler [DESIGN.md](../../../DESIGN.md), localizar a página/componente no [índice visual](../../../docs/visual-identity/README.md) e carregar somente seus fundamentos/padrões pertinentes. Preservar pendências de produto e propostas visuais identificadas nas fontes.
3. Inspecionar código, imports, consumidores, utilitários, `package.json` e lockfile antes de criar algo. Ler o guia pertinente em `node_modules/next/dist/docs/` e a documentação oficial da versão da biblioteca escolhida; receitas de `latest` podem usar APIs diferentes.
4. As páginas e componentes de UI anteriores à renovação visual são **protótipos de testes iniciais**, não modelos para copiar ou preservar. Na Task de cada nova página, substituí-los pelo planejamento aprovado. A inspeção identifica contratos e impactos; não obriga a reutilizar sua UI. Preservar auth, Actions, regras comerciais, segurança e garantias dos testes aplicáveis; adaptar testes que dependam da UI substituída. Não apagar funcionalidades fora da Task.
5. Antes de editar, definir responsabilidade, consumidores, ambiente Server/Client, estados, biblioteca e checks. Instalação de pacote não exige provider, wrapper ou componente sem consumidor real.

## Seleção de comportamento

| Necessidade | Decisão |
| --- | --- |
| Controle ou apresentação simples | Elemento nativo em React + Tailwind |
| Overlay, foco modal ou menu composto | Radix headless, com aparência Guardian Bay |
| Produto, carrinho, pedido ou pagamento | Componente de domínio composto com as opções anteriores |
| Mecanismo especializado não coberto | Demonstrar requisito, custo e sobreposição antes de propor dependência |

Ler [seleção e estado](references/selection.md) ao escolher biblioteca, formulário, Toast, Zustand ou TanStack Query. Não implementar manualmente focus trap, roving focus, gerenciamento de overlays ou navegação complexa já fornecidos pela primitiva. Um `select` simples não exige Radix Select.

## Coesão, composição e localização

- Um componente principal por arquivo. Auxiliares pequenos e exclusivos podem ficar juntos; componentes independentes, reutilizados ou com responsabilidade complexa própria são extraídos. Sem limite artificial de linhas ou regra de arquivo para cada função. Declarar componentes no nível do módulo, não dentro do render.
- Preferir composição e props explícitas; evitar componente universal controlado por muitos booleanos. Compound components só quando o comportamento compartilhado justificar; não recriar mecanismos Radix.
- `components/ui`: primitivas genéricas; `components/forms`: estrutura genérica de campos; `components/shared`: shell e composições transversais. Componentes de comércio permanecem na feature responsável, inclusive quando várias rotas os usam.
- `features/<dominio>/components` para UI de domínio; `app/<rota>/_components` para exclusividade da rota. Checkout pertence a `orders`. Hooks específicos e variantes ficam próximos do dono; hooks transversais só em `hooks`. Criar pastas apenas com uso concreto.
- Arquivos `kebab-case`, componentes/tipos `PascalCase`, exports nomeados e imports diretos conforme arquitetura. Não antecipar barrels, camadas, schemas/tipos globais ou um utilitário genérico `utils`.
- Props mínimas; derivar tipos nativos para wrappers e `z.input`/`z.output` de schemas quando necessário. Não enviar tipos/objetos internos de DB ou sessão como contrato de UI. Usar uniões discriminadas para modos incompatíveis.
- Variantes visuais explícitas e tipadas; classes completas em mapas estáticos bastam inicialmente. Não instalar CVA/clsx ou outras ferramentas por conveniência sem justificativa e autorização aplicável.

## Server-first e dados

- Páginas/layouts Server por padrão. `"use client"` só na menor subtree que precisa de estado, eventos, hooks ou navegador; seus imports ordinários também entram no bundle.
- Read inicial: `Server Component → feature/server → db`. Writes: Action pública fina → operação server que valida entrada, autenticação, autorização e ownership. UI compartilhada não importa features; Client nunca importa `server`/`db` ou secrets.
- Pai Server pode passar conteúdo renderizado por `children`/props para ilha Client. SSR de uma biblioteca não elimina hidratação nem a torna um Server Component puro.
- URL guarda filtros aplicados, ordenação e paginação; rascunho local é separado. Aplicar reinicia página; Cancelar conserva seleção aplicada. Derivar valores, sem efeitos para sincronizar estados redundantes.
- TanStack Query atende consultas Client com motivo concreto; Zustand atende UI compartilhada. Nenhum deles é autoridade sobre preço, estoque, permissões ou pagamento. Não duplicar o mesmo dado em URL, store e cache.
- Enviar DTO mínimo e serializável. Conteúdo dinâmico como texto; HTML arbitrário e ampliação de CSP/URLs de mídia exigem Task específica. Não executar mutations durante render ou notificar sucesso antes da confirmação.

## Aparência e formulários

- Tailwind 4 e tokens de [Fundamentos](../../../docs/visual-identity/fundamentos.md) preservam identidade; não copiar paleta, fontes ou aparência padrão de bibliotecas. Propostas e valores ainda não validados permanecem identificados como tais.
- Estilizar Radix por classes/atributos `data-state`, preservando props, eventos e refs na composição `asChild`. Sem controles interativos aninhados ou links convertidos em botões de navegação.
- Usar `tailwind-merge` quando houver composição/override de utilities; não presume correção semântica, contraste ou cobertura de tokens customizados. Evitar conflitos pela API de variantes antes de ampliar configuração.
- Estados hover, focus-visible, active/pressed, seleção, disabled e loading são distintos; feedback não altera dimensão desnecessariamente. Responsividade mantém ordem de leitura e informação essencial; dark mode só com requisito real.
- Botões acionáveis usam `cursor-pointer`; disabled mantém cursor coerente com seu estado. Ação apenas com ícone usa `IconButton`, menor que Button, transparente inclusive no hover, com nome acessível e foco visível contido no espaço do controle. Não aplicar dimensões/background de Button ao toggle de senha.
- Auth deve caber na altura disponível em desktop Full HD, inclusive com erros usuais; reduzir espaçamento redundante antes de impor altura. Não esconder overflow para mascarar conteúdo cortado; mobile, zoom e mensagens longas continuam podendo rolar.
- RHF + Zod são preferenciais para formulários de domínio. Campos nativos usam `register`; `Controller` apenas para integração controlada necessária. Formulário GET simples pode permanecer nativo em React. Ver detalhes na referência.
- Labels persistentes, obrigatoriedade, ajuda/erros associados e resumo/primeiro erro focável. Validação de UX não substitui servidor; falha preserva campos seguros, nunca ecoa senha ou diagnósticos internos.

## Motion e validação

Toda navegação entre páginas deve ter uma transição definida conforme [guardian-bay-motion](../guardian-bay-motion/SKILL.md), com mudança direta para movimento reduzido ou ausência de suporte. Consultar essa skill também para qualquer animação ou microtransição; não duplicar seus padrões ou receitas. Reutilizar o dono de transição de rota existente antes de acrescentar outro. Preservar refs, portais, foco e identidade para React ViewTransition, conferindo runtime Next e tipos conforme essa skill. Não adicionar flag, canary, provider global ou atraso de ação por inferência.

Ler [validação](references/validation.md) para os critérios do comportamento afetado. Verificar teclado, foco, semântica, anúncios, responsividade, contraste e `prefers-reduced-motion`; Radix auxilia, mas não comprova acessibilidade da composição final. Executar gates proporcionais de [qualidade](../../../docs/quality.md) e informar evidência e limites. Não declarar UI testada apenas por compilar.

Esta skill orienta implementação futura. Sua criação e as dependências instaladas não autorizam implementar páginas, providers ou novos contratos comerciais fora da Task atual.
