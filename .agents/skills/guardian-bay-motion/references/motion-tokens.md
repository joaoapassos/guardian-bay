# Tokens conceituais de motion

[Skill](../SKILL.md) · [Fundamentos visuais](../../../../docs/visual-identity/fundamentos.md)

Centralizar aqui escolhas de tempo/curva para esta skill; páginas não recebem números próprios. São **propostas iniciais**, não tokens já implementados. A IDV orienta movimento geralmente entre 150 e 220 ms e o design consolidado prefere 180 ms. Preservar esse caráter: não importar a receita de morph com blur/400 ms da referência genérica.

## Durações

| Token | Valor inicial | Aplicação |
| --- | --- | --- |
| instant | 0 ms | Input, foco, confirmação textual urgente, fallback e movimento reduzido |
| fast | 150 ms | Saída breve e mudança discreta de estado |
| normal | 180 ms | Troca local, galeria e revelação curta |
| context | 220 ms por fase | Entrada/saída da Curtain ou limite inicial do morph de elemento |

Contexto não significa espera mínima nem timeout de dados. Curtain com duas fases tem até 440 ms de movimento inicial; sem dwell se destino já está pronto. Usar o valor mais curto que comunique a relação; reduzir/dispensar o padrão se acrescentar latência percebida. Medir em dispositivo real antes de ampliar. Não somar efeitos locais ao movimento global para justificar duração longa.

## Curvas

| Token | Proposta | Função |
| --- | --- | --- |
| enter | cubic-bezier(0, 0, 0.2, 1) | Chegada que termina suavemente |
| exit | cubic-bezier(0.4, 0, 1, 1) | Saída breve |
| move | cubic-bezier(0.4, 0, 0.2, 1) | Mudança espacial local e cortina |
| morph | cubic-bezier(0.4, 0, 0.2, 1) | Continuidade de uma entidade; pode reutilizar move |

Não criar curva exclusiva por tela. Estados ativos/pressed não ganham bounce, overshoot ou tremor. Reduced motion remove deslocamento/scale/clip e delay; feedback textual e foco permanecem imediatos.

## Propriedades e prioridade

- **Opacity:** transição de conteúdo local, sem reduzir contraste de texto essencial parado nem esconder erro crítico.
- **Translate:** até 8 px como referência inicial de reveal local; Drawer percorre seu painel e Curtain a viewport, somente nos padrões escolhidos.
- **Scale:** geometria do morph calculada pelo mecanismo; não ampliar produto em hover nem esmagar imagem para preencher retângulo.
- **Clip/reveal:** apenas se necessário para composição estável; evitar custo de paint/máscara e preferir fallback quando não houver benefício mensurável.

Prioridade: interação imediata → mudança local → continuidade visual → contexto. Esse ranking protege responsividade: uma transição global não adia input/resultado de operação. Um padrão de página domina visualmente; não animar simultaneamente filtros, Header e todos os cards.

## Proteção da cortina

Proposta de **limite de oclusão de 5 s**, independente das durações acima. Não é prazo da requisição nem simulação de progresso. Ao alcançar o limite, remover máscara/interdição e mostrar o fallback/erro acessível da navegação ainda em andamento. Não cancelar compra nem repetir navegação. Esse limite precisa ser validado na futura experiência, inclusive com aba em background; a recuperação não pode depender só de um timer ou de `animationend`.

Cores e wordmark vêm de DESIGN/IDV: cortina sólida azul de marca, wordmark creme em Fraunces 800 caixa alta; sem nova imagem, textura ou dependência. Loading discreto indica apenas pendência real depois de cobrir. Ausência da fonte final não justifica baixar ou instalar fontes nesta Task.
