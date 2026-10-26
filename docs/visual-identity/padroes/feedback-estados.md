# Padrão de feedback e estados

Identidade vigente em [DESIGN.md](../../../DESIGN.md); sem reconstrução de componentes ou mudanças de motion.
[Índice](../README.md) · [Cores semânticas e acessibilidade](../fundamentos.md) · [Formulários](formularios.md)

Origem: I §§3,6,8,9 e C/feedback, loading-skeleton, empty-state, dialog, button, order-summary e payment-simulation. Aplicar a mesma linguagem em loja, conta e admin; o conteúdo de recuperação depende da página. A proposta N01 define cores, sem dispensar texto ou validação futura.

## Matriz global

| Estado | Tratamento visual e mensagem | Ação e anúncio |
| --- | --- | --- |
| Carregamento inicial real | Skeleton nas áreas esperadas e texto de espera quando útil; manter shell | Anunciar região ocupada uma vez; placeholders não recebem foco |
| Atualização em andamento | Conservar contexto conhecido, sinalizar região ocupada e botão em andamento | Não exibir valor antigo como nova confirmação; não anunciar cada linha |
| Vazio confirmado | Título curto, causa e um próximo passo contextual | Catálogo/primeiro registro quando autorizado; sem ilustrar produto fictício |
| Sem resultado por filtro | Manter critérios e mostrar ausência de correspondência | Limpar/alterar critérios; não confundir com catálogo vazio |
| Erro de campo | Mensagem junto ao campo, contorno e resumo quando útil | Corrigir com foco previsível, conforme Formulários |
| Falha de operação | Explicação junto da ação e orientação recuperável | Repetição manual apenas quando efeito é conhecido e seguro |
| Resultado incerto | Aviso persistente, sem selo de sucesso ou recusa inventada | Consultar registro original antes de nova intenção de compra |
| Sucesso confirmado | Texto objetivo com resultado real; acento semântico discreto | Anunciar uma vez; seguir destino previsto pela página |
| Atenção/indisponibilidade | Mensagem textual persistente junto de item/total/ação | Explicar bloqueio e ajuste possível; não depender de hover |
| Disabled | Aparência menos proeminente, mas texto legível; motivo próximo | Não comunicar seleção/sucesso; não esconder motivo em tooltip inacessível |
| Confirmação de consequência | Dialog breve com recurso afetado e verbo explícito | Cancelar seguro; foco retorna; sem criar confirmação para toda ação trivial |

Skeleton reserva imagem/títulos/linhas por tamanho da página e não pulsa quando movimento reduzido. Falha encerra loading, em vez de manter espera infinita. Não existe tempo de loading artificial para suavizar a experiência.

## Localização e duração

Campo → mensagem local; formulário → resumo e resultado da submissão; item → estado junto ao nome/quantidade; pedido → estado junto à identificação e total. Não espalhar mensagens idênticas pela página. Quando impedimento afeta todo checkout, resumo pode sintetizar o problema e apontar o item, sem repetir o texto inteiro.

Erro crítico, bloqueio comercial, prazo e aviso de simulação não desaparecem automaticamente. Sucesso simples pode ter apresentação discreta, mas a mudança confirmada também precisa aparecer no conteúdo. Não criar sistema de toast como único suporte para ação ou erro; nenhuma fonte exige uma nova central de notificações.

Mensagens informativas/sucesso usam anúncio não interruptivo; erro que demanda correção pode receber anúncio imediato, evitando duplicação entre resumo e campo. Badge tem texto de estado; ícone e cor são complementares. Contagem/timer não é lido a cada segundo.

## Estados de compra e pagamento

“Pedido criado” não equivale a “Pagamento simulado aprovado”. Apresentar os estados abaixo com o mesmo vocabulário em confirmação, histórico e detalhe:

| Situação | Ênfase | Próximo passo |
| --- | --- | --- |
| Pagamento pendente | Informativa e instrução explícita, sem ícone de compra concluída | Aguardar intervalo, confirmar quando elegível ou atualizar leitura |
| Pagamento aprovado | Sucesso confirmado pelo servidor | Consultar pedido; nenhum botão para pagar outra vez |
| Pagamento recusado | Falha de tentativa com orientação clara | Nova revisão/intenção pelo carrinho; não repetir automaticamente |
| Pagamento expirado | Atenção com término de prazo | Consultar estado confirmado e iniciar nova compra se desejado |
| Falha ao consultar/confirmar | Erro operacional, sem inventar estado comercial | Recuperar consulta do mesmo pedido antes de nova tentativa |

Aplicação funcional, prazos e regras permanecem na origem **C/payment-simulation.md** e no [contrato de pagamentos](../../architecture/payments.md), evitando criar uma segunda regra de negócio no DS. Contador é orientação temporal, não aprovação; estoque pode mudar e não há reserva. QR/código permanecem explicitamente fictícios. Histórico legado não ganha método inventado.

## Falhas e acesso

404 prioriza retorno seguro, sem informar se um recurso privado existe. 403 diferencia falta de permissão de sessão ausente/expirada, sem listar papel ou dados internos. Erro inesperado pode repetir leitura, nunca disparar novamente compra. Não oferecer reload como solução automática para toda situação de acesso.

Conflito de edição administrativa diz que conteúdo mudou e pede revisão; não exibir sucesso antes de revalidar. Limitação de tentativas pede aguardar sem sugerir contorno. Não exibir stack trace, credenciais ou payload.

## Revisão do padrão

- [ ] Vazio, erro e espera têm mensagens distintas.
- [ ] Estados têm texto, localização e recuperação coerentes.
- [ ] Pendência/recusa/expiração não parecem compra aprovada.
- [ ] Anúncios não repetem contadores e confirmação de ação não depende só da aparência local.
