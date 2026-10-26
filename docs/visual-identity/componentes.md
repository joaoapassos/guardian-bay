# Aplicação aos componentes

Identidade vigente: [Boundary Supply adaptada](../../DESIGN.md). Preservar composição e comportamento existentes; descrições cromáticas cedem aos [Fundamentos](fundamentos.md).
[Índice e fontes](README.md) · [Fundamentos](fundamentos.md) · [Páginas](paginas.md)

Inventário completo: **26 componentes**, analisados individualmente. Cada “Origem C” identifica um arquivo na pasta externa definida no índice; não é link relativo para fora do repositório. Função e variação vêm dos estudos; esta página acrescenta sua aplicação visual, sem repetir contratos funcionais.

## Regras de composição

Navegação compartilha seleção/foco e IBM Plex Sans; campos, botões e quantidade compartilham medidas N06; mensagens compartilham N01 e a matriz de estados; comércio compartilha imagem neutra e hierarquia de valores. Usar [Fundamentos](fundamentos.md) como fonte única de valores e os [padrões](README.md) para comportamento transversal.

Tamanhos regular/ênfase dos controles vêm de N06; não criar tamanho compacto administrativo que diminua alvos ou texto. Conteúdo pode expandir altura. Painéis e dados usam limites N05, sem largura fixa no mobile. Componentes não interativos não recebem estado hover/disabled artificial; quando a seção menciona interação, aplicar também foco e teclado do padrão global.

## Header

**Origem C:** `header.md`. Função visual: ancorar marca e acesso à exploração. Logo preto sobre base clara, links em Sans e grupo utilitário alinhado; não colorir cada item com uma cor da paleta. Variantes global e checkout simplificado mantêm proporções e estados da mesma família.

Dimensionar busca e acessos pelos controles regulares, respeitando tamanho final de logo ainda pendente. Desktop organiza marca/navegação/busca/utilidades; tablet reorganiza antes de comprimir; mobile agrupa em Mobile Navigation. Foco, item atual e aberto são distintos; contador carregando não mostra zero. Aplicar [Navegação](padroes/navegacao.md). O Header global inclui User Menu e Mobile Navigation mesmo quando a página só lista Header.

## Footer

**Origem C:** `footer.md`. Função visual: encerrar experiência e oferecer apoio. Grupos com títulos utilitários, links menores que H2 e espaço entre assuntos. Base branco ou bloco preto reverso conforme paleta; usar neutros da referência. Variante compacta do checkout conserva ajuda/políticas, sem competir com confirmar.

Colunas em desktop e grupos empilhados em mobile/tablet estreito, sem esconder links em interação obrigatória. Mesmo foco/hover dos links globais. Não criar newsletter, contatos fictícios ou faixa promocional. Ver [Navegação](padroes/navegacao.md).

## Mobile Navigation

**Origem C:** `navegacao-mobile.md`. Função visual: manter os destinos do Header legíveis em painel compacto. Título, links alinhados e Fechar em posição previsível; categorias como expansão dentro do mesmo painel, sem estilo visual diferente da navegação principal.

Usar a largura de Drawer N05 e os alvos regulares; listas podem rolar. Estado aberto e grupo expandido devem ser perceptíveis; falha/vazio de categorias não removem os demais acessos. Não criar navegação alternativa por gesto. Aplica [Navegação](padroes/navegacao.md) e [Interações](padroes/interacoes.md).

## User Menu

**Origem C:** `menu-de-usuario.md`. Função visual: agrupar conta/saída com baixa disputa. Painel elevado de contorno discreto, links em Sans e ação Sair claramente identificada. Visitante e autenticado usam a mesma família visual, sem mostrar dados de sessão.

Desktop usa dropdown acionável; mobile integra grupo ao painel existente, sem modal sobre modal. Linhas seguem tamanho regular, não chips pequenos. Aberto/atual/saída em andamento e falha usam padrões globais; não inventar aparência de sucesso no logout. Ver [Navegação](padroes/navegacao.md).

## Account Navigation

**Origem C:** `navegacao-de-conta.md`. Função visual: orientar a área pessoal sem competir com Header. Destinos em Sans, seleção preto acompanhada de forma/peso e rótulo de área. Não criar abas de tamanhos e semânticas diferentes a cada página.

Desktop lateral; tablet/mobile lista acima do conteúdo com seleção visível. Medidas de navegação N05/N06, sem quebrar nomes de forma ambígua. Detalhe de pedido mantém Pedidos ativo. Aplicar [Navegação](padroes/navegacao.md).

## Admin Sidebar

**Origem C:** `sidebar-administrativa.md`. Função visual: identificar claramente operação administrativa preservando a marca. Tinta e neutros na estrutura, preto na seleção e marca; sem tema paralelo, textura ou cores diferentes por área. Título Administração não usa o tamanho editorial da Home.

Desktop usa largura auxiliar N05; tablet/mobile migram para Drawer. Seleção de área persiste em detalhe/edição, foco e saída seguem padrão comum. Itens usam alvos regulares; não reduzir tipografia para incluir mais áreas. Somente quatro áreas principais deste planejamento, sem CMS. Ver [Navegação](padroes/navegacao.md).

## Breadcrumb

**Origem C:** `breadcrumb.md`. Função visual: orientação secundária acima do título. Metadados/links discretos, item atual em tinta, separadores sem ênfase; não competir com H1 nem virar uma segunda barra de navegação.

Uma família para loja/conta/admin. Quebrar linha em telas estreitas sem truncar nome atual; alvos dos links respeitam acessibilidade sem aumentar o peso visual do conjunto. Hover/foco e página atual seguem [Navegação](padroes/navegacao.md); não inventar estado loading independente quando contexto já é conhecido.

## Button

**Origem C:** `button.md`. Função visual: indicar ação e prioridade. Primário: fundo âmbar/texto preto; secundário: contorno preto, texto preto, fundo claro; terciário: texto reconhecível como ação/link. Destrutivo usa consequência explícita e acento de erro N01 quando necessário, sem virar novo estilo de compra.

Regular para formulários/navegação utilitária; ênfase N06 apenas em ação de compra quando justificada. Hover/foco/active/loading/disabled seguem [Interações](padroes/interacoes.md), sem inventar cores clareadas. Não trocar o botão de lugar/tamanho ao mostrar progresso. Em mobile pode preencher largura se reduzir ambiguidade; secundário continua acessível. Link de navegação não perde semântica para parecer botão.

## Form Field

**Origem C:** `form-field.md`. Função visual: dar unidade a inputs, select, checkbox, radio group e textarea. Rótulo em Sans, conteúdo legível, ajuda em metadados e erro associado. Superfície elevada e contorno de controle N03, diferente da borda decorativa do painel.

Campos de linha usam altura regular; textarea cresce pelo conteúdo. Estados preenchido/somente leitura/disabled/erro/foco são distintos, com foco ainda visível no erro. Checkbox/radio usam indicador de seleção além da cor; sem desenhar aparência diferente por módulo. Mobile uma coluna; demais tamanhos agrupam somente campos relacionados. Aplicar integralmente [Formulários](padroes/formularios.md).

## Dialog

**Origem C:** `dialog.md`. Função visual: concentrar decisão breve ou formulário curto. Superfície clara, título utilitário, descrição e ações com hierarquia; sem fotografia editorial. Limites de largura, raio e espaçamento N05/N06, nunca dimensão fixa maior que tela.

Confirmação destrutiva explicita consequência; edição breve segue Form Field. Fechado/aberto/enviando/erro seguem [Interações](padroes/interacoes.md). Mobile conserva Fechar/Cancelar e conteúdo rolável; ações podem empilhar mantendo ordem de leitura. Formulário longo não migra para Dialog só para reutilizá-lo. Não aninhar confirmação sobre outro modal.

## Drawer

**Origem C:** `drawer.md`. Função visual: trazer navegação/filtros ao contexto compacto. Usa a mesma superfície, raio e foco de Dialog, mas ocupa a lateral/largura disponível sem aparentar uma nova página. Título e Fechar precedem conteúdo; ações de filtro ficam alcançáveis.

Variantes são conteúdo de navegação, filtros e admin, não três estéticas. A largura N05 é referência para navegação; filtro pode usar espaço disponível para rótulos/erros. Rascunho e seleção aplicada distinguem-se pelo texto das ações. Estados/fechamento em [Interações](padroes/interacoes.md); organização em [Navegação](padroes/navegacao.md).

## Feedback

**Origem C:** `feedback.md`. Função visual: sinalizar informação, aviso, erro ou sucesso de forma consistente. Alert usa texto e contorno/acento semântico N01 em superfície clara; badge é compacto, com rótulo visível, sem transformar todos os estados em botões.

Mesmo significado usa mesma combinação semântica em loja/conta/admin. Tamanho do texto segue corpo/metadados, sem recortar instrução em mobile. Não acumular ícone, borda grossa e fundo saturado para a mesma mensagem. Sucesso/erro/atenção e duração estão na matriz de [Feedback e estados](padroes/feedback-estados.md). Não criar hover/disabled para badge informativo.

## Loading e Skeleton

**Origem C:** `loading-skeleton.md`. Função visual: indicar espera real sem deslocar layout. Blocos neutros correspondem à imagem/título/linhas, nunca produtos ou números plausíveis. Mantém o espaço do conjunto em cada grid e o shell disponível.

Usos em lista, grid, formulário e detalhe compartilham linguagem; não precisam de tamanhos arbitrários de spinner. Skeleton não recebe foco nem anúncio individual. Ao falhar, substituir por erro; ao concluir, apresentar conteúdo sem animação teatral. Movimento reduzido remove pulso dispensável. Ver [Feedback e estados](padroes/feedback-estados.md).

## Empty State

**Origem C:** `empty-state.md`. Função visual: explicar ausência confirmada e orientar. Título utilitário, explicação curta e uma ação adequada, sem arte obrigatória. Não tomar a altura da tela se vazio pertence a um painel/lista.

Busca sem resultado, carrinho vazio e primeiro registro usam o mesmo padrão com textos contextuais. Mobile quebra o texto e conserva o CTA; desktop não adiciona uma nova seção fotográfica. Não usar semântica de erro para simples ausência. Ver [Feedback e estados](padroes/feedback-estados.md).

## Pagination

**Origem C:** `pagination.md`. Função visual: continuidade discreta após resultados. Página atual usa seleção preto com forma adicional; links e limites seguem controles regulares, sem reduzir alvo para caber todos os números.

Mesmo padrão em catálogo, conta e admin. Mobile reduz números, mantendo anterior/atual/próxima; tablet conforme espaço. Estado atual não é hover; loading e erro não apagam filtros. Aplicar contexto de URL e foco em [Navegação](padroes/navegacao.md).

## Quantity Control

**Origem C:** `quantity-control.md`. Função visual: manter quantidade próxima do preço e produto. Campo numérico e diminuir/aumentar compartilham altura e contorno de Form Field, sem botões decorativos minúsculos.

Produto e carrinho usam a mesma família; limite/erro fica junto ao controle em texto. Quantidade atualizada depende de confirmação, e foco não é transferido ao resumo após cada toque. Mobile mantém controles tocáveis, podendo quebrar linha; tablet/desktop alinham à composição comercial. Ver [Formulários](padroes/formularios.md) e [Feedback](padroes/feedback-estados.md).

## Price Display

**Origem C:** `price-display.md`. Função visual: comparar valores sem ruído. Tinta e Sans com papéis preço unitário/total de N04; moeda e rótulo completos. Alinhar valores por função em listas/resumos; não estilizar como selo promocional.

Unitário/subtotal/total usam a mesma estrutura com ênfase progressiva; referência inelegível é rotulada, sem preço riscado que sugira desconto. Mobile quebra conteúdo sem cortar valor alto. Carregamento/ausência não viram zero; atualização informa mudança confirmada. Sem hover independente ou efeitos de contagem animada. Ver [Feedback](padroes/feedback-estados.md).

## Product Card

**Origem C:** `product-card.md`. Função visual: destacar produto e levar ao detalhe. Área de imagem neutra N08, nome em Sans, preço em tinta e disponibilidade relevante como texto/badge. Hierarquia imagem → nome → preço → informação de disponibilidade, com mesmo espaçamento em Home/catálogo.

Sem variante promocional nem controles de compra no card. Hover/foco reforçam destino sem zoom, troca obrigatória de foto ou informação escondida. Nome pode quebrar; não reduzir fonte para forçar duas linhas. Largura vem do grid em cada faixa, não de um tamanho fixo de card. Sem estoque continua reconhecível, sem opacidade na foto que distorça produto. Ver [Mídia](fundamentos.md#midia).

## Product Grid

**Origem C:** `product-grid.md`. Função visual: ritmo e comparação consistentes. Mesmo card, proporção de estudo e espaçamento N05 nos dois usos; Home não ganha moldura ou ornamentação de vitrine diferente.

Contagens de colunas são as de [Containers e grids](fundamentos.md#containers-e-grids); Home tablet adaptativo e catálogo tablet três permanecem distintos por requisito. Loading reserva posições; vazio/erro substituem a área de resultados sem derrubar shell e contexto. Ordem visual e leitura coincidem. Não introduzir scroll horizontal/carrossel como versão mobile.

## Product Gallery

**Origem C:** `product-gallery.md`. Função visual: exame fiel, sem competir com compra. Imagem principal contida em superfície neutra; miniaturas, quando disponíveis/aprovadas, têm seleção em contorno e não dependem de hover.

Uma imagem e placeholder são necessidades atuais; múltiplas/zoom continuam condicionais. Dimensão responde à coluna de produto; mobile antecede informações. Loading/ausência/falha preservam área legível sem inventar foto. Não aplicar textura, filtro artístico ou recorte para parecer editorial. Enquadramento em [Mídia](fundamentos.md#midia); eventual ampliação segue [Interações](padroes/interacoes.md).

## Product Filters

**Origem C:** `product-filters.md`. Função visual: mostrar refinamento sem disputar protagonismo com produtos. Grupos nomeados, controles de Form Field, seleção visível e Limpar de prioridade secundária. Não criar slider exclusivo se entrada de preço cobre o requisito.

Lateral desktop, recolhível tablet e Drawer mobile; mesma ordem de campos e critérios em todas as versões. Erro de faixa e rascunho pendente ficam junto ao grupo; Aplicar é principal no painel, sem cor promocional. As regras de cancelamento são de [Interações](padroes/interacoes.md), contexto/URL de [Navegação](padroes/navegacao.md).

## Product Sort

**Origem C:** `product-sort.md`. Função visual: controle utilitário junto da contagem, abaixo do título e antes do grid. Reutiliza select de Form Field; não criar menu estilizado como outra família de botões.

Mesmo tratamento nos quatro contextos de catálogo; mobile pode ocupar linha própria sem esconder quantidade de resultados. Atual/aberto/foco/carregando/falha seguem seleção e feedback globais. Critério padrão continua proposta de produto na origem; o DS não aprova regra de Novidades. Ver [Navegação](padroes/navegacao.md).

## Order Summary

**Origem C:** `order-summary.md`. Função visual: conferir composição e reconhecer total/próximo passo. Rótulos alinhados, valores em tinta, separação antes do total e aviso próximo à ação. Painel elevado só quando ajudar a separar do conteúdo, sem textura.

Carrinho elegível, revisão e histórico em leitura compartilham estrutura; estado muda mensagem, não identidade. Desktop pode ficar lateral; tablet/mobile passa ao fluxo após itens. Não usar sticky que cubra foco ou último campo. Valor não confirmado, pendência e histórico seguem [Feedback](padroes/feedback-estados.md); Price Display fornece hierarquia, sem nova escala exclusiva.

## Cart Item

**Origem C:** `cart-item.md`. Função visual: reconhecer item e ajustar seleção. Foto menor que galeria, nome/preço legíveis, quantidade e remover em grupo. Separação por espaço/borda decorativa, evitando um painel pesado para cada linha.

Versão editável usa Quantity Control; revisão/histórico usam rótulos estáticos, sem controles disabled que insinuem edição. Indisponível mantém nome/foto/remoção visíveis e texto de impedimento. Desktop em linha; tablet adapta; mobile empilha. Estado não muda preço histórico para atual. Ver [Feedback](padroes/feedback-estados.md) e [Interações](padroes/interacoes.md).

## Data List

**Origem C:** `data-list.md`. Função visual: comparação e reconhecimento de registros. Cabeçalhos/metadados discretos, informação principal em tinta, valores alinhados e ação explícita. Publicação e estoque são colunas/rótulos distintos, não um único semáforo.

Desktop tabela quando comparação importa; mobile registros com rótulos e mesma informação essencial. Tablet pode usar rolagem local indicada se necessário. Densidade aumenta por organização/colunas, sem miniaturizar fonte ou alvo. Vazio/erro/loading seguem [Feedback](padroes/feedback-estados.md); não criar exportação/seleção em massa nem revelar dados pessoais para completar coluna.

## Payment Simulation

**Origem C:** `payment-simulation.md`. Função visual: separar método fictício, instrução, estado e confirmação. Aviso de simulação persistente; métodos em radio group e campos de Form Field. Códigos em Mono somente quando ajuda a copiar/ler referência; total continua Sans.

Checkout seleciona método; confirmação/detalhe apresentam tentativa existente; perfil administra fixtures mascaradas. Não criar cartões com aparência de banco real. QR/código e alternativa textual têm mesma importância de acesso; mobile quebra referências longas e mantém Copiar/Confirmar identificáveis.

Estados pendente/aprovado/recusado/expirado usam [Feedback](padroes/feedback-estados.md), sem grande fotografia editorial celebratória ou countdown de urgência. Contador não recebe foco nem fala a cada segundo. Admin de pedido não ganha essa interação de pagamento: apenas consulta conforme sua página.
