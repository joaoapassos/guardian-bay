# Compatibilidade e inventário local

[Skill](../SKILL.md) · [Validação](validation.md)

Consulta em **25/10/2026**. Revalidar ao aplicar: presença de uma documentação mais nova não atualiza o runtime. Não criar upgrade, flag ou declaração TypeScript para encobrir API ausente.

## Versões efetivamente encontradas

| Camada | Evidência local | Consequência |
| --- | --- | --- |
| Dependências diretas | Next 16.4.3; React/react-dom 19.2.8 em package.json e node_modules | `require('react')` no Node expõe `startTransition`, mas não `ViewTransition`/`addTransitionType` |
| Runtime incluído no Next | `next/dist/compiled/react` informa 19.3.0-canary-278794d7-20261002 e exporta as APIs | Há suporte incluído para o App Router; não concluir incompatibilidade só pelo React direto |
| Seleção do framework | Aliases do compilador em `next/dist/build/create-compiler-aliases.js` e seleção do canal em `next/dist/build/webpack-config.js` | É o bundler/contexto de renderização que escolhe o React; inspecionar também Turbopack/build usado, não importar caminhos internos |
| Tipos | @types/react e @types/react-dom 19.3.0; index.d.ts contém ViewTransition | Compilar com tipos não prova suporte do React 19.2 direto nem comportamento em navegador |
| UI/tooling | Tailwind 4.3.3 e TypeScript 5.9.3 instalados; Radix AlertDialog 1.1.24 | CSS nativo é suficiente para microtransições; não presumir instalação de Accordion, Tabs, Drawer ou biblioteca de motion |
| Configuração | next.config.ts contém React Compiler e configuração de Server Actions, sem flag de ViewTransition | Não adicionar/remover configurações alheias para seguir receita antiga |

O guia **incluído no Next instalado**, `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`, descreve suporte no App Router sem configuração, import público `ViewTransition`, tipos de transição e uso com Suspense. A documentação pública do React consultada já se apresenta como **19.3**. Isso não torna a dependência direta 19.2.8 uma versão estável 19.3.

**Decisão:** planejar React ViewTransition para execução pelo App Router suportado, com verificação futura de compilação e navegação real. Em testes unitários ou execução fora do Next, conferir resolução do módulo; fallback ou teste de integração real é preferível a mock que simule suporte e o declare validado. Não instalar canary, trocar tipos ou fazer import interno por conta desta skill. Os probes atuais inspecionaram exports/arquivos; não renderizaram uma transição em browser.

## Topologia e navegação atuais

- `src/app/layout.tsx` é root Server compartilhado, com `html`/`body`, navegação por `next/link`, consulta de identidade no servidor e pequenas ilhas Client. Ainda carrega Geist; Fraunces/IBM Plex são direção documentada, não fontes já aplicadas.
- `src/app/admin/layout.tsx` é layout Server **aninhado**, não outra root; aplica guard e retorna não encontrado sem autorização. Não presumir que Loja → Admin recarrega documento atualmente. Não transformar o guard em estado Client para animá-lo.
- `src/app/products/loading.tsx` e `src/app/admin/loading.tsx` já fornecem fallback. Há `error.tsx` e `not-found.tsx` em áreas do catálogo/pedidos. Não existe controlador de prontidão/curtain nem boundary ViewTransition de produção.
- Catálogo/produto são Server com dados dinâmicos; navegação pode passar por fallback. O catálogo atual usa formulário GET para filtros; não reescrever roteamento só para animar. O domínio visual não pressupõe fotos prontas.
- `useTransition` já aparece em carrinho, checkout, estoque e pagamentos; indica operação pendente, não animação instalada. Preservar o significado comercial desse estado.

Consultar localmente `01-app/03-api-reference/02-components/link.md`, `04-functions/use-router.md`, `04-functions/use-link-status.md`, `03-file-conventions/loading.md` e `layout.md`. `router.events` do Pages Router não é API do App Router; `router.push` não fornece Promise de prontidão. `useLinkStatus` pertence a descendente de Link e termina no avanço do histórico, podendo ser omitido pelo prefetch. Não usá-lo como relógio global da cortina.

## Limites de documento e suporte parcial

Navegação entre **root layouts distintos** pode fazer full page load; o estado JS/controlador anterior não persiste. Um `template` também remonta e é inadequado para controlador persistente. Preservar navegação normal; não simular persistência com storage de DOM, reload adiado ou bloqueio de links. View Transition cross-document depende de suporte/opt-in próprio e mesma origem, não é continuação automática de React ViewTransition; não prometê-la nem ativá-la nesta Task.

Detectar capacidades no browser, não por user agent: API básica, tipos/classes CSS utilizados e o comportamento do conjunto precisam ser compatíveis. API básica presente não prova todas as extensões. Sem suporte, preservar Link/DOM/dados e omitir morph; CSS local ainda pode funcionar. Com preferência reduzida, desabilitar deslocamento nos três padrões e liberar imediatamente qualquer máscara visual. Não depender de polyfill.

Se houver uso nativo isolado, separar prontidão da captura e conclusão da atualização/efeito. Não inferir estado da página a partir da animação; rejeição visual não é recusa de pagamento. [skipTransition](https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition/skipTransition) omite o efeito, mas mantém a atualização associada: cancelar animação não desfaz navegação/mutation. Não tentar controlar por esse mecanismo a ViewTransition que pertence ao React.

## Referências técnicas

- [Next: View Transitions](https://nextjs.org/docs/app/guides/view-transitions) — comparar com a cópia instalada, que é a referência da versão.
- [React: ViewTransition](https://react.dev/reference/react/ViewTransition) e [startTransition](https://react.dev/reference/react/startTransition) — confirmar API pública e versão antes de usar.
- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) — distinguir mesma página/documentos e suporte das partes utilizadas.
- [Skill técnica da Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-view-transitions) — referência consultada, não instalada ou copiada. Sua sugestão de aplicar todos os padrões não é regra do Guardian Bay: escolher o menor necessário. Blur e receitas de maior duração não substituem a identidade local.
