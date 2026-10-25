# Validação — rodada 02

## Aprovação posterior e estado atual

Após esta avaliação, em 25/10/2026, o usuário declarou **“agora sim, aprovado”** e solicitou consolidar as correções. Os finais [forest.png](forest.png) e [workshop.png](workshop.png) estão aprovados artisticamente e registrados como referências prioritárias no [catálogo](../../../illustration-references.md#calibração-vigente--rodada-02-aprovada). Os iniciais continuam rejeitados quanto à densidade. A Skill deve aplicar desde a primeira chamada o tratamento dos prompts de única revisão, sem repetir a etapa detalhada. As notas técnicas abaixo são o histórico anterior à aprovação, preservado sem reescrever a evidência. Repetibilidade e transformação de fotografias continuam pendentes; não houve nova geração nesta consolidação.

## Avaliação técnica anterior à aprovação

25/10/2026. **Parcial; não pronta para consolidar o contrato final.** Estudos de geração textual, não transformação fotográfica. O usuário rejeitou o excesso de detalhe nas primeiras saídas desta rodada e esclareceu: planos simples, mínimo de detalhes, pinceladas que apenas sugiram a imagem. Esse esclarecimento orientou uma revisão por imagem. Não altera o perfil JSON nem promove testes a referências oficiais.

## Evidência e diagnóstico

- [Floresta anterior](../forest.png): frondes e folhas individualizadas no primeiro plano; atmosfera coerente, arranjo próximo da referência aprovada.
- [Oficina inicial anterior](../workshop-initial.png): acessórios adicionais não solicitados. [Revisão anterior](../workshop.png): inventário reduzido, porém objetos separados como exposição, bordas igualmente firmes.
- [Lanterna anterior](../lantern.png): âncora positiva temporária indicada pelo usuário. Planos opacos largos constroem metal e volume; poucos encontros descrevem alça, suportes e regulador. Isso é transferível; cor vermelha, silhueta e composição isolada não são regras universais.
- [Floresta inicial desta rodada](forest-initial.png) e [oficina inicial desta rodada](workshop-initial.png): apesar do pedido de massas, mantiveram folhas, casca e pequenas marcas de superfície. Confirmação visual de falha, também apontada pelo usuário.

Hipótese operacional: instruções de hierarquia ainda permitiam renderizar o assunto inteiro com pequenas manchas; “pictórico” foi interpretado como textura sobre volume literal. Não é possível determinar a causa interna do modelo. A revisão pediu a própria construção por poucos planos, com exclusões localizadas. A Skill passou a exigir essa economia antes de chamar a ferramenta.

## Arquivos e controles

- [Floresta revisada](forest.png), [oficina revisada](workshop.png).
- [Prancha anterior × nova, cinza e miniaturas](comparison.png).
- [Prompts integrais e parâmetros](prompts.md), [pedidos](requests.json).
- Lanterna mantida no caminho anterior, sem duplicação e sem reexecução.

Mesma ferramenta integrada, saída opaca, pedido 1536 × 1024 / 3:2 nos dois assuntos. Modelo e seed não expostos; não se afirma identidade do backend. Nas gerações iniciais, somente a lanterna anterior foi anexada como referência de tratamento. Nas revisões, somente cada saída inicial como alvo. Revisão única por assunto; nenhuma tentativa posterior.

Além da simplificação, houve mudança explícita de composição e seleção das referências de entrada. É um teste controlado operacional, não isolamento causal de uma única variável. Não há foto real para validar preservação do fluxo A.

## Comparação observável

Avaliação técnica do assistente, não aprovação do usuário. Exame das saídas 1536 × 1024 e da prancha em cor, cinza e miniatura 240 px.

| Critério | Floresta revisada | Oficina revisada |
| --- | --- | --- |
| Formas | Aprovado — arbustos viraram massas conectadas; trilha e troncos continuam legíveis. | Aprovado — mochila e lona têm poucos planos, bancada apoiada e ferramentas reconhecíveis. |
| Pinceladas | Parcial — gestos maiores definem copas e chão, mas várias silhuetas parecem recortes regulares. | Parcial — planos ampliados nos objetos; parede e piso ainda cobertos por pequenas marcas. |
| Bordas | Parcial — encontro de massas claro, porém copas têm recorte reiterado e poucas bordas perdidas. | Parcial — objetos continuam destacados com firmeza semelhante; pouca integração com o fundo. |
| Materiais/texturas | Aprovado — madeira, pedra e vegetação sugeridas por orientação/plano, sem casca ou folhas enumeradas. | Parcial — mochila e lona simplificadas; tampo ainda tem textura distribuída por toda a área. |
| Cores | Aprovado — cinzas verdes, terra e distância fria, sem brilho forte. | Parcial — neutros foscos, mas topo iluminado e cabos coloridos ainda ganham destaque excessivo. |
| Luz | Aprovado — valores próximos e distância clara mantêm luz difusa. | Parcial — apoio coerente, mas grande mancha diagonal na parede acentua iluminação mais direcional. |
| Profundidade | Aprovado — sobreposição e menor contraste no fundo preservam espaço sem minúcia. | Parcial — perspectiva plausível, porém bancada ainda parece volume renderizado mais que planos ambientais. |
| Acabamento/detalhe | Parcial — redução forte, mas formas repetidas podem parecer diagrama recortado; falta calibrar gesto manual. | Parcial — melhora nos objetos, persistência de textura no cenário e ferramentas alinhadas. |
| Linguagem global | Parcial — economia avançou, acabamento está mais chapado que o da âncora. | Parcial — simplificação avançou, ambiente ainda literal e montado. |

A lanterna anterior continua sendo o benchmark positivo de pinceladas, simplificação, acabamento e materiais. Não foi reexecutada: **não se comprovou que a Skill corrigida preserva seu desempenho**. A prancha a repete apenas como controle visual estático.

A floresta melhorou claramente na economia de informação; isso não equivale a aprovação final. A oficina melhorou parcialmente em mochila/lona e reduziu marcas de madeira, mas continua o principal impedimento artístico. A consistência geral ainda não está comprovada: a floresta ficou mais chapada, enquanto a oficina conserva textura e modelagem mais literais.

## Correção e divergências

A Skill agora exige gestos que construam as próprias massas, materiais sugeridos por pouquíssimos planos e detalhes apenas onde necessários à identificação/função. Inclui separação explícita entre composição e referência, uso declarado de âncora temporária e inspeção de ruído localizado.

A orientação atual do usuário enfatiza economia maior que o acabamento que alguns testes anteriores exibiam. Isso foi registrado, sem alterar silenciosamente especificação, catálogo ou contrato. A simplificação extrema da floresta é uma hipótese visual submetida à revisão, não novo padrão aprovado.

## Problemas e limites

- Textura e literalidade persistentes na oficina → transferência de estilo incompleta → bloqueia aprovação visual, não a conclusão desta rodada.
- Silhuetas repetidas/recortadas na floresta → risco de acabamento gráfico em vez de pincelada → bloqueia aprovação plena.
- Sem fotografias reais → preservação de conteúdo em transformação não testada → não bloqueia teste textual; fluxo A pendente.
- Modelo/seed não expostos → reprodução exata e comparação causal limitadas → não bloqueia registro do experimento.
- Validador Python da Skill depende de PyYAML ausente → check oficial indisponível; verificações locais alternativas descritas abaixo → não bloqueia os estudos; nenhuma dependência instalada.

## Como conferir

Abrir originais e prancha; comparar principalmente desaparecimento de folhas individuais, escala das marcas, textura no tampo/paredes e hierarquia das ferramentas. Não julgar só por miniatura. PNGs gerados foram copiados sem recompressão; apenas a prancha tem redução/cinza.

Validar pedidos com o schema de `docs/design/` e Zod instalado, conforme o procedimento do contrato; conferir os três pedidos individualmente e igualdade de estilo. Conferir links/frontmatter da Skill e whitespace. Os hashes de saídas estão em `hashes.sha256`; arquivos anteriores e referências aprovadas devem permanecer intactos.

Próxima Task sugerida: revisão do usuário sobre o grau de simplificação da floresta e o acabamento ainda excessivo da oficina; só depois autorizar outro teste direcionado. Não avançar ao contrato final ou integração.
