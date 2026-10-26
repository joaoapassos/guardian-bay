# Aplicação às páginas

Identidade vigente: [Boundary Supply adaptada](../../DESIGN.md). Preservar composição e comportamento existentes; descrições cromáticas cedem aos [Fundamentos](fundamentos.md).
[Índice e fontes](README.md) · [Fundamentos](fundamentos.md) · [Componentes](componentes.md)

Inventário completo: **27 páginas**, com seis agrupamentos documentais que não definem rotas ou arquitetura. Cada “Origem P” identifica o arquivo na pasta externa de páginas descrita no índice. Este documento aplica hierarquia, composição e linguagem visual; o estudo de origem mantém o comportamento funcional detalhado e suas pendências.

## Composicoes compartilhadas

- **Shell loja:** [Header](componentes.md#header) e [Footer](componentes.md#footer). Header inclui [Mobile Navigation](componentes.md#mobile-navigation) e [User Menu](componentes.md#user-menu) quando aplicáveis, mesmo sem repetição nas listas de origem.
- **Shell checkout:** variações simplificada/compacta dos mesmos Header/Footer, sem navegação promocional. Progresso é orientação visual da mesma experiência, não novas páginas.
- **Shell conta:** shell loja e [Account Navigation](componentes.md#account-navigation); área ativa permanece reconhecível em detalhe.
- **Shell admin:** [Admin Sidebar](componentes.md#admin-sidebar) e [Drawer](componentes.md#drawer) em telas compactas; sem Header comercial nem Footer promocional.
- **Estado global:** [Feedback](componentes.md#feedback), [Loading e Skeleton](componentes.md#loading-e-skeleton) e [Empty State](componentes.md#empty-state) somente conforme a situação prevista. Não acrescentar estado vazio a documento estático por rotina.

Cada entrada usa os [fundamentos](fundamentos.md) sem redefinir valores: I/N04 para tipografia, N05 para espaço/largura, N06 para controles, N07 para faixas e N08 para estudo de mídia. Famílias de páginas têm a mesma escala; diferenças abaixo refletem a tarefa e a intensidade artística, sem criar temas por módulo.

## Loja — 6 paginas

### Home

**Origem P:** `loja/home.md`. Papel: apresentar marca e dar entrada na exploração.

Composição/hierarquia: shell loja → um banner estático com título/mensagem/CTA → produtos → acesso ao catálogo completo → Footer. O banner usa H1 editorial e arte com área segura; o grid volta imediatamente à limpeza comercial, sem painel fotográfico atrás dos cards. Base branca, marca preta e CTA âmbar; neutros nos apoios.

Componentes: shell loja; [Button](componentes.md#button), [Product Grid](componentes.md#product-grid), [Product Card](componentes.md#product-card), [Price Display](componentes.md#price-display) e estados de leitura. Desktop quatro colunas; tablet adaptativo; mobile duas, com mensagem e CTA do banner intactos. Sem arte, a hierarquia tipográfica mantém apresentação; quantidade/recorte dos produtos continuam pendentes. Sem novas seções ou carrossel.

### Catalogo

**Origem P:** `loja/catalogo.md`. Papel: explorar todos/categoria/pesquisa/novidades no mesmo padrão.

Composição/hierarquia: breadcrumb → H1 utilitário e descrição contextual → refinamento/contagem/ordem → grid → paginação. Produtos recebem a maior área; filtros têm peso utilitário, sem blocos artísticos. Tinta em nomes/preços e preto em links/seleções, sem aparência de campanha diferente para Novidades.

Componentes: shell loja; [Breadcrumb](componentes.md#breadcrumb), [Form Field](componentes.md#form-field), [Product Filters](componentes.md#product-filters), [Product Sort](componentes.md#product-sort), [Product Grid](componentes.md#product-grid), [Product Card](componentes.md#product-card), [Price Display](componentes.md#price-display), [Pagination](componentes.md#pagination), [Drawer](componentes.md#drawer) e estados de lista.

Desktop quatro colunas/filtros laterais; tablet três/recolhíveis; mobile duas/Drawer. Pesquisa/filtros/ordem/página continuam visíveis e restauráveis; os quatro contextos não ganham estilos de card distintos. Sem resultado mantém orientação e critério em vez de uma grande arte vazia.

### Detalhes do produto

**Origem P:** `loja/produto.md`. Papel: informar e apoiar intenção de compra.

Hierarquia: breadcrumb → imagem → nome → preço → disponibilidade/quantidade → adicionar → descrição/especificações. Título em Sans, valores em tinta, principal em preto; galeria neutra sem interferência de fotografia editorial. Informações técnicas usam subtítulos/listas, Mono só quando ajuda um dado real.

Componentes: shell loja; [Breadcrumb](componentes.md#breadcrumb), [Product Gallery](componentes.md#product-gallery), [Price Display](componentes.md#price-display), [Quantity Control](componentes.md#quantity-control), [Button](componentes.md#button), feedback e loading. Desktop galeria/compra adjacentes; tablet empilha quando necessário; mobile segue sequência hierárquica antes da descrição. Disponibilidade junto à ação, sem fade no produto; múltiplas mídias/zoom/variantes não são introduzidos pelo DS.

### Carrinho

**Origem P:** `loja/carrinho.md`. Papel: revisar seleção e resolver impedimentos.

Hierarquia: título utilitário/contagem → itens → bloqueios e total elegível → checkout. Base clara e arte mínima; total usa ênfase de preço, não título Fraunces. Item indisponível conserva legibilidade e remoção; impedimento aparece antes de avançar, sem depender de badge colorido.

Componentes: shell loja; [Cart Item](componentes.md#cart-item), [Quantity Control](componentes.md#quantity-control), [Price Display](componentes.md#price-display), [Order Summary](componentes.md#order-summary), [Button](componentes.md#button) e estados de lista/operação. Desktop itens/resumo em colunas; tablet adapta; mobile itens em blocos/resumo no fluxo. Subtotal elegível não parece total de compra parcial; ausência de frete não vira etiqueta de grátis.

### Checkout

**Origem P:** `loja/checkout.md`. Papel: orientar confirmação consciente de compra simulada.

Hierarquia: shell checkout/progresso → identificação → endereço/entrega condicionados → revisão → método/total → confirmar. Tudo em Sans, superfície limpa e sem textura/arte; preto identifica ação/etapa, acento semântico só em aviso pertinente. Progresso não tem aparência de abas comerciais e não oculta a etapa atual.

Componentes: shell checkout; [Form Field](componentes.md#form-field), [Button](componentes.md#button), [Order Summary](componentes.md#order-summary), [Cart Item](componentes.md#cart-item) em leitura, [Price Display](componentes.md#price-display), [Payment Simulation](componentes.md#payment-simulation), feedback/loading. Desktop etapas/resumo adjacentes; tablet adapta; mobile coluna única com total antes da confirmação. Dados, entrega e efeito financeiro ainda não definidos continuam condicionantes, não campos fictícios publicados. Mudança comercial e resultado incerto são avisos persistentes, sem animação de sucesso antecipada.

### Confirmacao do pedido

**Origem P:** `loja/confirmacao-do-pedido.md`. Papel: explicar criação e estado real.

Hierarquia: referência/estado → próximo passo de pagamento quando houver → resumo histórico → navegação. Título utilitário e estado textual em vez de grande celebração automática; sucesso semântico só para aprovação confirmada. Aviso de simulação fica junto do resultado, sem parecer cobrança real.

Componentes: shell loja; [Feedback](componentes.md#feedback), [Button](componentes.md#button), [Order Summary](componentes.md#order-summary), [Price Display](componentes.md#price-display), [Payment Simulation](componentes.md#payment-simulation) e loading. Desktop conteúdo contido; tablet/mobile empilhados. Referências longas quebram e têm alternativa de cópia; pendente, recusado e expirado não compartilham ícone de compra concluída.

## Autenticacao — 3 paginas

Família visual: shell loja, H1 utilitário, formulário contido de N05, base branco, campos elevados e CTA âmbar com texto preto. [Form Field](componentes.md#form-field), [Button](componentes.md#button) e [Feedback](componentes.md#feedback) compartilham os mesmos estados nas três páginas. Aplicar [Formulários](padroes/formularios.md); não trocar cor ou fonte entre entrar/criar/recuperar.

### Login

**Origem P:** `autenticacao/login.md`. Papel: entrar e retomar contexto permitido.

Hierarquia: marca/título → e-mail/senha → Entrar → recuperação/cadastro/ajuda. Arte institucional estática pode ficar lateral no desktop, subordinada ao formulário; tablet reduz, mobile prioriza campos e pode omitir decoração. A arte não é fundo texturizado do campo nem requisito para entender a tarefa. Erro aparece no grupo de credenciais sem deslocar rótulos e sem revelar conta.

### Cadastro

**Origem P:** `autenticacao/cadastro.md`. Papel: criar conta cliente com coleta mínima.

Hierarquia: título/orientação → credenciais/requisitos de senha → Criar conta → login/políticas. Mesma largura/controle do Login, sem nova fotografia editorial obrigatória ou outra cor de CTA. Desktop/tablet contidos; mobile uma coluna, ajuda antes da submissão. Não criar tela festiva de sucesso, consentimento obrigatório ou dados adicionais; confirmação de senha e destino pós-cadastro mantêm o status de proposta da origem.

### Recuperacao de senha

**Origem P:** `autenticacao/recuperacao-de-senha.md`. Papel: solicitar e definir nova senha em estados da mesma experiência.

Hierarquia: título do estado → orientação → campo(s) → ação → retorno ao login. Mesma moldura e escala do Login; trocar conteúdo não produz uma nova família de página. Mobile/desktop preservam a coluna contida, sem arte empurrando erro para fora da tela. Sucesso, acesso inválido/usado/expirado e solicitação genérica usam Feedback. Serviço de recuperação/canal/validade ainda pendentes; aparência não indica que envio já existe.

## Conta — 4 paginas

Família: shell conta, H1 utilitário, blocos claros e expressão artística mínima; tinta nos dados, preto em ação/seleção e semântica somente no estado. Desktop navegação lateral; tablet adapta; mobile navegação acima e conteúdo em coluna única. Componentes comuns mantêm os padrões de Formulários/Feedback.

### Meu perfil

**Origem P:** `conta/meu-perfil.md`. Papel: identidade própria, troca de senha e fixtures de cartão.

Hierarquia: título → e-mail em leitura → formulário de senha → cartões fictícios. Separar assuntos por título/espaço, sem cartão decorativo para cada campo. Componentes: shell conta; [Form Field](componentes.md#form-field), [Button](componentes.md#button), [Dialog](componentes.md#dialog), [Payment Simulation](componentes.md#payment-simulation), feedback, loading e Empty State de cartões. Desktop pode ter largura útil maior que login, mas formulários não se esticam; mobile empilha. Fixture mascarada não deve parecer cartão bancário real; aviso de simulação permanece visível.

### Meus enderecos

**Origem P:** `conta/meus-enderecos.md`. Papel: planejar identificação/manutenção de destinos próprios.

Hierarquia: título/Adicionar → registros legíveis → formulário contextual e resultado. Componentes: shell conta; [Data List](componentes.md#data-list), [Form Field](componentes.md#form-field), [Button](componentes.md#button), [Dialog](componentes.md#dialog) e estados de lista/operação. Texto de destinatário/endereço em Sans, sem mapa ou foto. Desktop lista e formulário contidos; tablet simplifica; mobile registros empilhados. Formulário breve pode usar Dialog; longo fica no fluxo. Campos/mercado/persistência ainda pendentes; não fixar alturas de um formulário que ainda não foi definido.

### Meus pedidos

**Origem P:** `conta/meus-pedidos.md`. Papel: reconhecer histórico e abrir detalhe.

Hierarquia: título → registros com referência/data/total/estado → paginação. Componentes: shell conta; [Data List](componentes.md#data-list), [Pagination](componentes.md#pagination), [Price Display](componentes.md#price-display) e estados de lista. Desktop tabela simples, tablet adapta, mobile registros rotulados. Referência e total têm destaque maior que metadados; estado é textual e semântico, sem tratamento de anúncio promocional. Vazio difere de falha; ordem recente continua proposta funcional da origem.

### Detalhes do pedido

**Origem P:** `conta/detalhes-do-pedido.md`. Papel: conferir histórico e continuar tentativa pendente permitida.

Hierarquia: breadcrumb/referência/data/estado → itens/total → pagamento e ações. Componentes: shell conta; [Breadcrumb](componentes.md#breadcrumb), [Cart Item](componentes.md#cart-item) em leitura, [Order Summary](componentes.md#order-summary), [Price Display](componentes.md#price-display), [Payment Simulation](componentes.md#payment-simulation), [Button](componentes.md#button), feedback/loading. Desktop composição/resumo adjacentes; tablet/mobile em sequência. Compartilha vocabulário/estado com Confirmação, mas mantém contexto de conta. Sem controles disabled insinuando edição, preços atualizados do catálogo ou ação de pagar um pedido final novamente.

## Institucional — 5 paginas

Família: shell loja e coluna de leitura de Fundamentos, links claros e conteúdo estruturado. Sobre pode usar expressão editorial alta; ajuda/políticas continuam prioritariamente texto, sem herdar um banner fotográfico obrigatório. Sem textos jurídicos ou comerciais inventados.

### Sobre o Guardian Bay

**Origem P:** `institucional/sobre.md`. Papel: apresentar propósito e personalidade da marca.

Hierarquia: H1 editorial/mensagem → propósito → catálogo/ajuda. Base branco, títulos editoriais com personalidade, âmbar no CTA e fotografia editorial estática opcional; cinza neutro em apoio discreto. Componentes: shell loja e [Button](componentes.md#button). Desktop composição editorial contida; tablet reorganiza; mobile leitura antes da arte quando necessário. Não criar história empresarial/certificações ou resolver oferta comercial pelo cenário fotográfico.

### Central de ajuda

**Origem P:** `institucional/central-de-ajuda.md`. Papel: encontrar orientação de compra, entrega, simulação e contato.

Hierarquia: H1 utilitário → índice de tópicos → perguntas/respostas → contato/políticas. Sans no conteúdo, preto em âncoras e tinta nos títulos; sem grade de cards fotográficos para assuntos simples. Componentes: shell loja; [Button](componentes.md#button) quando ação justificar e [Feedback](componentes.md#feedback) contextual. Desktop pode manter índice lateral; tablet/mobile índice acima e respostas expostas. Sem busca/chat/tickets novos; pendência de canal e entrega fica editorialmente clara.

### Privacidade

**Origem P:** `institucional/privacidade.md`. Papel: planejar leitura sobre tratamento de dados.

Hierarquia: título/status editorial → índice → seções → ajuda/políticas relacionadas. Componentes: shell loja e [Feedback](componentes.md#feedback) para indicação de planejamento quando pertinente. Títulos utilitários e texto em Sans, com largura de leitura/entrelinha globais; preto nos links, sem fotografia editorial que dispute o documento. Desktop/tablet contidos, mobile índice no início. Versão/data só após aprovação; não desenhar banner de cookies ou aceite que não foi solicitado.

### Termos de uso

**Origem P:** `institucional/termos-de-uso.md`. Papel: planejar condições de uso e limites da simulação.

Mesma composição, cores, tipografia e componentes de Privacidade: título/status → índice → seções → apoio. Em mobile, links longos quebram sem rolagem global; tablet/desktop mantêm coluna confortável. Ressaltar por subtítulo a informação essencial, sem caixas coloridas para cada cláusula. O DS organiza conteúdo, sem transformar minuta em termo juridicamente aprovado ou acrescentar aceite ao cadastro.

### Trocas e devolucoes

**Origem P:** `institucional/trocas-e-devolucoes.md`. Papel: orientar leitura de política futura sem criar operação.

Mesma família de Privacidade/Termos: shell loja e [Feedback](componentes.md#feedback), título/status → assuntos da política → ajuda. Tinta para regras quando aprovadas, links pretos e sem CTA de iniciar devolução. Responsividade de texto igual às demais políticas. Prazos/custos/elegibilidade não definidos são lacunas editoriais; não preencher com promessa de estorno, frete grátis ou prazo legal presumido.

## Admin — 6 paginas

Família: shell admin, H1 utilitário em Sans, tinta nos dados e preto em seleção/ação. Arte mínima; densidade vem de alinhamento e organização, sem reduzir fonte/alvos. Listas usam [Data List](componentes.md#data-list); formulários usam o mesmo Form Field da loja. Não criar tema administrativo alheio à marca.

### Dashboard

**Origem P:** `admin/dashboard.md`. Papel: orientar às áreas de operação.

Hierarquia: identificação Administração/H1 → atalhos → contagens somente se disponíveis. Componentes: shell admin; [Button](componentes.md#button), feedback/loading. Atalhos em blocos claros, sem gráficos, foto ou cor diferente por área. Desktop conjunto com respiro; tablet/mobile empilha com menu em Drawer. Indisponibilidade de contagem não vira zero nem espaço para métrica inventada.

### Produtos

**Origem P:** `admin/produtos.md`. Papel: reconhecer registros e acessar cadastro/edição.

Hierarquia: H1/Cadastrar produto → refinamento proposto quando aprovado → lista/estado → paginação. Componentes: shell admin; [Data List](componentes.md#data-list), [Form Field](componentes.md#form-field), [Button](componentes.md#button), [Price Display](componentes.md#price-display), [Pagination](componentes.md#pagination) e estados. Desktop tabela; tablet pode rolar localmente; mobile registros com nome, publicação, estoque e preço. Foto é apoio, não maior elemento da linha; publicação e estoque têm rótulos distintos. Filtros novos continuam proposta, sem controles inativos insinuando recurso.

### Cadastro e edicao de produto

**Origem P:** `admin/cadastro-edicao-de-produto.md`. Papel: um formulário para dois contextos de tarefa.

Hierarquia: breadcrumb/H1 contextual → dados e prévia → salvar → estoque/publicação com consequência. Componentes: shell admin; [Breadcrumb](componentes.md#breadcrumb), [Form Field](componentes.md#form-field), [Button](componentes.md#button), [Dialog](componentes.md#dialog), feedback/loading. Mesma linguagem ao criar/editar, sem cor diferente pelo modo. Desktop permite prévia lateral; tablet adapta; mobile coluna única. Estoque com ação própria tem resultado próximo, distinto de salvar dados. Não inserir galeria/upload inexistentes para completar prévia; conflito de revisão recebe aviso visível.

### Categorias

**Origem P:** `admin/categorias.md`. Papel: consultar/criar/renomear de forma breve.

Hierarquia: H1/Nova categoria → nomes/Editar → formulário curto contextual. Componentes: shell admin; [Data List](componentes.md#data-list), [Form Field](componentes.md#form-field), [Dialog](componentes.md#dialog), [Button](componentes.md#button) e estados. Lista leve em vez de cards com imagens; mesmo âmbar de ação e neutros da administração. Desktop/tablet diálogo breve; mobile diálogo rolável sem cortar ações. Sem hierarquia de categorias, exclusão ou imagens adicionadas.

### Pedidos

**Origem P:** `admin/pedidos.md`. Papel: localizar compras para consulta.

Hierarquia: H1 → filtros por estado/referência e ordem por data → registros → paginação. Componentes: shell admin; [Form Field](componentes.md#form-field), [Data List](componentes.md#data-list), [Pagination](componentes.md#pagination), [Price Display](componentes.md#price-display) e estados. Desktop tabela alinhada; tablet quebra filtros; mobile registros rotulados. Total/referência em tinta; estado com semântica do cliente, sem reinventar nomes/cores para admin. Sem filtro por período, comprador, exportação ou mutation acrescentados pelo design.

### Detalhes e gerenciamento de pedido

**Origem P:** `admin/detalhes-gerenciamento-de-pedido.md`. Papel: inspecionar snapshot e atualizar consulta.

Hierarquia: breadcrumb/referência/estado → composição/total → Atualizar consulta/retorno. Componentes: shell admin; [Breadcrumb](componentes.md#breadcrumb), [Cart Item](componentes.md#cart-item) em leitura, [Order Summary](componentes.md#order-summary), [Price Display](componentes.md#price-display), [Button](componentes.md#button), feedback/loading. Desktop composição/resumo adjacentes; tablet/mobile empilhados. Sem edição de estado, reembolso ou confirmação de pagamento em nome do cliente. Não exibir formulários disabled como decoração de gestão inexistente.

## Sistema — 3 paginas

Família: título humano em Sans, explicação curta, ação segura e [Feedback](componentes.md#feedback)/[Button](componentes.md#button). Shell loja por padrão; shell admin só com autorização conhecida; se o shell falhar, marca e retorno mínimo. Código numérico é secundário ao texto, sem fotografia editorial obrigatória. Desktop/tablet mensagem contida; mobile ações empilhadas. Fundamentos de foco/contraste e padrão de navegação permanecem os mesmos.

### Pagina nao encontrada — 404

**Origem P:** `sistema/nao-encontrada.md`. Papel: recuperar orientação de recurso indisponível.

Hierarquia: mensagem Não encontramos esta página → explicação neutra → Home/catálogo ou lista autorizada. Estado visual informativo, sem tratar todo recurso ausente como erro destrutivo. Não mostrar identificador privado nem usar Repetir como ação principal automática. Sem foto quebrada para ilustrar a ausência.

### Acesso negado — 403

**Origem P:** `sistema/acesso-negado.md`. Papel: explicar falta de permissão sem mostrar a área.

Hierarquia: mensagem de acesso → orientação → retorno seguro/troca legítima de conta. Ênfase semântica de atenção em vez de grande fundo de erro; não listar permissões ou criar CTA de pedir acesso admin. Sessão ausente/expirada é tratada por login, sem falsa indicação de autorização negada. Só mostrar shell autorizado, nunca uma tabela restrita desfocada ao fundo.

### Erro inesperado

**Origem P:** `sistema/erro-inesperado.md`. Papel: recuperar falha de leitura mantendo confiança.

Hierarquia: mensagem de falha → orientação → repetir leitura ou retornar. Acento de erro não ocupa toda a tela; detalhes técnicos não são conteúdo de interface. Compra com resultado incerto ganha orientação persistente para consultar pedido antes de nova intenção; não usar o botão Tentar novamente para repetir compra. Estado ocupado fica na ação, sem substituir toda a mensagem por Skeleton.

## Revisao da aplicacao

- [ ] Todas as entradas preservam papel, componentes e estrutura funcional das origens, sem novas telas.
- [ ] Páginas da mesma família usam a mesma tipografia, linguagem de estados e proporções de controles.
- [ ] Home/catálogo mantêm decisões de composição e grids; checkout/admin reduzem distração.
- [ ] Endereço/entrega, recuperação, mídia e políticas mantêm condicionantes explícitos.
- [ ] Responsividade mantém informação e ações; especificação não é alegação de teste em navegador.
