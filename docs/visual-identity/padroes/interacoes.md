# Padrão de interações

Identidade vigente em [DESIGN.md](../../../DESIGN.md); sem reconstrução de componentes ou mudanças de motion.
[Índice](../README.md) · [Foco, medidas e movimento](../fundamentos.md) · [Feedback](feedback-estados.md)

Origem: I §§3,6,8,9; C/button, form-field, product-card, dialog, drawer e navegação. Valores de foco e movimento pertencem a Fundamentos. Esta página define o que muda, como a pessoa percebe a mudança e como sair de cada interação.

## Hover, foco, ativação e seleção

| Situação | Tratamento |
| --- | --- |
| Hover | Reforçar affordance por sublinhado no texto ou contorno mais evidente; não alterar conteúdo/medidas nem criar nova cor por página |
| Foco de teclado | Indicador independente do hover conforme N02; nunca usar remoção de contorno como estilo |
| Ativação | Resposta discreta no contorno/ênfase, seguida de progresso se operação esperar; sem deformar imagem ou deslocar layout |
| Seleção | Nome/indicador persistente e forma além da cor; foco pode estar em outro item sem apagar seleção |
| Disabled | Motivo textual alcançável e aparência coerente; não usar hover que sugira operação permitida |

Ações com aparência de botão usam transição de cores de 300 ms; movimento reduzido a remove. A Curtain deforma somente a superfície em escala vertical entre0.96 e1.08, com largura integral e base curva durante deslocamento; o estado coberto usa overscan opaco.

Botão principal mantém contraste da dupla de cores; hover pode sublinhar o rótulo, sem inventar tom clareado. Links textuais mantêm affordance reconhecível mesmo fora do hover. Cards podem reforçar o link/contorno, mas nunca esconder nome, preço, disponibilidade ou ação até apontar o mouse.

Uma ativação intencional inicia ação; foco, seleção, abertura de página ou passar mouse não executam operação sensível. Touch possui os mesmos acessos sem exigir hover ou gesto não documentado. Não acrescentar swipe para remover item ou abrir compra rápida.

## Dialog e Drawer

| Momento | Regra compartilhada | Particularidade |
| --- | --- | --- |
| Abrir | Identificar título/contexto, levar foco a conteúdo útil e tornar fundo inativo se modal | Confirmação destrutiva começa pela ação segura; Drawer inicia pelo título/primeiro controle útil |
| Navegar | Foco permanece na sobreposição modal; conteúdo rola internamente se necessário | Não deixar ação principal/Fechar fora do alcance em mobile |
| Fechar/cancelar | Escape e botão visível; retornar foco ao acionador ou destino útil se ele deixou de existir | Cancelar filtros descarta rascunho e mantém aplicação anterior |
| Aplicar/salvar | Indicar andamento; evitar envio repetido; aguardar resposta | Filtrar aplica seleção/URL; salvar só atualiza registro confirmado |
| Falhar | Manter contexto e mensagem próxima; permitir correção/saída segura | Não esconder falha em fechamento automático |

Clique externo pode fechar navegação/filtro sem alterações. Com formulário alterado, não descartar conteúdo silenciosamente; explicar descarte quando relevante. Não abrir confirmação sobre outro Dialog: manter aviso e escolhas no mesmo painel ou concluir seu fechamento antes de uma nova sobreposição. Formulário longo pertence ao fluxo da página.

Durante envio, não encerrar apenas para aparentar sucesso. Se for temporariamente necessário evitar descarte, explicar progresso, manter foco e oferecer saída assim que houver resultado conhecido. Falha de leitura não pode prender a pessoa em painel sem fechamento.

## Atualizações e feedback de ação

Troca de imagem mantém foco na miniatura selecionada e identifica nova imagem. Alterar quantidade mantém contexto do produto; servidor pode rejeitar valor e a interface mostra quantidade confirmada. Remover item move foco ao próximo registro ou título, sem devolver ao início global.

Aplicar filtros/ordenar informa atualização e conserva critérios; não transformar toda mudança em modal. Adicionar ao carrinho mostra andamento/sucesso local, sem abrir automaticamente checkout. Resultado incerto não é resolvido por animação otimista; seguir [Feedback e estados](feedback-estados.md).

## Movimento e preferências

Na mudança entre Administração e Loja/Minha Conta, a Curtain usa fases de entrada e saída de 500 ms, com deslocamento vertical simples, sem squash/stretch ou deformação da superfície. Navegação e revogação começam imediatamente; a superfície permanece coberta enquanto o conteúdo crítico do destino não sinaliza prontidão. O controlador raiz observa links internos e mudanças efetivas de contexto, incluindo redirects e histórico; ContextLink não é requisito. A scrollbar é ocultada antes da entrada e restaurada após a saída. Escape/Continuar navegação, movimento reduzido e watchdog de 5 s liberam a interface. Documentos completos recuperam somente um marcador de contexto em sessionStorage, sem guardar conteúdo privado.

Usar a transição discreta de Fundamentos em contorno, seleção e entrada/saída de painel. Não usar parallax, zoom em foto, bounce, carregamento decorativo contínuo ou efeito que altere percepção do produto. Ação não espera animação terminar para apresentar resultado.

Com preferência por movimento reduzido, remover deslocamento/pulso dispensável e manter mudança de estado direta, texto de progresso e foco. Não usar movimento como único indicador de loading ou sucesso. Contador informa prazo real; não piscar, dramatizar urgência nem interromper leitura a cada segundo.

## Revisão do padrão

- [ ] Hover, foco e seleção são distinguíveis e funcionam em teclado/touch.
- [ ] Sobreposições têm entrada, saída e retorno de foco, sem modais aninhados.
- [ ] Conteúdo crítico e ações não dependem de gesto oculto ou movimento.
- [ ] Movimento reduzido preserva informação e resultado não confirmado não vira sucesso visual.
