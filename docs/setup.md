# Setup do toolkit e evidências

Data: 2026-10-25. Objetivos aprovados: melhorar contexto, economizar tokens quando mensurável e selecionar capacidade/modelo por tarefa. Estado: entrega local; validação integrada e revisão registradas abaixo. Sem push, publicação, migrations de produto, mudança de provedor/login/modelo principal ou configuração global.

## Fontes e ambiente

- Toolkit: [Prompt 12](https://github.com/soumatheusgomes/vibe-coding-toolkit/blob/790a895304e0c08b70a5b215c9d334f1c86b816c/docs/prompts/12-existing-project-setup.md), revisão `790a895304e0c08b70a5b215c9d334f1c86b816c`, cópia temporária fora do projeto. README, overview, instalação, playbook, defaults, catálogos e manifest foram usados da mesma revisão. Exemplos Next não foram copiados sobre a aplicação.
- Checkout inicial: `a7848532db810df2b174fb9c1391c5eb5c2e0320`, inicialmente limpo. Somente arquivos deste setup foram alterados. [Desenho](superpowers/specs/2026-10-25-toolkit-context-design.md) e [plano](superpowers/plans/2026-10-25-toolkit-context.md) registram decisões.
- Windows/PowerShell; Node observado 26.7.0, npm 12.2.0; Codex CLI localizado 0.162.0-alpha.17.2. A ferramenta CLI isolada não conseguiu resolver seu home neste sandbox; isso não prova falha do cliente ativo.
- Next 16.4.3/Turbopack, React 19.2.8, Biome 2.4.2, Vitest 4.1.12, Drizzle ORM 0.45.3/Kit 0.31.11. npm/package-lock preservados; runtime de referência do CI não foi alterado.
- Skills nativas/globalmente descobertas foram reutilizadas. As dez novas skills são cópias locais, sem links absolutos, instaladas com o helper oficial OpenAI, `--dest` explícito e revisão fixada. [Inventário](skill-sources.json) registra nomes reais, licença, fontes, revisões e hashes. Não é lockfile do CLI skills; esse CLI não foi instalado nem executado.
- ZIP de Next falhou por caminho longo Windows; somente suas duas skills foram instaladas por sparse Git. Comparação com fontes oficiais normalizou CRLF/LF textuais; PNG foi comparado byte a byte. Texto instalado usa LF conforme .gitattributes; hashes do inventário incluem licenças e ordem lexical case-sensitive de caminhos POSIX, para portabilidade Windows/Linux.

## Documentação e memória

| Destino do manifest | Fonte canônica adotada |
| --- | --- |
| README.md | README existente, corrigida versão desatualizada do Next |
| PRODUCT.md | Criado com fluxos/limites observados; não é novo roadmap |
| AGENTS.md | Índice, comandos e regras essenciais; preservado bloco gerado Next |
| CLAUDE.md | Reutilizado `@AGENTS.md`, sem segunda política |
| docs/architecture.md | Equivalente existente docs/architecture/README.md e documentos próximos |
| docs/design.md | Equivalentes DESIGN.md e docs/visual-identity/README.md; propostas não viram implementação |
| docs/onboarding.md | Criado como entrada, apontando requisitos/comandos ao README |
| docs/quality.md | Criado como mapa para SDLC, gates e protocolos de revisão/avaliação |
| docs/setup.md | Este registro de fontes, decisões e evidências |

Detalhes normativos antes em AGENTS foram preservados em docs/agent-invariants.md, com leitura obrigatória antes de implementar/revisar. Política de contexto, seleção e briefing em docs/agent-workflow.md. Documentação versionada funciona como memória; carregamento do índice depende do mecanismo do cliente. Não foi criado vault, servidor, exportação ou cache semântico.

AGENTS: **7.540 → 4.258 bytes** imediatamente após reorganização inicial; tamanho final deve ser conferido ao revisar o arquivo. Isso mede somente esse arquivo. Invariantes continuam exigidos para código/configuração, e descrições das novas skills acrescentam contexto de descoberta. Não há medição de tokens/custo total da sessão nem alegação de economia percentual.

Verificação dos fatos duráveis: 2026-10-25, manifest/lock, fontes locais e comandos abaixo. Invalidar/rever após mudar stack, regras, scripts, catálogo/host ou capacidades. Handoff temporário pertence ao plano ativo; retomada verifica Git/arquivos/processos, não confia no resumo como prova.

## Cobertura completa do catálogo

Estados distinguem **validado**, **instalado/configurado sem fluxo completo**, **reutilizado**, **inaplicável** e **bloqueado**. Toda integração externa permanece subordinada aos invariantes. Escopo é local ao projeto, salvo ferramentas globais já existentes reutilizadas.

| Componente | Necessidade/estado inicial | Decisão e escopo | Dependências, risco, evidência e retomada |
| --- | --- | --- | --- |
| 01 Superpowers | Disponível no cliente | Reutilizado | Brainstorming, plano, execução/verificação e revisão; sem cópia ou plugin duplicado |
| 02 Subagentes | Nativos, política local | Validado em tarefas delimitadas; política dinâmica | Contexto novo, modelo/esforço explícitos quando suportados; dois no máximo; principal integra. Ver casos abaixo |
| 03 RTK | 1.0.1 global localizado | Binário e consulta Git validados; hook automático não configurado | Sandbox bloqueou execução; binário real funcionou com permissão de execução ampliada. Nenhum hook instalado reportado; não executar init global implicitamente |
| 04 Ponytail full | Equivalência existente | Reutilizado por invariantes e política de menor mudança completa | Sem plugin adicional/hooks; preservar escopo, segurança, acessibilidade e checks. Reavaliar apenas lacuna concreta |
| 05 Caveman | Escrita concisa já orientada | Reutilizado por comunicação curta em português normal | Não adotar proxy, billing ou linguagem telegráfica; sem alegação de economia medida |
| 06 ESLint/Biome | Biome/gates existentes | Biome reutilizado e duas regras async habilitadas como error | Zero violações na medição; negativos detectados e positivos aceitos. Nursery experimental; sem ESLint ou módulos sem consumidor |
| 07 Graphify | Ausente do PATH | Inaplicável à necessidade demonstrada nesta entrega | Mapa + rg atendem recuperação observada; não foi validada capacidade de grafo. Se tarefa precisar travessia, avaliar instalação isolada e modo determinístico, exclusões de secrets/dependências/caches; sem LLM/API/hook implícitos |
| 08 Obsidian | Sem destino/necessidade | Inaplicável | Memória canônica versionada suficiente; não criar vault/exportação |
| 09 Memória | Docs extensos existentes | Integrada por índice/fontes/retomada | Recuperação em contexto novo exercitada; cliente reiniciado não observado |
| 10 Hooks | Nenhum necessário ao setup | Não adicionados; reuso de integrações existentes | Não instalar Git hooks nem duplicar interceptores. RTK automático requer ação específica fora do projeto |
| 11 agent-browser | Ausente; harness Chromium próprio | Reutilizado harness próprio para fluxos existentes; CLI ausente bloqueia next-dev-loop completo | Não instalar browser/CLI global por efeito colateral. Instalação, caso escolhida, com comando/efeito explícitos |
| 12 Context7 | Sem ferramenta MCP carregada | Configurado em .codex/config.toml; endpoint e consulta real validados por HTTP | Nenhum servidor global declarado encontrado. tools/list, resolve-library-id e query-docs funcionaram sem secrets; trust/recarregamento ainda necessários no cliente |
| 13 Artifact skills | Skill-creator/imagegen já disponíveis; sem demanda Office | Reutilizados recursos existentes; extras de documentos inaplicáveis | Não instalar coleção/licenças restritivas sem tarefa concreta |
| 14 Chrome DevTools MCP | Não carregado; harness CDP existente | Equivalente local para smoke/browser; sem novo MCP | Não há demanda de trace/performance que justifique segundo servidor. Reavaliar lacuna específica, sem sessão pessoal |
| 15 Codex | Cliente e configuração local | Preservados; Context7 acrescentado localmente | Sem mudar auth, modelo principal, permissões ou políticas globais. CLI home/trust/restart são limites separados |
| 16 React best practices | Next/React; frontend-patterns local | Instalado vercel-react-best-practices | MIT, revisão no inventário; complementar, sem substituir regras locais |
| 16 Composition | APIs React e colocation | Instalado vercel-composition-patterns | Somente necessidade real de composição; não criar biblioteca antecipada |
| 16 Web design | UI existente | Instalado web-design-guidelines | Usar revisão de UI quando houver alteração; não houve redesenho nesta entrega |
| 16 Writing | Documentação desta entrega | Instalado writing-guidelines | Gatilho de revisão; fontes externas não autorizam mudar contratos; adaptar português |
| 16 Transitions | Skill motion local | Instalado vercel-react-view-transitions | Consultar guardian-bay-motion primeiro; experimental e reduced motion não são habilitados pelo setup |
| 16 Vercel optimize | Sem projeto/conta/métricas Vercel escolhidos | Inaplicável agora; não instalado | Retomar após serviço/alvo/métricas autorizados; não enviar código nem configurar conta para preencher catálogo |
| 16 Deploy to Vercel | Nenhuma publicação solicitada/hosting escolhido | Inaplicável agora; não instalado | Instalação futura quando plataforma/tarefa escolhida; setup proíbe publicação |
| 16 Vercel CLI tokens | Nenhum método de token escolhido | Inaplicável; não instalado | Não buscar/imprimir tokens ou copiar .env. Reavaliar apenas método explicitamente autorizado |
| 16 React Native/Expo | Aplicação web | Inaplicável | Sem migração/mobile |
| 16 Find skills | Descoberta futura pontual | Instalado find-skills | MIT, fonte fixada; sem global update/instalação indiscriminada |
| 17 Next dev-loop | Next/Turbopack compatíveis | Skill instalada; fluxo completo bloqueado por agent-browser ausente | Sondagem MCP isolada não satisfaz a skill. Não fazer upgrade/trocar bundler para habilitar |
| 17 Next bundle | Analyzer incluído | Skill instalada; capture local validado | next analyze --output --snapshot toolkit-setup-20261025 passou; nenhuma otimização comercial inferida |
| 17 Novas skills cache/prefetch | Descobertas no upstream Next | Inaplicáveis ao setup atual | next-cache-components-adoption/optimizer e next-partial-prefetching-adoption/optimizer exigem tarefa/adoção específicas; não habilitar flags ou mudar comportamento |
| 18 PostgreSQL | PostgreSQL/Drizzle | Instalado supabase-postgres-best-practices | MIT; qualquer provider; sem adotar Supabase/RLS/migrations. Query de DB não executada por faltar destino explícito de teste |
| 19 gh-fix-ci | Actions existente; gh ausente | Skill instalada; fluxo remoto bloqueado | Sem gh autenticado/PR escolhido. Scripts Python presentes não foram executados; não abrir PR/comentar/rerun |
| 20 Differential review | Regras e revisão locais | Reutilizado equivalente local + Prompt 13 versionado | Range e working-tree explícitos, rastreamento manual; sem duplicar agentes Claude-only. Não é execução da skill Trail of Bits |
| 21 shadcn | Radix, sem components.json/shadcn adotado | Inaplicável | Não trocar design system |
| 22 Sentry MCP | Sem serviço/org/projeto escolhidos | Inaplicável | Sem SDK/OAuth/conta nova; retomar com destino autorizado |
| 23 Harness2 | Processo não registrado | Adaptação nativa integrada; comparação única abaixo | Framework/CLI/lab/benchmarks não selecionados; sem dependências ou chamadas pagas |
| aia-harness | Onboarding/contexto já cobertos | Inaplicável por redundância | Sem segundo harness/instalador |
| Plugins oficiais Claude/commit/review/hook | Cliente ativo Codex; revisões nativas | Reutilizados equivalentes nativos; demais inaplicáveis | Sem roster fixo ou alteração de cliente/global; reavaliar necessidade concreta |

## Antes/depois e verificações

| Verificação | Resultado observado |
| --- | --- |
| Baseline npm run check | Passou: 317 arquivos Biome, tipos e 121 testes/27 arquivos |
| Baseline npm run build | Passou com Next 16.4.3/Turbopack; 15 rotas geradas |
| Check após regras async/skills | Passou: 320 arquivos Biome, tipos e 121 testes/27 arquivos |
| Check final com inventário | Passou: 321 arquivos Biome, tipos e 121 testes/27 arquivos |
| Build após configuração | Passou novamente com 15 rotas; nenhuma mudança de produto |
| Async rules isoladas | Zero diagnósticos em 320 arquivos; fixture negativa produziu 3 erros (duas floating e uma misused); positiva passou |
| Custo local das regras async | Uma execução por variante, mesmos 321 arquivos: sem regras 557 ms/216.252.416 bytes de pico observado; com regras 557 ms/209.838.080 bytes. Amostragem de working set a cada 10 ms; sem inferência estatística ou garantia em CI |
| npm run security:dependencies antes/depois | Falhava com EINVAL no Windows; após correção shell-free passou: production 0, all 4, nenhuma triagem pendente conforme política existente |
| npm audit direto, produção | Zero findings; consulta real ao registry com saída local ignorada |
| npm audit direto, completo | Quatro moderados no tooling Drizzle/esbuild; mesmo advisory/pacotes aceitos pela política datada, revisão até 2026-11-06; nenhum audit fix |
| Preflights integração e browser | Ambos falharam por ausência de ambiente explícito válido; nenhuma conexão DB ou migration tentada |
| Context7 HTTP | tools/list → resolve-library-id → query-docs passaram; retornaram docs Next. Versão 16.4.3 não estava na lista de versões do índice; docs embarcadas prevalecem |
| Next analyzer | Capture local passou em 2,7 s; prova de capacidade, sem alegação de melhoria de bundle/performance |
| Analyzer export | 20.130 registros JSONL válidos; artefato ignorado, sem carregar dump no contexto |
| Startup/Chrome local | Passou com exit 0: porta dinâmica loopback, home/login HTTP 200, formulário de login e labels em Chrome headless novo, sem exceção de runtime observada. Sem submissão/DB; não cobre fluxo comercial completo |
| Conteúdo/links/integridade | Invariantes originais preservados; bloco Next idêntico; links locais dos documentos novos existem; dez árvores de skills verificadas por hash, sem symlinks |
| Reaplicação segura | Helper oficial em cópia descartável recusou destino existente sem mudar bytes/customização; uma seção Context7 no projeto. Não equivale a repetir setup completo ou reiniciar cliente |
| Tamanho de arquivos | Nove arquivos src/scripts acima de 350 linhas físicas, principalmente testes/harness. Referência medida, sem refatoração geral ou novo teto/ignore para esconder violações |

O audit direto foi diagnóstico, não substituto do gate. A causa Windows foi localizada em spawnSync com npm.cmd sem shell. A correção limitada a scripts/check-dependencies.mjs usa Node atual + npm_execpath fornecido pelo comando canônico, sem interpolar shell. Política de exceções, validação de resposta e exit codes não mudaram. Regressão descartável reproduziu a falha original e validou seis cenários: audit limpo, exceção exata, finding desconhecido bloqueado, JSON inválido bloqueado, contexto npm ausente bloqueado e política expirada bloqueada; caminho do npm mock continha espaços. Nenhuma rede ou mudança na política real nesses casos. Gate real passou depois; execução no runner Linux remoto não foi observada.

O primeiro smoke de Chrome verificou a tela, mas saiu com timeout ao esperar resposta de Browser.close após fechamento da conexão. Corrigido somente o teardown descartável e reexecutado com exit 0; código da aplicação não mudou. O inventário gerado inicialmente tinha CRLF e falhou no formatter; somente esse JSON foi formatado e o check completo passou depois.

## Casos de contexto e comportamento

- Desenho: revisão isolada gpt-6-luna/medium não encontrou perguntas impeditivas. Isso não é revisão de segurança de produto.
- Catálogo: investigação delimitada gpt-6-luna/medium, somente leitura, retornou fontes/aplicabilidade em resumo; principal integrou decisões e verificou cópias. Sem histórico integral ou roster novo.
- Recuperação inicial: explorer gpt-6-luna/low localizou invariantes, comandos, política de capacidade e frontmatter PostgreSQL. Não leu arquitetura inteira. Errou ao restringir browser a Node 24, confundindo referência CI com contrato.
- Comparação nativa única: cópias documentais parciais descartáveis, mesmo pedido e gpt-6-luna/low, somente leitura. Único delta do candidato: explicitar no onboarding contrato Node 22.12+/24+, referência CI 24.19.0 e preflight major >=22. Baseline já conseguiu distinguir CI/preflight, e candidato distinguiu também contrato exato. Isso sustenta clareza adicional, não ganho geral/estatístico ou economia de tokens.
- Handoff desatualizado: cópia isolada da fixture do toolkit, evaluator externo da mesma revisão. gpt-6-luna/medium verificou e rejeitou relato falso de conclusão; 5/7 checks antes e 7/7 depois. Principal rerodou e confirmou 7/7; apenas access.mjs da fixture mudou, notas preservadas. Nenhuma fixture vulnerável entrou no produto.
- Modelos/esforços acima são os valores selecionados explicitamente nos despachos aceitos pelo host; não houve auditoria independente de execução/billing por modelo. O reviewer usa configuração fixada do papel nativo, preservada.
- Pause/resume, conflito real de recursos, carregamento em cliente reiniciado e economia de tokens/custo: **não executados/não observáveis**. Não confundir contextos novos com reinício do aplicativo ou declarar poupança a partir do modelo solicitado.

## Pendências e manutenção

Revisão independente: papel reviewer nativo, somente leitura, sem achados acionáveis no escopo de instruções/configuração/proveniência. Confirmou preservação das 16 regras e do bloco Next, hashes/contagens e ausência de novas credenciais/permissões. O follow-up limitado à correção do audit também não encontrou achados: chamada npm canônica e falhas fechadas preservadas. Revisão estática; resultados de build/browser/audit foram evidências do coordenador, não execução pelo reviewer. Normalização mecânica final para LF e ordem portátil de hashes foram reconferidas no principal. Não houve auditoria completa de produto ou histórico Git.

1. Recarregar/confiar na configuração local e confirmar Context7 e novas skills no catálogo do cliente. HTTP passou; ferramenta MCP carregada não foi observada nesta sessão. Não duplicar conexão se um plugin vier a fornecê-la.
2. Para next-dev-loop completo, falta agent-browser >=0.31.1. Comando global upstream a avaliar separadamente: `npm i -g agent-browser`, que instala CLI fora do projeto; `agent-browser install` baixa runtime/browser. Não foram executados. Usar perfil de teste novo, sem restore pessoal.
3. RTK 1.0.1 funciona pelo binário real com execução autorizada; o link Winget/sandbox falhou. Conferir PATH/permissões no terminal normal. `rtk init --global --codex` alteraria integração global e requer decisão específica; não foi executado. Sem wrapper duplicado.
4. Integração/browser comerciais exigem TEST_DATABASE_URL local dedicado e browser explícitos; scanners exigem ambiente Linux x64 suportado. Não há autorização para usar conexão normal como alternativa.
5. gh-fix-ci exige GitHub CLI/autenticação e tarefa/PR concreto; instalação global/login não foram executados.

Para manter skills: consultar inventário, revisar revisão upstream/licenças, preservar backup, usar helper oficial com repo/path/ref e `--dest` no projeto. O helper recusa destino existente: comparar e substituir somente item intencionalmente atualizado, preservando customizações. Não executar `skills update` supondo que este inventário seja seu lockfile. Licenças raiz necessárias foram copiadas para UPSTREAM-LICENSE.txt; Vercel agent-skills declara MIT no README/frontmatter, sem licença raiz separada naquela revisão.

Repetir setup lê Prompt 12 da nova cópia fixada e reconcilia arquivos existentes, sem concatenar seções, duplicar MCP, hooks ou skills. Backups locais deste setup em `.vitest/toolkit-backup/`, sem secrets. Reusar evidência somente se entradas/configuração não mudaram; registrar próxima ação e causa de cada bloqueio. Não criar agendamentos.

## Impeccable — 26/10/2026

Instalada a pedido do usuário com o skill-installer oficial: repositório `pbakaus/impeccable`, revisão `989c484c091d26f10fa102767eefc0da2e62ec67`, pasta `.agents/skills/impeccable`. Licença Apache-2.0 incluída e integridade registrada em `docs/skill-sources.json`. Não há dependência npm, alteração de provedor, hooks automáticos ou mudança de autenticação. Biome exclui somente o código vendorizado desta skill.

Descoberta pelo catálogo deve ser conferida no próximo turno; leitura manual do SKILL.md e referências foi realizada nesta sessão. O launcher context falhou por falta do motor 0.1.17/cache externo; não se instalou o motor. Aplicada a alternativa documental prevista pela skill: PRODUCT.md, DESIGN.md e referências locais. Nenhum detector Impeccable foi executado; auditoria contextual manual e Web Design Guidelines complementaram os checks do projeto. DESIGN.md e o escopo aprovado prevalecem sobre propostas genéricas de nova identidade, layout ou motion.
