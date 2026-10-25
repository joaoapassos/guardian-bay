# Validação da skill e de implementações futuras

[Skill](../SKILL.md) · [Compatibilidade](compatibility.md) · [Tokens](motion-tokens.md)

Separar três evidências: qualidade documental da skill, decisões de um agente que a utiliza e comportamento de uma implementação em navegador. Passar no primeiro nível não comprova os outros. Não gerar componente de produção, dependência ou rota apenas para validar esta entrega.

## Skill e documentação

- Executar `quick_validate.py` fornecido pela skill-creator sobre a pasta desta skill, usando interpretador existente com PyYAML; não instalar pacote por consequência implícita.
- Conferir frontmatter `name`/`description`, descoberta específica de motion, links locais, referência às regras do projeto e abertura somente das referências necessárias.
- Garantir que os três modos têm critérios, mecanismo recomendado, fallback e falhas; tokens têm uma única definição e propostas novas estão identificadas.
- Reavaliar se orientação de compatibilidade distingue React direto, React efetivo do App Router, tipos e capacidade do browser; não escrever que todo React 19.x suporta ViewTransition.
- Revisar decisões com pedidos concretos, sem edições de aplicação: catálogo → produto com Suspense; troca entre áreas; input urgente; erro de acesso e roots distintos. A resposta deve identificar fatos a verificar e limites, sem instalar dependências ou inventar prontidão.
- Inspecionar diff: somente arquivos da skill e referências autorizadas. Esta tarefa não atualiza React/Next, configura animação ou muda documentação de design aprovada.

## Matriz para implementação futura

Executar em build de produção quando houver interface real; desenvolvimento pode ter prefetch/streaming diferentes. Usar fixtures/testes próprios do projeto para falhas e acesso, sem expor dados reais. Nenhuma linha abaixo é um resultado já aprovado.

| Cenário | Observação verificável esperada |
| --- | --- |
| Navegação rápida entre áreas | Um padrão, pedido iniciado sem esperar animação, entrada/saída contínuas e nenhum loading/hold fictício |
| Navegação lenta com Curtain | Indicador após cobertura somente enquanto há pendência; limite de oclusão revela fallback e restaura interação |
| Falha de rede/erro da página | Erro/saída acessíveis; máscara, inert e scroll lock removidos; sem repetição automática de navegação/compra |
| Destino inexistente ou acesso negado | Resposta segura real do servidor revelada; nenhum snapshot privado e nenhum pedido de promoção de acesso |
| Redirect Admin → Login/404 | Intenção antiga não mantém cortina esperando Admin; confirmar guard real sem alterá-lo |
| A → B → C rapidamente | Callback de B não conclui/cobre C; última intenção vence, sem renovar oclusão para sempre |
| Cancelamento CSS/unmount/exceção | Limpeza idempotente de timers/listeners/animations e restauração de foco/scroll/atributos |
| Aba em background/bfcache | Retorno não restaura máscara antiga; reconciliar destino e liberar interface mesmo sem evento de animação |
| Catálogo → produto já preparado | Mesma entidade/mídia forma par único e só a região relevante faz morph; restante não anima por padrão |
| Destino passa por Suspense | Nenhum morph retroativo com card desmontado; conteúdo chega por reveal simples ou direto, sem espera artificial |
| Imagem ausente/lenta/erro | Placeholder com área estável, nome/preço/ação utilizáveis; nenhuma espera infinita de decode |
| Produto → catálogo por Back | Histórico e posição preservados; morph só se origem/commit/viewport viáveis, sem converter Back em novo push |
| Ctrl/Cmd-click, download, hash e link externo | Comportamento nativo, sem interceptação de cortina ou duplicação de navegação |
| Accordion/descrição quando existentes | Expansão consistente, sem Tab em conteúdo invisível ou altura residual após cliques rápidos |
| Galeria quando existente | Última seleção visível, proporção fiel, foco conservado; sem criar novas mídias |
| Drawer/Dialog | Entrada/saída respeitam ciclo do componente, Escape/Tab/retorno de foco; nenhum modal aninhado |
| Input e atualização local rápida | Digitação/foco/pressed imediatos, trabalho pesado não urgente separado, sem fila visual de estados obsoletos |
| Carrinho/checkout | Sucesso só confirmado pelo servidor; movimento não reenvia Action nem altera ordem comercial |
| Query/filtro ou refresh no mesmo pathname | Sem Curtain global automática; contexto e URL preservados, dados pendentes não confundidos com página pronta |
| Reduced motion inicial e alterado durante efeito | Sem movimento espacial/espera de animationend; feedback textual, teclado e conteúdo permanecem operáveis |
| Mobile/touch/zoom | Sem hover obrigatório ou overflow global; foco e ações não ficam sob overlay; movimento não esmaga produto |
| API ausente ou suporte parcial | Navegação e dados completos com fallback; falha de captura não é erro de compra; CSS local não depende da API |
| Root layouts diferentes | Full page load tratado como limite; controlador anterior não é prometido como persistente |

## Evidência técnica e desempenho

Registrar versão do framework/runtime, build, navegador/dispositivo, preferência de movimento, padrão usado e fallback observado. Comparar navegação com motion ligado/desligado no mesmo cenário, sobretudo aquisição de dados, LCP, INP, CLS, tarefas longas e estabilidade de frames. Usar ferramentas já disponíveis; não declarar ganho, fluidez ou economia de recursos sem medição.

Capturar traces curtos para identificar layout/paint custosos, leituras/escritas alternadas e trabalho fora da viewport. Confirmar que duração proposta não virou atraso de rede nem janela de bloqueio. Verificar hit-testing e foco durante snapshots, não apenas screenshot do estado final. Um teste que só confirma classe CSS ou palavra no documento não valida continuidade ou ausência de travamento.

Reexecutar os checks proporcionais definidos no AGENTS/SDLC para a futura alteração. Motion puro não dispensa testes de regressão quando tocar transporte de navegação, foco de confirmação ou operação sensível; também não justifica rodar uma auditoria ampla sem relação com a mudança.

## Estado desta entrega

Consulta documental/probes locais em 25/10/2026: versões, exports, tipos, configuração, layouts e loading existentes foram inspecionados. O guia local e as referências oficiais foram consultados; a skill Vercel foi usada como referência técnica sem instalação/cópia. O vídeo indicado não estava acessível.

A verificação oficial da estrutura da skill passou com Python do sistema WSL já existente; o Python Windows e o venv local consultados não possuíam PyYAML. Não foram instaladas dependências. Uma avaliação independente, somente leitura, aplicou a skill aos cenários de catálogo/produto com Suspense/Voltar e Curtain administrativa com acesso negado/navegação sucessiva. Seleção e fallbacks foram coerentes; correlação de prontidão e estabilidade da entrada continuam condicionadas à prova na futura implementação.

Durante a entrega, a documentação visual foi movida no workspace para `docs/visual-identity`; os links desta skill usam a localização encontrada. Links antigos de DESIGN.md e outras fontes não foram corrigidos nesta Task de criação da skill. Inspeção de exports não prova morph executado no App Router. Os cenários da matriz aguardam futura implementação; não houve teste de animação, acessibilidade ou desempenho em navegador nesta Task.
