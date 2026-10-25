# Fundamentos visuais

[Índice e fontes](README.md) · [Aplicação em componentes](componentes.md) · [Aplicação em páginas](paginas.md)

Valores herdados indicam a seção de **I**. Escolhas necessárias não resolvidas pelas fontes aparecem como **N01–N08 — propostas novas desta consolidação**, sem atribuí-las à IDV. São referências de trabalho documental; a validação visual/acessível em componentes reais permanece pendente.

## Cores

**Herdada I §3.** Predominância estimada do conjunto: creme 60%, azul 20%, verde 10%, terracota 10%. Não são cotas por página ou obrigação de preencher uma quantidade de controles. Creme é base; azul é o primeiro destaque; verde e terracota são apoios. Não aplicar azul/terracota com igual intensidade no mesmo bloco.

| Papel | Valor | Aplicação |
| --- | --- | --- |
| Papel/base | #EEE7D9 | Fundo e respiro |
| Marca/interação | #256A94 | Wordmark, CTA principal, link, seleção e foco |
| Natural/apoio | #71816E | Detalhe e área decorativa discreta, sem função de CTA principal |
| Acento quente | #AB6248 | Ênfase editorial pontual, sem semântica automática de erro |
| Tinta | #232A27 | Texto principal, títulos utilitários, preços e informações críticas |
| Texto secundário | #4B5551 | Ajuda e metadados; não usar opacidade para reduzir legibilidade |
| Superfície elevada | #F8F4EC | Campo, painel e card quando houver necessidade de separação |
| Produto/branco | #FFFFFF | Fundo de fotografia e texto reverso em fundo adequado |
| Borda decorativa | #CBC2B3 | Separação sem informação crítica; não basta sozinha para identificar campo |

**N01 — cores semânticas propostas.** A IDV exige definição separada e C/feedback necessita estados distinguíveis. Usar os acentos abaixo em texto/ícone/contorno sobre papel ou superfície elevada, mantendo fundo claro e texto de apoio em tinta. Não criar grandes fundos saturados nem reutilizar semânticas como cor promocional. Um estado sempre inclui nome e orientação; cor não é sua única identificação.

| Semântica | Proposta | Contraste sobre papel / elevada | Uso |
| --- | --- | --- | --- |
| Informação | Azul de marca #256A94 | 4,78:1 / 5,37:1 | Orientação e situação pendente, sem sinalizar aprovação |
| Sucesso | #2F5A3D | 6,44:1 / 7,22:1 | Resultado confirmado; distinto do verde decorativo |
| Atenção | #755016 | 5,85:1 / 6,57:1 | Revisão necessária, indisponibilidade e prazo |
| Erro | #8F2D2D | 6,61:1 / 7,42:1 | Falha e validação; distinto de terracota |

Razões calculadas documentalmente para cores opacas pela luminância sRGB; não são teste de UI nem certificação WCAG. Não extrapolar para outros fundos, transparências ou elementos pequenos. Azul sobre papel, papel sobre azul e branco sobre azul têm referência de contraste adequado na IDV; verde e terracota sobre papel não atingem 4,5:1 para texto comum. Não reduzir opacidade do texto de botão para criar hover/disabled.

## Tipografia

**Herdada I §4.**

| Função | Família/peso | Fallback |
| --- | --- | --- |
| Wordmark | Fraunces 800, caixa alta | Georgia, serif |
| H1/H2 editoriais | Fraunces 600–800 | Georgia, serif |
| Títulos de produto/seção utilitária | IBM Plex Sans 600–700 | system-ui, sans-serif |
| Corpo, preço, campo, navegação e botão | IBM Plex Sans 400–700 | system-ui, sans-serif |
| Medidas/códigos técnicos pontuais | IBM Plex Mono 400–500 | ui-monospace, monospace |

**N04 — escala operacional proposta**, escolhida dentro dos intervalos da IDV para evitar variação por tela. Tablet usa valores mobile até caber a composição desktop; nunca aumentar fonte apenas porque cabe mais conteúdo.

| Papel | Desktop / tablet amplo | Mobile / tablet estreito | Entrelinha | Peso |
| --- | --- | --- | --- | --- |
| H1 editorial | 56 px | 40 px | 1,1 | 700 |
| H2 editorial | 32 px | 28 px | 1,2 | 600 |
| H1 utilitário | 32 px | 28 px | 1,2 | 700 |
| H2 utilitário / título de seção | 24 px | 22 px | 1,3 | 600 |
| Nome de card / controle / navegação | 16 px | 16 px | 1,4 | 600 / 400 nos valores de campo |
| Corpo | 16 px | 16 px | 1,6 | 400 |
| Ajuda / metadados | 14 px | 14 px | 1,5 | 400 |
| Preço unitário em card | 16 px | 16 px | 1,4 | 600 |
| Preço do produto / total destacado | 24 px | 22 px | 1,3 | 700 |

H1 utilitário é necessário em formulários, conta e admin, sem impor título editorial a tarefas. Não usar peso diferente como único sinal de seleção. Manter parágrafos com aproximadamente 65–75 caracteres por linha (I §4). Não usar 12 px como padrão; o wordmark tem dimensão final pendente e não herda o tamanho de H1. Nomes longos quebram linha; preço e rótulo não são truncados.

## Espacamento

**Herdada I §5:** base 4 px, preferência por passos de 8 px. **N05 — aplicação proposta:** escala 4, 8, 12, 16, 24, 32, 48, 64 e 96 px. Não usar todos os passos numa mesma composição; escolher por relação entre elementos.

| Relação | Referência proposta |
| --- | --- |
| Rótulo e controle | 8 px |
| Controle e ajuda/erro | 4 px |
| Campos do mesmo grupo | 16 px |
| Grupos de formulário / interior de painel | 24 px; interior reduzível a 16 px mobile |
| Colunas e cards | 24 px desktop/tablet, 16 px mobile |
| Seções utilitárias | 32 px desktop, 24 px mobile |
| Seções editoriais | 64 px desktop, 48 px mobile |

O espaço separa assuntos antes de adicionar borda/painel. Não embutir um card em outro apenas para produzir profundidade.

## Containers e grids

**Herdada I §5:** conteúdo fluido até aproximadamente 1280 px; margens externas 16–20 px mobile, 24–32 px tablet e 40–64 px desktop, conforme espaço. Limite do conteúdo não inclui obrigação de ocupar a tela.

**N05 — referências operacionais:** usar inicialmente margens 16/24/40 px por faixa; ampliar somente dentro do intervalo herdado quando houver respiro. Formulário de autenticação até 480 px; diálogo breve até 560 px; navegação lateral até 240 px; Drawer de navegação até 360 px, sempre limitado à viewport. São limites propostos de conteúdo, não dimensões fixas em telas pequenas. Texto longo segue largura de leitura; admin ocupa largura útil sem esticar parágrafos.

**Herdada P:** Home quatro colunas desktop, tablet adaptativo e duas mobile; catálogo quatro desktop/três tablet/duas mobile. Catálogo agrega filtros laterais desktop, recolhíveis tablet e Drawer mobile. Não esconder nome/preço para alcançar contagem de colunas.

## Breakpoints

**Herdada I §5:** referências em torno de 640, 768, 1024 e 1280 px, ajustadas pelo conteúdo. **N07 — faixas de estudo propostas:** mobile abaixo de 768 px; tablet de 768 até antes de 1024 px; desktop a partir de 1024 px. O marco de 640 px permite reorganizar controles locais sem mudar o grid mobile de duas colunas; 1280 px orienta estudo de conteúdo amplo, sem ser largura mínima de desktop.

Ajustar colunas auxiliares/menu antes de comprimir controle. Em tablet, Home começa com três colunas se legível e pode adaptar a duas; catálogo mantém três. Layout em duas áreas (produto/resumo) só permanece se ambas forem legíveis; caso contrário empilha. Em mobile, não haver scroll horizontal global. Tabela pode ter rolagem local indicada quando conversão em registros comprometer comparação.

Larguras extremas e zoom exigem revisão real de legibilidade. Se duas colunas não couberem sem perda, registrar exceção de reflow com responsável de design em vez de mudar silenciosamente a decisão aprovada. Nenhum breakpoint torna aceitável perder informação ou ação.

## Bordas e superficies

**Herdada I §5:** raios 4–8 px em controles e até 12 px em painéis; contornos discretos e sombra mínima. **N06 — proposta:** raio 6 px para controles, 8 px para cards e 12 px para Dialog/Drawer; borda 1 px. Campo/botão regular com altura mínima de 44 px; CTA de compra pode usar 48 px para ênfase. Esses são os únicos dois tamanhos necessários; texto multilinha pode aumentar altura.

**N03 — contorno de controle proposto:** usar texto secundário #4B5551 na borda que identifica campo, checkbox/radio não selecionado ou botão secundário neutro. A borda decorativa da IDV tem contraste de apenas 1,43:1 sobre papel e 1,61:1 sobre superfície elevada; não deve ser a única forma de reconhecer um controle. O neutro proposto alcança aproximadamente 6,28:1 e 7,04:1 nesses fundos. Não usar essa borda forte em toda divisão decorativa.

Superfície elevada separa formulário/resumo quando necessário; fundo branco fica reservado à mídia/uso neutro adequado. Não criar dashboard branco azulado, painéis pretos ou gradientes que introduzam outra estética. Elevação se comunica por contorno e espaço, sem sombra obrigatória.

## Hierarquia

Uma decisão principal por grupo de tarefa; título → informação necessária → ação → apoio. Preço/total usam tinta e peso, sem depender de cores promocionais. Texto secundário continua legível. Aviso que impede compra permanece perto do item e antes da confirmação, mesmo que ocupe mais espaço.

Editorial usa Fraunces e arte; comércio usa IBM Plex Sans e imagem fiel; administração usa alinhamento, rótulos e densidade moderada. Trocar família/cor por módulo não cria hierarquia melhor. Ver [Páginas](paginas.md) para a ordem específica de cada experiência.

## Iconografia

**Herdada I §5:** ícones lineares, simples e da mesma linguagem, próximos de 20–24 px. Usar 20 px em controles regulares e 24 px em acessos principais como seleção operacional de N06. Alinhar ao texto sem encolher alvo de toque. Nome acessível em botão de ícone; ação crítica conserva rótulo visível. Ícone decorativo não repete a fala do texto. Não criar escudo/símbolo secundário como logo aprovado.

## Foco e acessibilidade

**Herdada I §§3,9:** WCAG 2.2 AA como referência, texto comum ≥4,5:1 e grande ≥3:1; contraste de controles/estados essenciais ≥3:1 como critério desta consolidação. Foco visível, teclado completo, rótulos persistentes e mensagens associadas; seleção não depende só de cor. Zoom a 200% sem perda de operação; verificar também reflow na implementação.

**N02 — indicador de foco proposto:** contorno de 2 px azul com separação clara de 2 px em superfície papel/clara. Sobre fundo azul, usar contorno creme; separar a fronteira do controle do indicador para não fundi-los. Em foto/arte, usar superfície de proteção antes do foco, sem presumir contraste. Nunca cortar foco com borda do painel ou cobri-lo com Header fixo.

Alvos principais próximos de 44 × 44 px quando viável (I §9), operacionalizados em N06. Não tornar texto essencial ilegível ao desabilitar. Ordem de foco segue a leitura; foco não significa seleção nem ativa operação. Comportamentos detalhados: [Interações](padroes/interacoes.md).

## Midia

**Herdada I §7 e P:** produto isolado com área neutra e enquadramento contido, sem corte ou distorção. Hero editorial pode recortar a cena protegendo seu ponto focal; desktop estuda 16:7 a 16:9 e mobile arte vertical próxima de 4:5 somente se necessária. Texto permanece independente da imagem e acessível. Não aprovar criação de novas artes nesta Task.

**N08 — proporção provisória proposta para estudo dos cards:** 1:1, uma das alternativas da IDV, para uniformizar área e placeholders. A escolha definitiva depende do catálogo real; não se apresenta 1:1 como decisão antiga ou proporção final aprovada. Não mudar por card. Galeria respeita a proporção do material disponível e a contenção do item, sem exigir nova mídia.

Ausência de imagem usa área neutra e indicação útil sem ilustração enganosa. Ausência de banner mantém tipografia e CTA. Arte institucional continua estática; mídia de produto continua associada aos dados do produto, com capacidades futuras não presumidas.

## Movimento

**Herdada I §8:** transições discretas geralmente entre 150 e 220 ms, sem animação decorativa contínua; não deformar foto nem ocultar nome/preço em hover. **Aplicação operacional:** preferir 180 ms dentro desse intervalo; respeitar movimento reduzido retirando deslocamentos/pulsos dispensáveis e mantendo feedback textual. Não atrasar resultado para terminar animação. Regras de sobreposição e touch em [Interações](padroes/interacoes.md).

## Registro de propostas novas

| ID | Decisão necessária | Razão e limite |
| --- | --- | --- |
| N01 | Paleta semântica e uso em superfícies claras | Estados funcionais exigidos e cores não definidas na IDV; cálculo documental não valida componente real |
| N02 | Espessura/separação do indicador de foco | Tornar instrução genérica de foco aplicável em controles e fundos diferentes |
| N03 | Contorno neutro mais forte para controles | Borda decorativa herdada não identifica sozinha um campo com contraste suficiente |
| N04 | Escala tipográfica de trabalho e H1 utilitário | Evitar escolhas diferentes por tela dentro dos intervalos herdados |
| N05 | Escala de espaços, relações e larguras auxiliares | Dar referência de composição sem criar novas páginas ou arquitetura |
| N06 | Alturas, raios, borda e uso dos tamanhos de ícone | Unificar alvos e densidade dentro das referências da IDV |
| N07 | Faixas responsivas de estudo | Aplicar grids aprovados com critérios comuns; conteúdo e reflow ainda exigem validação |
| N08 | Card 1:1 provisório | Uniformizar estudo sem encerrar pendência dependente do catálogo |

Nenhuma proposta cria novo componente, variante comercial, conteúdo, integração ou funcionalidade. O valor preferencial de movimento apenas seleciona um ponto do intervalo herdado. Medidas não dispensam teste de texto longo, viewport, zoom, teclado ou contraste na UI futura.
