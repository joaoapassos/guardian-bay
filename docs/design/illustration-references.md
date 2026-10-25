# Referências artísticas oficiais — Guardian Bay

Aplicação estruturada posterior: [contrato de ilustração 1.0.0](illustration-contract.md), com perfil fixo e pedidos variáveis; as imagens abaixo continuam sendo a evidência artística aprovada.

Consolidação de 25/10/2026, atualizada após a aprovação explícita da rodada 02. O catálogo preserva os três estudos iniciais do commit `850a038` e identifica abaixo a calibração atual. Orienta futuras transformações independentemente do assunto; não constitui autorização para novas gerações.

A [linguagem de ilustração](illustration-language.md) interpreta os princípios; este catálogo identifica sua evidência visual aprovada. Para calibrar o resultado, examinar os originais abaixo antes dos prompts históricos. [DESIGN.md](../../DESIGN.md), [IDV](../visual-identity/idv.md) e [Fundamentos](../visual-identity/fundamentos.md) continuam responsáveis pela identidade da interface: creme predominante, azul costeiro protagonista, sálvia e terracota de apoio. As pinturas não precisam repetir literalmente essa distribuição.

## Calibração vigente — rodada 02 aprovada

Após examinar as revisões, o usuário afirmou: **“agora sim, aprovado”**, pedindo consolidar as correções para execuções futuras. A aprovação corresponde aos arquivos finais `forest.png` e `workshop.png` da rodada 02, não aos arquivos `*-initial.png`. Esses dois originais passam a ser referências oficiais prioritárias de simplificação; os estudos iniciais abaixo continuam preservados como histórico de apoio. A lanterna vermelha da primeira validação mantém seu papel de âncora positiva explicitamente indicado pelo usuário, sem alegar reexecução nesta rodada.

| ID | Original prioritário / papel | Dimensões | SHA-256 |
| --- | --- | --- | --- |
| GB-ILL-R2-FOREST | [Floresta revisada](studies/skill-validation/round-02/forest.png) — massas vegetais e profundidade | PNG, 1536 × 1024, 3:2 | `9bc52cc1b080ae99ee473cf170d7c319d19817f42f4c73038950219393aeb831` |
| GB-ILL-R2-WORKSHOP | [Oficina revisada](studies/skill-validation/round-02/workshop.png) — planos de interior, tecido e madeira | PNG, 1536 × 1024, 3:2 | `886ac2f39381d55f4ee45c43964285ee50cb534cab09b4d089c36621e09ec58d` |
| GB-ILL-LANTERN-ANCHOR | [Lanterna vermelha](studies/skill-validation/lantern.png) — âncora positiva de objeto/material | PNG, 1536 × 1024, 3:2 | `15d38472f8435262e560f356e43c5330f094e79558e4d79fd3e1d93d7fa80a7f` |

**Tratamento consolidado:** arbustos sugeridos por manchas conectadas, troncos por poucos planos, mochila e lona por silhueta e faces amplas, materiais sem enumeração de microtexturas. As marcas constroem as formas; não são filtro sobre render detalhado. Preservar cores foscas, geometria reconhecível e espaço por sobreposição/valores. A floresta mais chapada foi aceita; não aumentar sua densidade para recuperar o acabamento antigo. Marcas remanescentes no tampo/parede da oficina não são obrigação de estilo. Inventário, recorte, cor vermelha e número de planos de cada cena não são regras universais.

**Rastreabilidade:** [prompts e parâmetros da rodada 02](studies/skill-validation/round-02/prompts.md), especialmente “Floresta — única revisão” e “Oficina — única revisão”, e [relatório](studies/skill-validation/round-02/README.md). As duas saídas finais são edições de gerações textuais originais, não fotografias transformadas. Ferramenta `image_gen.imagegen`, `transparent_background: false`, resolução solicitada/observada 1536 × 1024; modelo e seed desconhecidos. Origens: `exec-7fa035c5-3daa-4781-aadf-b9cfca5bbcd2.png` e `exec-9ed3c3a6-0a12-4592-a89d-bad7af258739.png`, copiadas sem recompressão. Para a lanterna, prompt e operação permanecem no [registro anterior](studies/skill-validation/prompts.md). Condições de uso conhecidas são as mesmas descritas neste catálogo; não há nova licença documentada.

**Precedência para execução:** pedido atual → esta aprovação e originais prioritários → regras técnicas da linguagem → estudos históricos. O perfil JSON 1.0.0 ainda cita o conjunto inicial: não deve ser tratado como lista atual completa nem usado para sobrepor a calibração aprovada. Sua atualização/versionamento fica para a Task do contrato; não foi alterado silenciosamente. A Skill deve combinar o perfil com esta calibração explícita e usar a instrução econômica desde a primeira chamada.

O relatório mantém ressalvas técnicas observadas antes da aprovação. Elas não anulam a seleção nem exigem mais detalhe. Novas saídas ainda precisam ser examinadas: a aprovação não demonstra repetição automática, outro modelo, outro assunto ou preservação fotográfica.

## Seleção inicial e evidência de aprovação

| ID estável | Original, sem duplicação | Assunto | Dimensões e formato |
| --- | --- | --- | --- |
| GB-ILL-A | [a-floresta.png](studies/a-floresta.png) | Trilha entre coníferas, arbustos e pedras | PNG, 1536 × 1024, 3:2 |
| GB-ILL-B | [b-oficina.png](studies/b-oficina.png) | Oficina frontal com bancada, ferramentas e equipamentos guardados | PNG, 1536 × 1024, 3:2 |
| GB-ILL-C | [c-lanterna.png](studies/c-lanterna.png) | Lanterna tradicional isolada sobre apoio neutro | PNG, 1536 × 1024, 3:2 |

**Evidência da seleção na conversa:** o usuário disse que aprovaria floresta e lanterna, pediu refinamentos apenas da oficina, preferiu a variante frontal e avaliou sua revisão como “melhorou”. A instrução posterior de remover as demais imagens e deixar apenas as validadas consolidou a escolha de A/C e da revisão frontal F. O [relatório versionado](studies/README.md) registra essa seleção e a troca do nome de F para `b-oficina.png`. Esta Task solicita torná-las referências oficiais, sem escolher novos arquivos autonomamente.

Não integram o catálogo: oficina B antiga, variantes v1/gestual/fosca/abstrata, oficinas D/E e ensaios sem confirmação. Foram removidos do repositório na limpeza anterior; a persistência de seus prompts não significa aprovação. [comparacao.png](studies/comparacao.png) e [recortes.png](studies/recortes.png) são derivados diagnósticos da seleção, não novas artes oficiais nem banners aprovados.

## Características compartilhadas observadas

Leitura dos três originais a resolução nativa; a [prancha](studies/comparacao.png) auxilia a comparação. A descrição abaixo registra aparência visual, sem afirmar como um pintor ou o modelo executou cada marca.

| Dimensão | Evidência comum e aplicação a outros assuntos | O que pertence à cena |
| --- | --- | --- |
| Formas e geometria | Silhuetas reconhecíveis, divididas em poucos planos grandes de valor/cor. Pedras de A, portas de B e corpo de C conservam espessura e construção sem relevo fotográfico. Simplificar a execução, mantendo informação que explica a função. | Coníferas e pedras de A; retângulos de armários em B; arcos e curvas da lanterna em C. Não impor a mesma geometria a todos os temas. |
| Pinceladas | Manchas opacas sobrepostas constroem planos; mudanças de tom têm limites irregulares em regiões escolhidas. Direção acompanha a forma: vertical nos troncos, horizontal na bancada, vertical/curva nos suportes e corpo da lanterna. Fazer a marca construir volume, sem cobrir tudo de rabiscos. | A tem mais subdivisões na vegetação; B tem campos mais quietos; C tem manchas largas no metal. Não exigir igual quantidade ou tamanho absoluto de marcas. |
| Texturas e materiais | Material é sugerido primeiro por forma, cor e direção dos planos. Não há necessidade de veios, trama, parafusos ou microtextura para identificar madeira, tecido, pedra ou metal. Variações discretas de superfície podem existir, subordinadas à leitura. | A separa rocha e vegetação; B distingue lona, parede e madeira; C precisa sugerir vidro e metal. Reflexo não é requisito para parede ou tecido. |
| Contornos e bordas | A separação vem sobretudo do encontro de cores e valores, sem contorno preto contínuo. Bordas úteis definem alça, ferramenta, porta e pedra; regiões próximas em valor se integram. | A perde mais definição na distância; B/C preservam muitas bordas firmes. A quantidade de bordas perdidas não é uniforme entre as três. |
| Luz e sombra | Volume legível por planos claros/escuros e sombras amplas; ausência de brilho especular generalizado, feixes luminosos ou aparência polida de render. Sombra situa o objeto ou separa massas. | A usa atmosfera distante; B tem espaço raso e fundo quase cenográfico; C usa sombra de contato e reflexão localizada. Não aplicar névoa ao objeto isolado nem achatar toda paisagem. |
| Cor e contraste | Grandes massas acinzentadas, verdes/terras/azuis quebrados, aspecto fosco e escuros cromáticos. A hierarquia depende mais da distribuição de valores que de cores vivas. Há luzes localizadas: opacidade pictórica não significa imagem toda escura nem vidro fisicamente opaco. | A admite olivas mais claros; B combina neutros quentes com pequenos apoios azul/terracota; C concentra azul-cinza no corpo. Nenhuma dessas paletas é obrigatória em outra cena. |
| Detalhamento e acabamento | Detalhes estruturais permanecem: junções, alças, dobras e compartimentos são formas simples que se integram ao conjunto. Evitar tanto a enumeração de texturas quanto a abstração que apaga função. O acabamento pode ser definido sem ser fotográfico. | A contém mais elementos pequenos; B organiza muitos objetos cotidianos; C concentra informação numa única peça. Número de objetos não define densidade de textura. |

**Núcleo transferível:** formas intencionais e legíveis, volumes por planos pintados, marcas direcionais sem ruído uniforme, detalhes discretos que dão forma, cor fosca e hierarquia de valores. Nostalgia e cuidado decorrem de relações materiais e de uso; não dependem de copiar uma oficina, usar filtro sépia ou colocar equipamento antigo em toda imagem.

## Fichas e rastreabilidade de geração

Os prompts integrais permanecem em uma única fonte, [prompts.md](studies/prompts.md); os localizadores abaixo distinguem as instruções das artes aprovadas das rodadas rejeitadas com nomes parecidos. Instruções negativas estão no próprio texto dos prompts, sem parâmetro negativo separado.

### GB-ILL-A — floresta

- **Por que foi aceita:** troncos e pedras por planos, trilha identificável, vegetação agrupada e profundidade atmosférica; formas simples ainda representam um ambiente habitável e calmo.
- **Prompt exato:** seção “Seleção atual — referência da garagem”, prefixo comum concatenado ao bloco “Assunto refA” em [prompts.md](studies/prompts.md#seleção-atual--referência-da-garagem). A seção inicial “A — a-floresta.png” pertence à série gestual superada e não é o prompt deste arquivo.
- **Operação:** geração por `image_gen.imagegen`, `transparent_background: false`, `num_last_images_to_include: 3`. O contexto incluía a garagem anexada como referência técnica e saídas recentes rejeitadas; o prompt as diferenciava. Não há manifesto dos bytes/ordem das entradas arquivado no projeto.
- **Origem da saída:** `exec-f337e1fa-f4ea-4bf5-8f58-a25416cd9025.png`, copiada sem alteração para o caminho canônico. Tamanho solicitado no prompt e observado: 1536 × 1024.
- **Particularidades, sem universalizar:** paisagem com camadas e bordas menos definidas ao longe; folhagem possui mais marcas pequenas que B/C. Aprovação não converte essa densidade em exigência para outros temas.

### GB-ILL-B — oficina frontal refinada

- **Por que foi aceita:** frontalidade e profundidade rasa dão sensação de cenário pintado; ferramentas, dobras, alças e gavetas continuam identificáveis, mas as marcas de desgaste e manchas que disputavam atenção diminuíram. Detalhe integrado é o principal aprendizado desta referência.
- **Prompt exato:** seção [“F — revisão localizada da frontal”](studies/prompts.md#f--revisão-localizada-da-frontal), em uma chamada de edição. O prompt não foi simplesmente concatenado ao prefixo de refA/refC. A seção “Assunto refB” gera a oficina antiga descartada.
- **Operação:** `image_gen.imagegen`, `transparent_background: false`, `num_last_images_to_include: 2`, com a oficina D como alvo e a garagem anexada como referência técnica. D foi examinada com `view_image` antes da edição. O prompt preservava composição, objetos e posições; a mudança era o tratamento pictórico.
- **Origem da saída:** `exec-4da3bd84-1181-4968-a5d5-03d36fbf79fd.png`, antes `f-oficina-detalhes-integrados.png`, depois copiada sem alterar pixels para `b-oficina.png`. Tamanho solicitado e observado: 1536 × 1024.
- **Dependência histórica:** a geração de D está registrada em “Novos ensaios da oficina — cenário em planos 2D”, prefixo comum + “Assunto D”. A imagem D foi descartada a pedido do usuário; não se promete reconstrução exata dessa edição apenas pelo texto.
- **Particularidades, sem universalizar:** parede frontal, bancada longa, janela alta, compartimentos e equipamento guardado. A frontalidade é uma solução aprovada para este interior, não regra de composição de todas as artes.

### GB-ILL-C — lanterna

- **Por que foi aceita:** a linguagem permanece no objeto isolado; corpo, alça, suportes, câmara e regulador são lidos por silhueta e planos. Metal azul-cinza não depende de textura brilhante nem de cenário nostálgico.
- **Prompt exato:** seção “Seleção atual — referência da garagem”, prefixo comum + bloco “Assunto refC” em [prompts.md](studies/prompts.md#seleção-atual--referência-da-garagem). A seção inicial “C — c-lanterna.png” pertence à rodada gestual superada.
- **Operação:** `image_gen.imagegen`, `transparent_background: false`, `num_last_images_to_include: 5`. Contexto crescente com garagem e saídas recentes; não equivale ao conjunto de entradas de A.
- **Origem da saída:** `exec-8333c0c2-7025-4a64-ab97-f0cb88977de3.png`, copiada intacta para o caminho canônico. Tamanho solicitado e observado: 1536 × 1024.
- **Particularidades, sem universalizar:** close central, apoio neutro, sombra de contato e reflexão no vidro. A aprovação artística não comprova funcionamento mecânico nem exige fundo neutro para outras ilustrações.

### Parâmetros comuns conhecidos e ausentes

| Campo | Registro |
| --- | --- |
| Ferramenta | `image_gen.imagegen`, integrada; geração de A/C e edição de B |
| Modelo efetivo e versão | **Desconhecidos**; não expostos. Não inferir pelo nome da ferramenta ou pela skill instalada. |
| Seed, sampler, steps, guidance e qualidade efetiva | **Desconhecidos**; não expostos nem selecionados |
| Transparência | `false` nas três chamadas; aparência opaca não equivale a afirmação sobre canais do PNG |
| Resolução/proporção | Solicitadas no prompt; 1536 × 1024, 3:2 verificadas no cabeçalho dos três arquivos |
| Pós-processamento dos originais | Nenhum registrado; não foram recomprimidos nem alterados nesta consolidação |
| Reprodutibilidade | Instruções rastreáveis, sem garantia de pixels idênticos; conjuntos de referências distintos e parte das entradas descartada |

### Integridade dos originais

SHA-256 calculado sobre os bytes completos dos PNGs em 25/10/2026. Os nomes de saída do gerador identificam procedência, não substituem estes hashes.

| ID | SHA-256 |
| --- | --- |
| GB-ILL-A | `c60cd094a647b8fe7b8dcf3f071463a8b4b3d074558112d3415e32dd41f2881c` |
| GB-ILL-B | `aa515a26673681bc52a88ea3c3971737c86f802095139744ad2a373d79a59797` |
| GB-ILL-C | `80f92868a4f2f2c823a59ffb0f657a2224215c23c27ed41749a5f072da652e64` |

## Origem e condições de uso conhecidas

Artes produzidas por geração/edição assistida para o Guardian Bay nesta conversa, com seleção e direcionamento do usuário. São referências oficiais **internas à direção artística do projeto**. Não atribuir sua execução a Édouard Caplain ou ao estúdio de Life is Strange.

Life is Strange (2015) e a garagem anexada foram referências técnicas; os [links e créditos conhecidos](illustration-language.md#2-referências-acesso-e-método) continuam na análise de origem. Nenhuma arte protegida foi incorporada ao repositório por esta Task. A autoria/versão exata dos anexos e a autorização de reutilização deles não foram documentadas.

Não há licença individual, cessão de direitos ou análise jurídica de uso comercial arquivada para estes estudos. Não inventar licença livre, exclusividade ou garantia de originalidade por serem gerados. A seleção permite seu papel de referência solicitado nesta Task; publicação de campanha e condições aplicáveis ao serviço não foram verificadas aqui. Fotografias comerciais permanecem independentes.

## Divergências e limites preservados

- **Grandes pinceladas versus detalhe discreto:** os prompts históricos exageram termos como “BIG CONSPICUOUS”. As imagens aprovadas mostram também planos quietos e traços estruturais menores. A [regra atual](illustration-language.md#formas-contornos-e-execução) já admite essa integração; não é necessário mudar a direção nem aplicar textura marcante a cada superfície.
- **Bordas perdidas:** mais evidentes no fundo de A que nos objetos de B/C. A alternância continua orientação da linguagem, sem requisito de quantidade uniforme ou correção dos originais aprovados.
- **Paleta fosca:** A conserva alguns olivas mais claros e C um reflexo claro. A orientação já permite hierarquia e reflexos seletivos; não interpretar fosco como proibição absoluta de luz ou como filtro cinza global.
- **Espaço:** a oficina rasa e a floresta profunda coexistem. Profundidade rasa não é característica universal da identidade; o tratamento por planos é que as aproxima.
- **Validação artística versus técnica:** avaliações parciais do [relatório](studies/README.md) continuam válidas como limites; não anulam a seleção do usuário nem comprovam repetibilidade. O recorte desktop da lanterna corta pega/base e não está aprovado para banner. Contraste HTML, acessibilidade e aplicação comercial continuam fora da validação.

Na consolidação inicial, não foi encontrada contradição que exigisse reescrever a linguagem. A aprovação posterior da rodada 02 refinou explicitamente o grau de simplificação; essa decisão está registrada no início deste catálogo e na linguagem. Os parâmetros históricos, os valores de marca e os pixels dos originais permanecem preservados.

## Como validar esta consolidação

1. Abrir os três originais e confirmar sua correspondência com a seleção e a revisão frontal F; não usar títulos antigos do histórico como evidência de aprovação.
2. Conferir dimensões e SHA-256 com os valores acima. `Get-FileHash -Algorithm SHA256` aceita os três caminhos em `docs/design/studies/`.
3. Seguir os localizadores dos prompts: refA/refC com o prefixo correto e B com o prompt de edição F; conferir referências e parâmetros efetivamente registrados.
4. Verificar que não houve mudança nos cinco PNGs existentes, duplicação ou incorporação de referências externas. Pranchas permanecem auxiliares.
5. Comparar novas propostas, em uma Task futura autorizada, por formas, planos, detalhe integrado e cor, sem exigir os mesmos objetos, enquadramento ou paleta de uma única referência.

Esta consolidação termina no catálogo. Transformações, JSON, Skill e novas ilustrações dependem de aprovação e Task própria.
