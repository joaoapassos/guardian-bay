# Microtransições

[Skill](../SKILL.md) · [Tokens](motion-tokens.md) · [Padrões de interação](../../../../docs/visual-identity/padroes/interacoes.md)

Mudanças locais usam a menor técnica suficiente. Exemplos como Accordion, Tabs, expansão e galeria são condicionais à interface existente/aprovada; a skill não os adiciona ao catálogo ou à Central de Ajuda por rotina.

## Escolha da técnica

| Situação | Preferir | Cuidado |
| --- | --- | --- |
| Hover/focus/pressed e estado de seleção | CSS transition no contorno/opacity adequados | Feedback imediato; foco não depende de animação, contraste continua legível |
| Galeria muda entre imagens disponíveis | Troca local com opacity, área reservada; ViewTransition local só se há benefício demonstrável | Não morphar entidades diferentes nem esperar arquivo opcional para responder ao clique |
| Menu/Drawer/Dialog | Estado e ciclo de montagem do componente existente + transition/keyframes CSS | Preservar foco, Escape, fechamento e background inativo; não implementar outro focus trap |
| Accordion/descrição/campo condicional | Expansão CSS quando compatível, ou abertura direta + reveal discreto | Não garantir interpolação universal de altura auto nem esconder conteúdo focável em caixa de altura zero |
| Mensagem aparece/remove | Conteúdo no fluxo e opacity/reveal breve | Erro/sucesso textual não espera efeito; falha crítica não desaparece sozinha |
| Filtro/Tab substitui conteúdo custoso | Atualização não urgente com Transition quando apropriada; reveal local | Estado do controle responde imediatamente; URL/resultado/loading preservados |
| Carrinho atualiza item/total | Feedback da operação real e pequena mudança local após confirmação | Não animar contagem de preço como se fosse sucesso antes do servidor |
| Lista reordena itens existentes | `key` estável; ViewTransition local/update apenas se aprovado e disponível | Não nomear lista toda nem animar itens fora da viewport |

Transition CSS serve à mudança interpolável de estado já montado. Keyframes expressam sequência de entrada/saída ou movimento direcional específico. Saída de DOM desmontado exige suporte do ciclo de presença do componente, não delay global nem manter controles ocultos acionáveis. Evitar um sistema de presença genérico se o componente existente já resolve.

No Radix instalado, usar estado/atributos e ciclo de montagem do AlertDialog; não duplicar listeners de Escape, controle de foco e desmontagem. Outros primitives Radix não estão necessariamente instalados. Se uma técnica de saída exigir novo pacote, apresentar necessidade concreta, sem instalação automática. CSS/Tailwind existentes e atualização direta são alternativas suficientes em muitos casos.

## React Transition não é animação

`startTransition` sinaliza trabalho não urgente e não retorna Promise de conclusão. `useTransition` permite acompanhar pending do trabalho associado, mas não de toda aplicação. Não envolver digitação de input controlado, foco, pressed ou abertura/fechamento urgente só para ativar ViewTransition. Se a seleção dispara lista pesada, atualizar controle primeiro e considerar processamento da lista separadamente.

Estado após operação assíncrona pode precisar de novo escopo de Transition conforme a API da versão; `setTimeout` não herda esse escopo. Não usar o scheduling para atrasar resultado comercial, esconder fallback necessário ou definir ordem de respostas antigas. Pedido A lento não pode sobrescrever intenção B mais recente; cancelar/ignorar trabalho obsoleto quando o fluxo permitir, sem repetir mutation.

Para ViewTransition local, escolher boundary pequena e ativação necessária (`enter`/`exit`/`update`) com `default="none"`. Não gerar compartilhamento de página por nome se a tarefa é só atualização local. Usar CSS direto quando ViewTransition, prefetch e identidade não acrescentarem nada. Respeitar limite de um dono da transição de página e suprimir motion local dispensável durante efeito global.

## Layout e visibilidade

Preferir transform/opacity. Altura/posicionamento reais exigem layout; reservar área de mídia e evitar medir a cada frame. Se um componente precisa de dimensão medida, justificar, ler em lote uma vez e escrever depois; verificar resize/interrupção em vez de repetir getBoundingClientRect a cada render. Não animar `max-height` com valor enorme que produz atraso variável. Recursos novos de CSS para altura exigem detecção/fallback.

Colapsar região não deixa seus links/campos recebendo Tab nem expõe texto invisível a tecnologias assistivas indevidamente. Manter semântica expandido/selecionado; foco retorna ao acionador no fechamento. Reduced motion elimina deslocamento e duração/delay dispensáveis, liberando saída sem esperar `transitionend`.

## Critérios específicos

- Entrada, foco e resultado da operação permanecem imediatos.
- Mudanças rápidas convergem ao último estado real sem filas de animações ou alturas presas.
- Mesmo controle compartilha Tokens entre desktop/mobile; toque não depende de hover.
- Componente fechado/desmontado não recebe foco nem deixa scroll lock, listener ou timer residual.
- Sem API/sem animação, informação e operação continuam completas.

Referência sobre agendamento: [React startTransition](https://react.dev/reference/react/startTransition). Requisitos visuais/acessíveis são os do projeto, não uma receita de biblioteca externa.
