# Adoção do toolkit: contexto e seleção de capacidade

Status: desenho aprovado na conversa; execução autorizada por “so seguir”. Evidências finais em docs/setup.md.
Data: 2026-10-25.
Fonte: Vibe Coding Toolkit, revisão `790a895304e0c08b70a5b215c9d334f1c86b816c`, Prompt 12.
Baseline do projeto: `a7848532db810df2b174fb9c1391c5eb5c2e0320`.

## Intenção e sucesso

O usuário quer economizar tokens, passar tarefas adequadas aos modelos corretos e melhorar o contexto. A abordagem escolhida é ajustar e medir: melhorar instruções, recuperação de conhecimento e delegação; verificar resultados com casos representativos e registrar limites da medição.

A entrega cobre a avaliação do catálogo completo do toolkit, com integração das capacidades aplicáveis. Não se limita a recomendações. Sucesso significa fontes canônicas encontráveis, instruções consistentes, seleção explícita de capacidade nas delegações suportadas, qualidade preservada e cobertura documentada. Não significa instalar todos os componentes.

## Estado observado

- Checkout inicialmente limpo; npm e package-lock.json canônicos.
- Next.js 16.4.3, React 19.2.8, Biome 2.4.2, Vitest 4.1.12 e PostgreSQL/Drizzle já adotados. O README ainda cita Next.js 16.3.8 em um trecho.
- Node observado: 26.7.0; npm: 12.2.0. Isso não substitui a referência de runtime do CI.
- `npm run check` passou: Biome em 317 arquivos, geração de tipos/TypeScript e 121 testes em 27 arquivos.
- Arquitetura e segurança têm fontes canônicas em docs/architecture; identidade visual em DESIGN.md e docs/visual-identity. CLAUDE.md já importa AGENTS.md.
- AGENTS.md já contém invariantes e critérios seletivos de delegação. A configuração local define dois subagentes e um reviewer com modelo/esforço próprios.
- Superpowers e ferramentas nativas de subagentes estão disponíveis. Context7 e MCP de browser não apareceram na descoberta desta sessão; instalação/configuração global ainda não foi inspecionada.
- O clone do toolkit exigiu execução com acesso à rede e foi obtido fora do projeto. Nenhum script do toolkit foi executado.

## Abordagens consideradas

1. Ajustar apenas instruções e documentação: menor trabalho, mas sem evidência comportamental suficiente sobre recuperação e delegação.
2. Ajustar e medir: mesma base, com casos delimitados, revisão e comparação quando houver falha concreta. Foi recomendada e aprovada pelo usuário como abordagem.

Instalação indiscriminada e um novo orquestrador não atendem ao objetivo: aumentariam manutenção e contexto sem necessidade demonstrada.

## Restrições e antimetas

- Preservar produto, contratos, dados, stack, npm, lockfile, CI e controles existentes. Biome continua como formatter/linter principal; não adicionar ESLint apenas para copiar templates.
- Preservar o bloco gerado pelo Next.js e todas as garantias arquiteturais e de segurança. Mover detalhes exige rastreabilidade e links; encurtar não autoriza apagar garantias.
- Não mudar modelo principal, provedor, autenticação, permissões, custos ou configurações globais. Prerrequisitos globais exigem decisão específica com comando e efeito.
- Sem publicação, push, mensagens externas, migrations, produção, hooks de Git, novas exigências de branch/worktree ou atualização geral da máquina.
- Não criar roster fixo, servidor de memória, grafo sem necessidade, abstrações de produto ou dependências redundantes.
- Não alegar economia de tokens, carregamento em nova sessão, integração funcional ou melhoria de confiabilidade sem observação correspondente.

## Estrutura proposta

### Contexto em camadas

AGENTS.md será uma entrada curta para comandos, precedência, invariantes essenciais e mapa de fontes. Os detalhes permanecem em documentos responsáveis, carregados por necessidade. A arquitetura aprovada continua canônica; não criar docs/architecture.md concorrente. DESIGN.md e docs/visual-identity continuam responsáveis pelo visual.

Mapear os nove destinos do manifesto: README.md, PRODUCT.md, AGENTS.md, CLAUDE.md, arquitetura existente, design existente, docs/onboarding.md, docs/quality.md e docs/setup.md. Antes de criar documentos, procurar equivalentes. Produto documenta somente comportamento observado; hipóteses ficam identificadas.

Uma política de contexto/delegação ficará próxima da documentação de desenvolvimento e será referenciada pelo índice. Registrar fonte, última verificação e gatilhos de invalidação de fatos duráveis. Handoffs temporários não são memória permanente; retomada verifica checkout, arquivos e processos reais. Não indexar secrets, envs, caches ou artefatos grandes.

### Seleção de capacidade por tarefa

Preferir execução direta ou ferramenta determinística para trabalho pequeno. Delegar quando isolamento de contexto, especialização ou independência compensarem coordenação. Escolher o modelo mais leve capaz de cumprir critérios de aceitação, com esforço explícito quando suportado, usando o catálogo realmente disponível no momento.

Busca delimitada, inventário e edição mecânica favorecem capacidade leve; implementação delimitada exige raciocínio e checks apropriados; arquitetura, segurança, autorização, migrações, concorrência e diagnóstico ambíguo exigem capacidade maior conforme risco. Não alterar configurações de papéis que o host fixe nem reduzir revisão crítica por preço.

Briefings incluem objetivo, arquivos permitidos, instruções pertinentes, dependências/recursos, critérios, checks e retorno compacto. Preferir contexto novo, sem histórico integral. Um escritor por arquivo; principal é dono de configuração compartilhada, lockfiles e Git. Limite de dois subagentes simultâneos; sem fan-out recursivo por padrão.

Falha de entendimento pede diagnóstico e eventual escalada; não repetir tentativas baratas indefinidamente. Cada despacho recebe limite explícito de tentativas e escopo. Não transformar nomes comerciais atuais em política portátil. A configuração concreta do reviewer pode permanecer específica quando exigida pelo host; documentar a diferença.

### Medição e evidência

Registrar separadamente: bytes/linhas do contexto inicial; fontes recuperadas; modelo/esforço observáveis; comandos/resultados; limites; retrabalho e tempo quando mensurável. Bytes e linhas não são estimativa de tokens. Usar consumo de tokens/custo somente se exposto pelo cliente.

Executar smoke cases de descoberta de instruções/comandos, recuperação de regra pertinente e seleção de capacidade com tarefa delimitada. Um subagente novo prova contexto isolado, não reinício do aplicativo. Incluir caso de handoff desatualizado e revisão somente leitura quando executáveis em fixture descartável.

Aplicar Harness2 como adaptação nativa: preservar cliente/autenticação e usar checks existentes. Fazer no máximo uma comparação de candidato para uma falha observada, com mesma entrada e critérios. Sem falha concreta, documentar procedimento reutilizável e não inventar experimento. CLI oficial e benchmarks pagos ficam fora do escopo.

## Cobertura do catálogo para o plano

Esta matriz define a avaliação e a ação pretendida; não afirma instalação ou execução. O plano detalhará fontes oficiais, pré-requisitos e checks após leitura dos guias de cada integração. docs/setup.md receberá estado observado, necessidade, ação, escopo, dependências, risco, evidência e condição de retomada para cada item.

| Componente | Necessidade e estado inicial | Ação/escopo proposto | Dependência, risco e validação |
| --- | --- | --- | --- |
| 01 Superpowers | Disponível na sessão | Reutilizar e evitar duplicação | Verificar descoberta e uso proporcional |
| 02 Subagentes | Nativos; política existente | Ajustar roteamento e briefing local | Respeitar host; observar despacho e resultado |
| 03 RTK | Estado funcional desconhecido | Inspecionar e reutilizar se disponível | Global ausente vira pendência; evitar execução duplicada |
| 04 Ponytail | Equivalência a verificar | Integrar instrução aplicável sem duplicar política | Fonte/licença/descoberta e menor mudança completa |
| 05 Caveman | Comunicação concisa já orientada | Reutilizar equivalente ou integrar sem perda de clareza | Português normal; não impor estilo telegráfico |
| 06 Quality gates | Biome, tipos e testes funcionais | Reutilizar; medir lacunas antes de novos checks | Templates adaptados; sem ESLint redundante; self-check de lógica nova |
| 07 Graphify | Necessidade/instalação desconhecidas | Avaliar ganho para recuperação; modo determinístico se justificado | Excluir conteúdo sensível/gerado; sem extração externa |
| 08 Obsidian | Nenhum destino autorizado | Inaplicável sem necessidade concreta | Não criar vault/exportação |
| 09 Memória | Docs versionados disponíveis | Melhorar índice, fontes e invalidação | Recuperação em contexto novo observável |
| 10 Hooks | Nenhuma nova necessidade demonstrada | Preservar existentes; não adicionar por rotina | Sem hooks Git; verificar mecanismo suportado |
| 11 agent-browser | Harness Chromium próprio documentado | Avaliar/reutilizar equivalência e lacunas | Browser local/perfil descartável; sem sessão pessoal |
| 12 Context7 | Não disponível nas ferramentas descobertas | Inspecionar integração existente; documentar fallback oficial | Global/autenticação ausentes viram pendência; query real para validar |
| 13 Artifact/skill creation | Skills disponíveis parcialmente | Avaliar extras por necessidade; sem instalação indiscriminada | Origem/licença e ausência de duplicação |
| 14 Chrome DevTools MCP | Não disponível nesta sessão | Avaliar lacuna frente ao harness existente | Sem nova integração global implícita; runtime separado de configuração |
| 15 Codex | Cliente atual com configuração local | Preservar host e documentar carregamento/limites | Não mudar permissões/modelo principal; verificar controles reais |
| 16 Vercel/find-skills | Projeto Next/React compatível | Avaliar web set atual e instalar aplicáveis localmente | Frontmatter, origem, licença, lock e portabilidade Windows |
| 17 Next dev-loop/bundle | Next 16; suporte a confirmar | Instruções locais aplicáveis; execução depende de runtime/analyzer | Ler docs da versão; não trocar bundler ou fazer upgrade para satisfazer skill |
| 18 PostgreSQL skill | PostgreSQL/Drizzle adotados | Integrar instruções aplicáveis sem trocar provider | SQL checks seguros; sem migrations ou produção |
| 19 gh-fix-ci | GitHub Actions existente | Avaliar skill local e acesso read-only | Autenticação/CLI são pré-requisitos separados; sem push |
| 20 Differential/security review | Regras locais existentes | Reutilizar e avaliar complemento; registrar Prompt 13 versionado | Range explícito, revisão read-only, relatório privado redigido |
| 21 shadcn | Radix utilizado; shadcn não confirmado | Verificar adoção; declarar inaplicável se ausente | Não adotar sistema de UI para preencher catálogo |
| 22 Sentry MCP | Serviço/organização não escolhidos | Inaplicável sem serviço autorizado | Sem SDK, conta ou token novo |
| 23 Harness2 | Sem evidência inicial | Adotar método nativo e smoke cases delimitados | Uma comparação se falha observada; CLI/lab não selecionado |
| Plugins, aia-harness e extras atuais | Utilidade ainda a verificar nos guias | Avaliar todos os extras encontrados e justificar decisão | Sem sobrepor harness ou autorizar serviços/custos |

## Entregas e critérios de aceitação

1. Fundação/contexto: mapear fontes canônicas, reconciliar instruções e registrar baseline e backups recuperáveis de configurações alteradas, sem secrets. Comparar regras antes/depois para não perder garantias.
2. Ferramentas: avaliar catálogo inteiro e integrar itens aplicáveis na menor abrangência suportada. Distinguir instalado, configurado, descoberto e executado. Pendências externas não bloqueiam trabalho independente.
3. Qualidade/organização: corrigir inconsistências confirmadas e medir lacunas. Refatorações e dependências só quando necessárias ao setup aprovado, sem mudanças comerciais ocultas. Regras genéricas cedem às específicas do projeto.
4. Validação integrada: executar checks seguros, build, auditoria de dependências e smoke local pertinente. Banco/browser exigem pré-requisitos explicitamente de teste. Registrar falhas herdadas e bloqueios; não usar produção como fallback.
5. Revisão independente do diff estabilizado, links/configurações, reexecução segura sem duplicação, documentação de manutenção e cobertura final completa.

O setup inteiro é a Task atual; entregas são etapas internas desse escopo, sem avanço para Epics ou tarefas de produto. O plano identificará arquivos e checks por etapa. Alteração arquitetural adicional ou decisão incompatível requer proposta específica.

## Responsabilidades deixadas à implementação

Escolher arquivos documentais após localizar equivalentes; selecionar skills atuais por compatibilidade; definir comandos de smoke e recursos descartáveis; decidir detalhes reversíveis e registrar justificativa. Não há autorização implícita para instalação global, novas contas, billing ou mudança de políticas.

## Aprovações

- Objetivos e abordagem ajustar/medir: aprovados na conversa.
- Este desenho: aprovado na conversa por “so seguir”.
- Plano: docs/superpowers/plans/2026-10-25-toolkit-context.md; execução local e reversível conduzida conforme autorização de continuidade, sem mudança arquitetural adicional de produto.
