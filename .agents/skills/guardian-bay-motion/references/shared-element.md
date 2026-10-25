# Shared Element Transition

[Skill](../SKILL.md) · [Compatibilidade](compatibility.md) · [Tokens](motion-tokens.md)

Usar em Card → Detalhe da **mesma entidade** ou representação/miniatura da mesma mídia quando esse recurso existir. Produto relacionado só faz par se o elemento selecionado e o destino representam exatamente o produto selecionado; não morphar o produto anterior em outro por semelhança. Não criar galeria/ampliação/produtos relacionados para demonstrar a skill.

## Identidade e configuração

Priorizar React ViewTransition na boundary da imagem/representação selecionada; manter resto da página sem animação global. Usar import público `react` quando o runtime App Router estiver confirmado. Exemplificação conceitual: origem e destino recebem `name` equivalente a `gb-product-{id-publico}-{id-da-midia}` e a mesma classe de share. Não enviar ID privado adicional, gerar nome aleatório, usar posição da lista ou `useId` independente em cada página para tentar formar par.

O nome pode existir no snapshot de origem e destino, mas não duplicado entre participantes simultâneos da mesma árvore/captura. Se a mesma entidade aparece em mais de uma grade, manter apenas o participante pretendido ou separar papéis e habilitar o par certo. `key` preserva identidade de lista; `name` pareia representações entre subárvores substituídas. Um não substitui o outro.

| Ativação | Uso neste padrão |
| --- | --- |
| `share` | Mesma identidade sai/entra na mesma transição; continuidade principal |
| `enter` | Entrada simples quando ainda não há par, inclusive reveal após fallback |
| `exit` | Saída local sem par, somente se agrega orientação |
| `update` | Mudança de participante que permanece montado; não representa automaticamente navegação entre entidades |

Usar `default="none"` e `share="gb-product-morph"` nos dois lados para habilitar só o par. **`default="none"` sem share explícito também desliga o morph.** Enter/reveal, se necessário, é habilitado de forma explícita e breve; não aplicar automaticamente enter/exit em todos os cards.

## Classes e CSS de snapshots

View Transition Class é fornecida por `share`/`enter`/`exit`/`update`, não é o `className` do elemento DOM nem um utilitário Tailwind que magicamente estiliza snapshots. A classe `gb-product-morph` pode orientar `::view-transition-group(.gb-product-morph)` para geometria/duração e `::view-transition-old(...)`/`::view-transition-new(...)` para apresentação dos snapshots. `::view-transition-image-pair(...)` trata o par, sem exigir blur/filtro. Usar as sintaxes compatíveis com o navegador alvo e regras CSS necessárias; não inventar plugin Tailwind.

Escolher durações/curvas de Tokens. Conter a imagem, preservar proporção real e reservar dimensões no layout; resoluções diferentes da mesma mídia podem fazer par. Diferença de proporções grandes ou arquivo que muda de produto exige contenção/crossfade simples, não esticar o objeto para preencher caixa. Header e formulário não devem viajar com a imagem.

## Link, Suspense e prefetch

`next/link` já participa de React Transitions no App Router suportado; preservar Link/prefetch/scroll. `transitionTypes` no Link ou opções de push/replace podem restringir estilos por intenção quando necessárias e documentadas na versão local; não são requisito para todo par nem substituem `name`.

O morph exige origem e destino participarem do mesmo commit de substituição. Prefetch/cache pode tornar isso possível, mas não garante dados autenticados ou toda a mídia pronta. Se primeiro monta fallback de Suspense, a imagem real posterior não faz o par retroativo com o card desmontado. Usar reveal simples ou atualização direta quando ela chegar, sem esperar rede para forçar morph.

Não dar ao Skeleton a identidade de uma foto verdadeira apenas para obter o efeito. Não desabilitar loading/streaming, atrasar navegação, reter tela antiga ou buscar dados por endpoint novo para construir par. Ausência/falha/decodificação lenta da imagem não bloqueia título/preço/ação: área reservada e placeholder continuam válidos. Se conteúdo/mídia essencial não estiver capturável, aceitar que a animação seja omitida.

Retorno pelo navegador preserva estado/página/scroll do catálogo; morph reverso só se o mesmo participante voltar a existir/couber e o commit formar par. Back nativo não traz automaticamente os tipos de transição que um link customizado envia. Não adicionar entrada ao histórico nem rolar ao topo só para encenar o retorno. Em paginação/filtro que removeu o card ou origem fora da viewport, usar fallback.

Se “Voltar” for um link da interface para o catálogo, em vez do histórico do navegador, preservar filtros/página conhecidos no destino quando disponíveis; não prometer restauração automática de scroll/estado que esse link não possui. Distinguir os dois casos antes de escolher direção ou testar o morph reverso.

## Falhas e contenção

React coordena sua própria chamada nativa; não executar `document.startViewTransition` ao redor do mesmo `router.push`/commit. Não combinar Curtain e Shared para a mesma navegação. Se um callback de animação criar Web Animations, devolver limpeza e cancelá-las em interrupção; isso não cancela a navegação.

Nomes duplicados, capture rejeitado, suporte parcial de classes/types, fontes/mídia atrasadas e updates rápidos podem impedir morph; o destino deve continuar navegável e sem erro comercial fictício. Não usar rejeição de `ready` como falha de autorização/pedido. Se for necessário controlar a API nativa fora do React, delimitar propriedade exclusiva e tratar seus estados conforme [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition); não manter dois coordenadores para uma mudança.

Snapshots não são controles interativos nem autoridade. Manter área viva com foco adequado e não estender a animação a cabeçalho/botões usados repetidamente. Verificar hit-testing: retirar pointer events de overlay de snapshots não garante interação normal de todo participante nomeado. Não deixar captura antiga com dados privados exposta após acesso revogado; revelar apenas conteúdo autorizado/erro seguro, sem cache visual próprio.

## Critérios específicos

- Mesma identidade real, nome estável e nenhum duplicado por captura.
- Só a região relevante tem continuidade; resto não crossfadeia indiscriminadamente.
- Destino suspenso/imagem lenta: navegação não espera morph; placeholder/reveal simples funciona.
- Voltar/avançar, cliques sucessivos, sem API e movimento reduzido preservam destino, foco, scroll e resposta imediata.

Base técnica detalhada: guia local do Next em Compatibilidade. [React ViewTransition](https://react.dev/reference/react/ViewTransition) esclarece ativação e classes; aplicar somente APIs presentes na versão efetiva.
