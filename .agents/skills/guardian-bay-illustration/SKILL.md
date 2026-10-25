---
name: guardian-bay-illustration
description: Use when creating Guardian Bay editorial illustrations from descriptions or transforming supplied images into its approved painterly language. Excludes commercial product photography, unrelated artwork and UI implementation.
---

# Guardian Bay — ilustração

Aplicar a identidade aprovada com formas definidas, planos pintados e detalhes simples integrados. Interpretar o contrato para a ferramenta disponível: JSON não é uma instrução de imagem executável nem prova de consistência visual.

## Fontes e preparação

Resolver links a partir desta pasta; os JSONs usam caminhos relativos a `docs/design/`.

1. Respeitar AGENTS/invariantes e o pedido atual. Consultar [DESIGN.md](../../../DESIGN.md) para papéis de marca, sem impor as cotas de cor da interface à pintura.
2. Ler o [catálogo aprovado](../../../docs/design/illustration-references.md) e abrir as referências prioritárias atuais: floresta/oficina revisadas da rodada 02 e a lanterna positiva indicada no catálogo. Os três estudos iniciais são históricos de apoio; não usá-los para recuperar a densidade anterior. Pranchas e variantes iniciais rejeitadas não substituem os originais selecionados.
3. Ler a [linguagem](../../../docs/design/illustration-language.md), o [perfil fixo](../../../docs/design/illustration-style.json) e a [semântica do contrato](../../../docs/design/illustration-contract.md). Conferir IDs/versões e hashes das referências. Se fontes divergirem, explicitar a divergência antes de mudar a direção.
4. Preparar pedido conforme o [schema](../../../docs/design/illustration-contract.schema.json), usando os [exemplos](../../../docs/design/illustration-examples.json) como estrutura. Validar perfil/pedido pelo procedimento do contrato e revisar conflitos em prosa; schema não verifica pixels nem intenção.
5. Descobrir geração, edição e inspeção realmente disponíveis. Usar a skill `imagegen` instalada para operação da ferramenta integrada; o presente documento fornece a direção Guardian Bay. Não instalar ferramenta nem trocar para CLI/API/modelo pago por inferência. Se não houver execução, entregar pedido e prompt prontos, registrando validação visual pendente.

Não repetir os textos completos das fontes dentro da Skill ou criar outra paleta. Não usar “estilo Life is Strange” como substituto de instruções observáveis nem buscar imagens do jogo como entrada automática.

## Fluxo A — transformar imagem existente

- Vincular `source.asset_id` à imagem efetivamente fornecida. Se o ID for placeholder, o arquivo faltar ou não puder ser examinado, pedir a origem e interromper somente a transformação dependente. Uma arte aprovada é referência de estilo, nunca substituta da foto ausente. Testes textuais precisam ser identificados separadamente.
- Abrir a origem antes de editar. Registrar inventário, silhuetas/peças funcionais, posições relativas, perspectiva, luz, cor identificadora e itens essenciais. Ajustar a descrição do pedido ao que realmente aparece; não inventar detalhes ocultos.
- Preservar composição e luz com `preserve_source`. Mudanças só por instruções explícitas nos respectivos campos; `allowed_changes` vale apenas para seus alvos. Não remover um elemento essencial nem deformar função mesmo quando houver permissão genérica. Resolver instruções contraditórias antes da chamada.
- Identificar cada entrada no prompt: alvo de edição e referências de estilo. Transformar principalmente representação, preservando assunto, quantidade/posição dos objetos e informação essencial. Não transferir floresta, disposição da oficina ou cor azul da lanterna das referências para a origem.
- Em `contain_source`, manter a imagem inteira. Se a proporção solicitada diferir, acomodar com margens neutras sem crop ou outpainting de cenário. Reenquadramento requer `change_source`, instrução e `requested_frame`; a autorização não permite cortar partes essenciais.
- Executar edição/style transfer, não geração independente disfarçada de preservação. Conferir a saída contra a origem e contra as referências.

## Fluxo B — gerar a partir de descrição

- Construir pedido `source.kind: "text"` com assunto, apoios necessários, ambiente, contexto cromático, composição/luz `specified`, elementos essenciais e dimensões. Não converter pedido de transformação em textual silenciosamente.
- Resolver escolhas rotineiras compatíveis com a finalidade e declará-las no pedido; perguntar apenas quando faltar informação que muda substancialmente o resultado. Não criar cenário nostálgico, objetos extras ou elementos do jogo para afirmar a marca.
- Usar as artes aprovadas como referências de tratamento, sem copiar suas composições. Descrever uma cena original; `allowed_changes` permanece vazio porque não há imagem de origem a modificar.
- Executar geração com a mesma identidade fixa e avaliar a saída. Um teste deste fluxo não valida preservação fotográfica do fluxo A.

## Do contrato ao prompt

Preparar uma instrução legível, nesta ordem:

1. **Operação e papéis das imagens:** editar o alvo ou criar cena; enumerar referências apenas de estilo, sem transferir seu conteúdo.
2. **Cena:** traduzir `source`, `subject`, `context`, composição, luz e itens essenciais. Distinguir descrição da origem de uma alteração autorizada.
3. **Tratamento fixo:** sintetizar todos os grupos de `style`, selecionando materiais pertinentes. Formas claras por poucos planos; pinceladas amplas direcionais no próprio assunto; detalhes funcionais discretos integrados; cor fosca/acinzentada e bordas por encontros de valor. Não interpretar pincelada marcante como grão, rabiscos ou patina em toda superfície. Manter planos quietos e informação estrutural.
4. **Preservação e permissões:** converter `constraints`, `preserve_elements` e permissões limitadas em instruções específicas. Em edição, declarar o que muda e o que permanece.
5. **Exclusões e formato:** traduzir `avoid` e os riscos da cena; texto/logotipo acidental, peças impossíveis, minúcia uniforme, render polido, saturação/brilho excessivos e cópia de cenário são critérios de rejeição. Derivar proporção de largura/altura, solicitar as dimensões e registrar suporte real da ferramenta.

Não enviar apenas JSON bruto. Usar parâmetros documentados e disponíveis; se resolução ou seed não forem controláveis, registrar pedido versus observado/desconhecido. Não inventar força de transformação ou modelo.

Antes da chamada, concretizar a hierarquia no prompt: nomear uma massa focal e as regiões de apoio. Conforme a orientação do usuário nesta validação, buscar o mínimo de informação capaz de sugerir o assunto: planos 2D simples, construídos pelas próprias pinceladas grandes, sem textura acrescentada para preencher superfícies. Em vegetação, um ou dois gestos largos sugerem um grupo inteiro, não folhas/frondes. Em interiores, poucos planos sugerem madeira, tecido e parede; manter apenas silhuetas e encontros necessários para reconhecer função e apoio. Agrupar objetos por uso, sem alinhá-los como exposição. Não detalhar primeiro para depois aplicar acabamento de pintura. A clareza de planos e encaixes da lanterna é transferível, sua silhueta e composição não.

Separar composição de referência antes de anexar imagens. Em geração textual, registrar no pedido uma organização espacial própria; em edição, a origem continua sendo autoridade de composição. Examinar o catálogo completo, mas anexar somente as referências necessárias ao tratamento. Se uma referência do mesmo assunto estiver induzindo repetição de layout, usar uma âncora de outro assunto com papel explícito e registrar essa mudança. Saída de teste indicada pelo usuário pode ser âncora temporária da rodada, sem virar referência oficial.

Aplicar a economia aprovada já na primeira chamada. Usar os prompts de **única revisão** da [rodada 02](../../../docs/design/studies/skill-validation/round-02/prompts.md) como calibração de tratamento; os prompts iniciais dessa rodada produziram detalhe excessivo e não são modelos de sucesso. Traduzir o tratamento para a operação: em criação, gerar diretamente com poucos planos; em edição, repintar preservando a origem. Adaptar o assunto e seus encaixes essenciais, sem transportar inventários, composição ou contagens locais de pinceladas entre cenas. Não é necessário gerar uma versão detalhada antes da simplificada.

Na ferramenta integrada, para entradas todas locais, usar `referenced_image_paths` e não `num_last_images_to_include`; abrir o alvo local antes da edição. Quando depender de anexos sem caminho, usar o menor contexto recente que contenha todas as entradas, explicando seus papéis. Não combinar os dois mecanismos. Se faltar uma entrada nesse contexto, solicitar que seja anexada novamente; não omiti-la silenciosamente. Evitar contaminar uma série com imagens rejeitadas ou saídas anteriores não declaradas.

## Avaliação, revisão e registro

Abrir cada saída real em resolução nativa e comparar com os originais aprovados. Examinar também miniatura próxima de 240 px e cinza; testar recortes só se a aplicação exigir. Registrar **Aprovado, Parcial ou Reprovado**, com observação concreta, para formas, pinceladas, materiais/texturas, bordas, cores, iluminação, profundidade e acabamento/detalhes. Em A, acrescentar comparação origem/resultado de conteúdo, geometria e composição.

Função, identificação, originalidade e preservação essencial são impeditivos; aparência nostálgica não compensa falha. Separar avaliação técnica de aprovação do usuário e distinguir limite do gerador de problema do pedido. Não alterar perfil ou referências para acomodar resultado ruim.

Na miniatura e no original, conferir se apoio/fundo se leem como massas, se o foco concentra os acentos e se a organização espacial vem do pedido/origem. Folhagem enumerada, textura de desgaste espalhada, acessórios extras e cena copiada da referência exigem diagnóstico localizado; não compensar apagando detalhes estruturais ou desfocando a imagem inteira.

A aprovação do usuário da rodada 02 define a calibração artística vigente. Avaliar novas saídas contra esse nível de simplificação, sem reintroduzir minúcia para corrigir ressalvas técnicas históricas. Rejeitar regressão quando folhas, veios, costuras ou pequenas manchas passam a construir a superfície em vez dos planos largos. A oficina aprovada ainda tem algumas marcas de superfície: sua presença não autoriza amplificá-las. Aprovação dos exemplos não comprova repetibilidade automática nem transformação fotográfica; conferir os pixels de cada nova saída.

Se houver falha, descrever a região e a mudança pretendida. Fazer no máximo uma revisão direcionada dentro do pedido autorizado, preservando os itens já corretos. Persistindo divergência ou exigindo mudança de conteúdo/direção, apresentar resultado e opções para revisão do usuário antes de outra rodada. Não iniciar séries indefinidas de gerações.

Salvar novas saídas do projeto no destino solicitado ou em subpasta de estudos, sem sobrescrever originais aprovados. Manter registro com: pedido validado e versões; entradas/papéis e hashes disponíveis; prompt positivo/negativo integral; ferramenta, parâmetros enviados, modelo/seed efetivamente conhecidos; dimensões solicitadas/observadas; caminhos das saídas, avaliação e revisões. Desconhecido permanece desconhecido. Não duplicar PNGs de referência. Sem imagem gerada e examinada, não declarar validação visual.

## Uso

`Use $guardian-bay-illustration para transformar a imagem anexada, preservando seus objetos e enquadramento, em uma ilustração editorial 3:2.`

`Use $guardian-bay-illustration para criar uma oficina costeira original, com bancada e ferramentas guardadas, 1536 × 1024, sem texto.`

Fotografia comercial fiel, UI, banco e publicação não fazem parte desta Skill. Sua criação não comprova seleção automática pelo cliente: se ela não aparecer no catálogo da sessão, carregar este SKILL.md explicitamente ou verificar descoberta numa nova sessão.
