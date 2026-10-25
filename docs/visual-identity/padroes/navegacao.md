# Padrão de navegação

[Índice](../README.md) · [Fundamentos](../fundamentos.md) · [Componentes](../componentes.md)

Origem: I §6; C/header, footer, navegacao-mobile, menu-de-usuario, navegacao-de-conta, sidebar-administrativa, breadcrumb e pagination; P/catalogo e demais páginas. Os destinos funcionais permanecem nos estudos; este documento centraliza orientação e interação.

## Estruturas e contexto

| Estrutura | Tratamento de design | Continuidade |
| --- | --- | --- |
| Header global | Marca primeiro, navegação identificável, busca e acessos utilitários legíveis | Produtos/Categorias/Novidades/pesquisa compartilham contexto de catálogo |
| Header checkout | Marca, retorno e progresso; menos distração e mesma linguagem | Não remover ajuda/políticas nem bloquear retorno de etapa |
| Footer | Grupos com títulos e links, baixa disputa com a ação principal | Mesmo conjunto essencial em mobile; checkout compacto |
| Conta | Destinos Perfil/Endereços/Pedidos com seleção atual | Detalhe permanece dentro de Pedidos |
| Administração | Shell próprio e identificação explícita, sem adotar outra identidade | Edição mantém área de origem ativa; retorno à loja acessível |

O [registro de divergências](../README.md) explica banner estático, ausência de CMS e composição interna do Header. Não adicionar faixa promocional, mega menu, redes sociais ou CMS porque a IDV menciona possibilidades genéricas.

## Estados e teclado

Link atual usa texto/peso/forma além da cor de seleção de Fundamentos. Não confundir hover, foco, aberto e destino atual. O item atual permanece identificável mesmo quando foco está em outro controle.

Menus abrem por ativação explícita, com nome e estado expandido anunciados; conteúdo essencial não exige hover. Tab percorre controles na ordem visual; Enter ativa link/botão e Espaço ativa botão. Escape fecha sobreposição e retorna ao acionador. Se um menu adotar comportamento de menu de ações, garantir suas teclas de direção; lista simples de navegação pode conservar Tab. Não misturar os dois comportamentos sem indicar o papel ao usuário.

Header oferece salto para conteúdo. Ao mudar página, título principal identifica novo contexto; ao fechar painel, foco retorna ao acionador; ao remover item, vai ao próximo registro ou título útil. Uma atualização da lista não lança foco ao topo da página sem necessidade.

## Mobile e tablet

Quando links não couberem, trocar para navegação mobile em Drawer antes de reduzir tipografia/alvos. O mesmo conteúdo permanece disponível; não substituir rótulos críticos por ícones ambíguos. Categorias expandem no mesmo painel, sem outro modal. Falha ao ler categorias deixa os demais destinos navegáveis.

Conta pode integrar o menu mobile em vez de abrir dropdown sobre Drawer. Administração usa seu painel próprio, sem sobrepor navegação da loja. Navegação de conta vai acima do conteúdo em telas estreitas e mantém seleção legível. Header não é fixo por padrão nesta consolidação; eventual fixação depende de espaço e nunca pode ocultar foco/conteúdo.

## Breadcrumb, lista e URL

Breadcrumb contém apenas ancestrais úteis e página atual; separadores não são informação. Quebrar linha antes de truncar nome importante. Ele não substitui o título nem constitui especificação de rotas.

Pesquisa, filtros, ordenação e página no catálogo devem ser recuperáveis pela URL e pelo voltar do navegador. Critérios ativos continuam perceptíveis depois de fechar o Drawer. Alterar critério reinicia paginação; voltar restaura contexto. Aplicar filtros orienta ao título/resultado atualizado e anuncia a contagem confirmada.

Paginação conserva anterior/atual/próxima em mobile; não remover o contexto para caber mais números. Listas administrativas e histórico preservam retorno conhecido sem inventar filtros ou estados não previstos.

## Acesso e falhas

Conta visitante leva ao login; conta autenticada oferece destinos pessoais e saída. Mostrar entrada Admin depende de autorização, mas esconder link não é controle de segurança. Sessão ausente/expirada oferece login com retorno interno seguro; 403 oferece saída sem revelar conteúdo restrito. Não expor nome privado em breadcrumb, contador ou sugestão de busca.

Loading de contador não vira zero; erro de leitura mantém os acessos estáticos. A saída só recebe sucesso confirmado; falha deve permitir nova tentativa segura. Detalhes de mensagens seguem [Feedback e estados](feedback-estados.md).

## Revisão do padrão

- [ ] Orientação atual, retorno e destinos essenciais existem em desktop/mobile.
- [ ] Não há acesso exclusivo por hover, foco perdido ou menu sobre modal.
- [ ] URL/voltar restauram contexto do catálogo sem inventar novas rotas.
- [ ] Navegação restrita não expõe dados nem simula autorização.
