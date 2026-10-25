# Validação por comportamento

[Skill](../SKILL.md). Selecionar cenários da Task e registrar execução, resultado e limites; não repetir checklist completo para alteração trivial.

| Área afetada | Evidência necessária |
| --- | --- |
| Campo/formulário | Label/ajuda/erro associados, IDs únicos, obrigatoriedade, colar/autocomplete, teclado, primeiro erro/resumo focável; falha preserva dados seguros, sem expor senha |
| Submit/mutation | Pending distinto de sucesso, duplo envio impedido, erro/conflito recuperável; resultado incerto não repete compra e sucesso depende do servidor |
| Dialog/Drawer | Nome/descrição, abertura, foco contido, Escape/Fechar, retorno ao acionador/destino útil, fundo inativo, scroll mobile, sem modais aninhados ou fechamento que esconda falha |
| Menu | Enter/Space, setas/typeahead conforme primitiva, Escape e retorno; links preservam abrir em nova aba/modificadores, ação Sair tem resultado confirmado |
| Toast | Sucesso confirmado, nome/descrição, teclado/fechamento/pausa, sem roubar foco ou duplicar anúncio; mensagem crítica e recuperação também persistem no fluxo |
| Catálogo | Aplicar/cancelar/limpar, URL e voltar/recarregar, ordenação preserva critérios/reinicia página, inválido e vazio distintos de falha |
| Carrinho/pedido | Quantidade confirmada e limites, remoção com foco útil, total do servidor, indisponibilidade visível/removível, snapshot histórico preservado |
| Zustand | Consumidores concretos, isolamento SSR/request, snapshot sem divergência, seletores e limpeza na troca de conta; sem autoridade comercial |
| TanStack Query | Query keys/escopo, DTO, isolamento de request, hidratação, stale/refetch/invalidação, cancelamento e cache limpo na troca de conta; 401/403 e resposta antiga não exibem dados privados |
| Leitura/mídia | Loading real e estável, vazio confirmado, erro com saída, imagem ausente/falha com alternativa; sem anunciar skeleton individualmente |
| Responsividade | Desktop/tablet/mobile, conteúdo longo, zoom 200%, reflow, controles alcançáveis e foco não coberto; rolagem local de tabela quando necessária |
| Aparência/acessibilidade | Tokens e estados reais, contraste WCAG 2.2 AA aplicável, ordem/semântica, leitor de tela nos anúncios, foco visível, sem depender de cor/hover/gesto |
| Motion | `prefers-reduced-motion`, operação sem animação, portais/refs/foco e fallback conforme guardian-bay-motion |

## Gates e escopo

- Documentos/skill: validar frontmatter, links locais e coerência com fontes; validação estática não prova descoberta automática em nova sessão nem comportamento em navegador.
- Dependências: `npm ls --depth=0`, inspeção de peers/transitivas e diff do lock; gate `npm run security:dependencies` com triagem e política datada, sem autofix ou mascarar serviço indisponível. Não atualizar pacotes alheios para limpar audit.
- Código futuro: `npm run check`, build via `npm run verify` conforme risco e `git diff --check` / `git diff --cached --check`. Testar lógica própria relevante e comportamento composto; não espelhar internals Radix em unitários.
- Para UI implementada, skill `next-dev-loop` somente com preflight de dev/browser/MCP. Compilar ou fazer probe HTTP não prova teclado/foco, layout ou runtime.
- Reexecutar testes dos fluxos afetados quando substituir protótipos. Adaptar seletores/expectativas visuais ao design aprovado sem remover garantias de segurança/comércio para conseguir passar.
- Integração/segurança quando a mudança cruzar essas garantias: skills e gates locais; `TEST_DATABASE_URL` dedicada validada, nunca produção nem fallback de `DATABASE_URL`. Instalar bibliotecas/criar esta skill não exige migration nem novo banco.
- Handoff: arquivos e decisões, comandos realmente executados, falhas/limitações e o que continua pendente. Não afirmar WCAG, desempenho ou economia de bundle sem medição correspondente.
