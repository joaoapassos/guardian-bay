---
name: guardian-bay-motion
description: Planejar, implementar ou revisar motion no Guardian Bay, escolhendo Curtain, Shared Element ou microtransições conforme contexto, compatibilidade React/Next.js e acessibilidade. Usar em animações de navegação, continuidade de produto ou mudanças locais de UI; não ativar para CRUD ou regras de negócio sem demanda de movimento.
---

# Motion do Guardian Bay

Toda animação comunica contexto, continuidade ou estado. Sem benefício identificável, manter atualização direta. Preferir React ViewTransition, CSS e APIs nativas conforme o problema; biblioteca de animação exige justificativa concreta e autorização para dependências, não preferência estética.

## Antes de escolher

1. Ler [DESIGN.md](../../../DESIGN.md), os [padrões de interação](../../../docs/visual-identity/padroes/interacoes.md) e a página/componente afetado em [visual-identity](../../../docs/visual-identity/README.md). Aplicar [AGENTS.md](../../../AGENTS.md) e [arquitetura](../../../docs/architecture/README.md); preservar Server-first. Se a documentação tiver sido movida, localizar o destino real sem alterar fontes alheias à tarefa.
2. Conferir versões instaladas, tipos, guia em `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` e runtime efetivo. Ler [compatibilidade](references/compatibility.md) antes de usar ViewTransition ou APIs do roteador: React direto e React do App Router não são necessariamente a mesma versão. Não atualizar pacotes nem adicionar flag experimental por inferência.
3. Mapear origem/destino, entidade visual, raiz persistente, `loading.tsx`/Suspense, erro/redirect, foco/scroll e resultado crítico que precisa ficar pronto. Definir fallback antes de animar. Conferir se o componente solicitado realmente existe; exemplos não aprovam novas funcionalidades.
4. Escolher um padrão e os [tokens](references/motion-tokens.md). Ler somente a referência do padrão escolhido; consultar [validação](references/validation.md) ao definir checks.

## Escolha do padrão

| Pergunta | Escolha | Referência |
| --- | --- | --- |
| É urgente, movimento reduzido ou não há benefício? | Sem deslocamento; feedback imediato | [Micro](references/micro-transitions.md) |
| É mudança dentro da interface, mesmo com filtros na URL? | Microtransição local | [Micro](references/micro-transitions.md) |
| É navegação com a mesma entidade visual nos dois lados? | Shared Element se par/commit/suporte forem viáveis; senão reveal simples | [Shared](references/shared-element.md) |
| É navegação entre contextos independentes? | Curtain se existir controlador persistente e recuperação comprovável; senão navegação normal | [Curtain](references/curtain-transition.md) |

Um dono de transição de página por navegação: Curtain e Shared nunca simultâneos. Suprimir animações locais decorativas concorrentes, sem suprimir feedback necessário. Não instalar transição global para toda atualização, `router.refresh()` ou `popstate`.

## Integração obrigatória

- Manter páginas/layouts Server; isolar estado, DOM e eventos na menor ilha Client. Server pode compor conteúdo para a ilha; Client não importa `feature/server`/`db`. Não criar camada/provider global sem uso real; controlador persistente, quando indispensável, ocupa ancestral comum existente.
- Usar import público de React e navegação do App Router. Não importar `next/dist/compiled/*` na aplicação. `Link` já inicia React Transition; não substituí-lo por link genérico nem aguardar animação para buscar/navegar. Preservar prefetch, histórico, modifiers, downloads, foco e scroll.
- `startTransition` agenda atualização não urgente, não é duração, Promise de navegação ou garantia de dados prontos. Input controlado, foco, pressed, abrir/fechar e feedback urgente não esperam trabalho de fundo.
- Com React ViewTransition, não chamar `document.startViewTransition` sobre o mesmo commit. Usar `default="none"` em boundaries participantes para evitar animação implícita; habilitar explicitamente somente `share`, `enter`, `exit` ou `update` necessários. Não envolver toda a árvore com animação padrão.
- `pathname`, `useLinkStatus().pending` e término de `useTransition` não provam resolução de todas as boundaries, imagens ou autorização. A cortina precisa de contrato limitado de prontidão e desbloqueio; sem ele, escolher fallback.
- Autorização e mutations continuam no servidor. Snapshot não é fonte de preço/estoque/resultado nem conteúdo autorizado. Motion não dispara/reenvia compra, não guarda DOM privado nem oculta erro para aparentar sucesso.

## Acessibilidade e custo

Aplicar movimento reduzido a CSS, snapshots e controlador: sem cortina/morph espacial e sem espera por evento de animação que deixou de existir. Conservar feedback textual, teclado, foco visível e navegação funcional sem animação. Conteúdo coberto/invisível não recebe interação; sobreposição nunca bloqueia saída/recuperação indefinidamente.

Preferir `opacity`/`transform`, sem blur, zoom decorativo, medições por frame ou `will-change` permanente. Aguardar só recursos críticos explicitamente identificados, preservar streaming e não animar elementos fora da viewport. Cancelar animações/listeners/timers, restaurar atributos/scroll e ignorar callbacks de intenções antigas.

## Checklist de implementação futura

- [ ] Padrão comunica uma relação concreta, sem criar recurso comercial ou nova arquitetura.
- [ ] Compatibilidade de runtime/tipos/browser conferida; fallback funcional e sem flag/upgrade presumido.
- [ ] Identidade única ou prontidão limitada definida; uma navegação não dispara duas animações de página.
- [ ] Carregamento real, erro, acesso negado, cancelamento e navegação sucessiva liberam a interface.
- [ ] Foco, histórico, scroll, touch, prefetch e conteúdo autorizado preservados.
- [ ] Movimento reduzido e ausência de API não dependem de `animationend` para concluir.
- [ ] Checks proporcionais do projeto e cenários da [matriz de validação](references/validation.md) registrados com evidência e limites.

Esta skill orienta tarefas futuras; sua criação não autoriza implementar animações, refatorar layouts ou instalar dependências. Para esta entrega, validar documentos/skill, sem declarar desempenho ou acessibilidade de uma UI não implementada.
