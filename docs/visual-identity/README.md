# Documentação visual do Guardian Bay

[Guia central](../../DESIGN.md)

Consolidação de 25/10/2026. A organização abaixo serve à documentação, sem modificar arquitetura, rotas ou componentes de código. Não foram encontrados DESIGN.md ou diretório visual-identity preexistentes no repositório durante a busca inicial.

## Mapa de responsabilidades

| Documento | Responsabilidade exclusiva |
| --- | --- |
| [IDV resumida](idv.md) | Personalidade, voz e direção de arte |
| [Linguagem de ilustração](../design/illustration-language.md) | Análise de referências, técnica pictórica e composição de artes editoriais |
| [Fundamentos](fundamentos.md) | Valores visuais, medidas, cores semânticas e critérios de acessibilidade |
| [Componentes](componentes.md) | Aplicação individual dos fundamentos aos 26 componentes |
| [Páginas](paginas.md) | Composição individual das 27 páginas e relação com componentes |
| [Formulários](padroes/formularios.md) | Rótulos, validação, agrupamento e submissão |
| [Navegação](padroes/navegacao.md) | Orientação, menus e troca de contexto |
| [Feedback e estados](padroes/feedback-estados.md) | Matriz de estado e recuperação |
| [Interações](padroes/interacoes.md) | Foco, hover, seleção, sobreposições e movimento |

Valores globais têm uma definição normativa em Fundamentos. Demais documentos referenciam essa definição e tratam somente sua aplicação. O resumo no DESIGN.md é um atalho, não uma segunda escala. Os estudos externos continuam responsáveis pelo comportamento funcional detalhado; aqui não são reproduzidos integralmente.

## Fontes externas e rastreabilidade

Os caminhos abaixo identificam fontes locais externas ao repositório; são texto, sem links relativos que deixariam de funcionar em outro checkout.

- **I — IDV v0.2:** `C:\Users\joaoa\Desktop\temporario-obsidian-vault\guardian-bay\IDV + Planejamento Visual\IDV.md`. Lida integralmente; as referências “I §3”, por exemplo, indicam suas seções numeradas.
- **C — componentes:** `C:\Users\joaoa\Desktop\temporario-obsidian-vault\guardian-bay\IDV + Planejamento Visual\Pagina e componentes\componentes`. Leitura recursiva integral de 26 arquivos; cada entrada de Componentes identifica o arquivo de origem.
- **P — páginas:** `C:\Users\joaoa\Desktop\temporario-obsidian-vault\guardian-bay\IDV + Planejamento Visual\Pagina e componentes\pages`. Leitura recursiva integral de 27 arquivos, nos seis módulos; cada entrada de Páginas identifica seu arquivo e componentes.
- **G — decisões gerais:** `C:\Users\joaoa\Desktop\temporario-obsidian-vault\guardian-bay\IDV + Planejamento Visual\Pagina e componentes\decisoes-gerais.md`. Fonte complementar de conflitos e condicionantes funcionais.

Fontes originais permanecem intactas. Acessar as pastas acima exige a cópia local do vault; esta consolidação contém os padrões visuais necessários para trabalhar no repositório sem uma ferramenta externa de direção de arte. Pendências de produto não são resolvidas por um padrão visual.

### Classificação das decisões

- **Herdada I:** cor, fonte, direção de arte ou intervalo já documentado na IDV.
- **Herdada C/P:** necessidade estrutural ou comportamental documentada nos estudos.
- **N01–N08 — proposta nova:** escolha operacional desta consolidação dentro da identidade. Pode orientar o trabalho de design, mas não é uma regra preexistente ou uma validação em navegador. A definição fica em Fundamentos.
- **Pendente:** conteúdo, capacidade comercial, arte final ou escolha que depende de dados/decisão do projeto. Não inventar capacidade para preencher lacuna.

## Divergências e decisão adotada

| Conflito identificado | Decisão nesta consolidação | Origem e limite |
| --- | --- | --- |
| G e C/button deixam protagonismo azul pendente; I o define | Adotar hierarquia azul protagonista sobre base creme, com verde/terracota de apoio | Autoridade visual da IDV expressamente determinada pela Task atual; sem alterar G ou C |
| I prevê mídias institucionais dinâmicas; P/home e P/login definem artes estáticas | Preservar banner/arte institucional estáticos e administração sem CMS | Trata-se de escopo funcional, determinado por P; a direção de arte de I permanece |
| I usa Always Prepared; P/home e P/sobre usam Preparado para tudo. | Manter assinatura institucional da IDV e mensagem portuguesa nos conteúdos já planejados; não fundir as duas num novo logo | Não aprovar tradução/bilinguismo do ativo final; tagline continua opcional |
| I sugere categorias provisórias; P exige categorias reais | Nenhum nome de categoria fixado pelo DS | O posicionamento visual da IDV não determina estoque comercial |
| I menciona avaliações, descontos e variantes condicionalmente; P limita primeira versão | Não introduzir avaliações, descontos, variantes, comparação, favoritos ou compra rápida | Possibilidade visual não cria funcionalidade |
| I prevê fotos; estudos descrevem base com duas ilustrações limitadas | Especificar enquadramento fiel, placeholder e prévia; não aprovar upload, biblioteca, múltiplas fotos ou zoom obrigatório | Mídia disponível e contrato futuro continuam pendentes |
| C prevê modal de endereço; P admite Dialog ou bloco expandido | Formulário breve cabe em Dialog; formulário longo fica no fluxo. Não aninhar confirmação em modal já aberto | Aplicar regra geral de interação, sem criar página nova; campos finais de endereço pendentes |
| C/menu-de-usuario e C/navegacao-mobile listam só Home; outras páginas usam Header | Tratar esses dois como composição interna do Header global também nas demais páginas | G explica uso direto/agrupado; não interpretar backlinks como proibição de reutilização |
| P repete hierarquia genérica em todas as seções | Explicitar hierarquia específica em Páginas, preservando conteúdo e ordem funcional | Refinamento visual desta Task, sem recriar planejamento |
| P/sistema inclui frase genérica de repetir leitura também em 403/404 | Oferecer repetição somente para falha recuperável de leitura; em 403/404 priorizar retorno seguro | Estados e permissões não são resolvidos por reload ou ação de compra |
| G registra conflito entre segmento tecnológico e preparação/camping | IDV determina atmosfera/posicionamento visual; oferta e categorias comerciais continuam pendentes | O DS não escolhe novos produtos nem reescreve conteúdo comercial |

## Lacunas mantidas

- Logo final, kerning, área de proteção, tamanho mínimo e símbolo: não inventar ativo definitivo.
- Fotografia real, proporção final validada com catálogo e integração de mídia; N08 é só uma proposta de estudo.
- Validação de fontes, cores, foco, estados semânticos e medidas em interface real. Geist no código existente não é substituído nesta Task.
- Campos/mercado de endereços, persistência, entrega, modalidades, prazos, custos e efeito no total; condicionam Endereços e parte do Checkout.
- Recuperação de senha: canal, validade, uso único e efeito sobre sessões; o planejamento não cria serviço de envio.
- Critério/quantidade de produtos da Home, regra de Novidades, padrão final da ordenação, destino pós-cadastro e confirmação de senha proposta no cadastro.
- Políticas finais, jurisdição, controlador e canal/horário de contato. Os documentos são planejamento editorial, sem texto jurídico aprovado.
- Busca/filtro adicionais da lista administrativa de produtos e qualquer mutation de pedido. Pedidos administrativos continuam em consulta; auditoria existente não ganha nova tela neste escopo.

## Revisão e manutenção

Alterar primeiro a regra no documento responsável; ajustar entradas afetadas de Componentes/Páginas; registrar origem e resolver conflitos explicitamente. Novos usos devem reutilizar padrões antes de criar variante. Não copiar regras globais para cada página nem modificar os originais externos para simular concordância.

Cobertura a conferir na entrega: 26 componentes e 27 páginas (loja 6, autenticação 3, conta 4, institucional 5, admin 6, sistema 3). Verificar links de arquivos e âncoras, referências de origem, ausência de código e preservação das fontes. A validação é documental, sem alegação de WCAG ou aparência testadas em navegador.

### Resultado desta entrega

Validação inicial em 25/10/2026: dez arquivos Markdown, 26/26 origens de componentes e 27/27 origens de páginas referenciadas individualmente; 189 links internos de arquivos/âncoras válidos naquele estado. Comparação SHA-256 confirmou preservação de 55 arquivos externos (IDV, decisões gerais, componentes e páginas). Alterações limitadas à documentação.

Revisão de formato: DESIGN.md adota frontmatter YAML e seções Markdown na ordem da [especificação oficial do Google](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md), atualmente alpha. TOON não faz parte desse formato. O frontmatter resume tokens já documentados; as propostas N04/N05/N06 continuam identificadas como referências operacionais. A revisão não altera as decisões visuais nem afirma redução de tokens medida. Conferir valores e referências cruzadas ao atualizar o resumo estruturado.

Os pares de cores propostos foram calculados por luminância apenas como análise documental. Contraste real, leitura, reflow, teclado, foco, estados, movimento reduzido e composição ainda devem ser verificados numa futura interface; não foram declarados como testes aprovados em navegador. Não se executaram build ou testes de runtime porque esta Task não altera aplicação, configuração ou dependências.
