# Qualidade e avaliação de agentes

[SDLC](architecture/sdlc.md) continua canônico para gates, risco, revisão e exceções. Este documento conecta checks à operação dos agentes; não reduz exigências existentes.

## Comandos e alcance

| Comando | Evidência |
| --- | --- |
| `npm run check` | Biome, geração de tipos/tsc e unitários sem serviços externos |
| `npm run verify` | Check e build de produção |
| `npm run test:integration` | PostgreSQL local dedicado; migrations/constraints/concorrência; preflight obrigatório |
| `npm run test:security` | Unitários, PostgreSQL, build e HTTP/Chromium reais, com pré-requisitos |
| `npm run security:dependencies` | Audit runtime/tooling com política datada, sem autofix |
| `npm run security:secrets`, `npm run security:sast`, `npm run ci:validate` | Scanners fixados via fluxo Linux suportado; execução depende da instalação |
| `git diff --check` e `git diff --cached --check` | Whitespace unstaged/staged; não substituem revisão de arquivos novos |
| `node --test scripts/store-ui.test.mjs` | UI isolada da Loja/Minha Conta, Chrome em `SECURITY_BROWSER_PATH`; execute build antes para disponibilizar fontes locais. Reads sintéticos, banco proibido e POST bloqueado: não comprova checkout ou persistência reais |

CI não foi substituído. Biome recomendado/Next/React e TypeScript strict permanecem. Os módulos ESLint do toolkit não foram copiados como código morto: o Biome 2.4.2 já oferece noFloatingPromises/noMisusedPromises em nursery com inferência própria. As duas regras foram medidas sem violações e habilitadas como error, sem novo linter. Casos negativos/positivos descartáveis validaram os diagnósticos; não equivalem ao typechecker completo. Rever compatibilidade ao atualizar Biome, pois nursery é experimental. [Documentação](https://biomejs.dev/linter/rules/no-floating-promises/) e [uso incorreto](https://biomejs.dev/linter/rules/no-misused-promises/).

Limite de linhas permanece medição separada, não enforcement global nem motivo para refatoração geral. Revisão contextual e SAST existentes continuam necessários.

## Revisão reutilizável de segurança

Use security-review local para mudanças de confiança. Prompt 13 complementa baseline ou diff preciso: [fonte fixada](https://github.com/soumatheusgomes/vibe-coding-toolkit/blob/790a895304e0c08b70a5b215c9d334f1c86b816c/docs/prompts/13-security-review.md).

Invocação: ler somente o bloco Prompt fixado, informar raiz, base/head ou camadas da working tree e escopo; executar read-only com relatório privado redigido fora do repositório por padrão. Sem upload de código/secrets. Correção, probing de produção e publicação não são autorizados pela revisão. Differential-review não foi duplicada: regras locais, Prompt 13 e rastreamento manual são o equivalente escolhido; rever se surgir lacuna concreta.

## Smoke do harness e melhoria delimitada

Modo: **adaptação nativa inspirada em Harness2**, sem executar framework/CLI ou reproduzir benchmarks. Fontes da mesma revisão: [Prompt 14](https://github.com/soumatheusgomes/vibe-coding-toolkit/blob/790a895304e0c08b70a5b215c9d334f1c86b816c/docs/prompts/14-harness-evaluation.md), [Prompt 15](https://github.com/soumatheusgomes/vibe-coding-toolkit/blob/790a895304e0c08b70a5b215c9d334f1c86b816c/docs/prompts/15-harness-improvement.md), docs/07-harness-evaluation.md e docs/tools/23-harness2.md da cópia fixada.

Invocação: ler bloco Prompt 15 e usar cliente/modelo/autenticação/permissões existentes. Definir tarefa, critérios, entradas, recursos e limite. Usar cópias descartáveis sem secrets; evaluator e entrada originais fora da escrita do agente. Sem falha concreta, registrar smoke e manter procedimento, sem inventar candidato. Para falha observada, comparar um candidato com mesma entrada/checks e condições comparáveis; adotar apenas mudança sustentada por evidência. Limite inicial: uma comparação; mais rodadas exigem motivo e limite acordado.

Casos: localizar fonte normativa/comando em contexto novo; selecionar capacidade para tarefa delimitada; verificar handoff desatualizado contra arquivos/testes; revisão read-only sem mudar fixture. Pause/resume e recursos compartilhados exigem observação do host; estática não os comprova. Não dar resposta ao agente nem mudar evaluator para aceitar resultado.

Registrar revisão/entrada, cliente e modelo/esforço observáveis, permissões, comando, resultado, arquivos e limites. Separar assertions, observação do coordenador e alegação do agente. Subagente não é cliente reiniciado; presença de skill não prova descoberta. Tokens/custos somente se expostos; bytes/linhas medem arquivo. Resultados em [setup](setup.md).

## Manutenção

Atualizar fonte responsável junto de mudanças. Refazer checks afetados após alteração material de código, stack, cliente ou política. Rever origens/licenças antes de atualizar cópias; sem agendamento, global update ou reinstalação geral. Findings têm severidade, local, cenário, evidência e decisão; rodadas adicionais requerem risco/evidência nova.

## Upload, seed e bootstrap operacional

`npm run test:scripts` valida parser, limites200/1000, seed sem imagem/retomada e componentes puros do instalador. Integração de writer: `node --env-file=.env.test.local --test scripts/seeder/persist-products.integration.mjs`, somente com guardian_bay_test dedicada. Upload exige integração de catálogo e HTTP real (Origin, sessão/admin, multipart limitado e draft privado), além do browser admin.

Dry-run e testes determinísticos não comprovam provisionamento Ubuntu. Validar em hosts descartáveis Ubuntu24.04 e26.04/systemd: instalação, rerun/interrupção, privilégios efetivos de DB, comandos de seed/limpeza com suas identidades, reboot, HTTPS e confiança manual da CA no cliente. O instalador não executa testes. Gate zero-upgrade de migrations exige credencial de harness com CREATEDB; não conceder esse poder à aplicação ou à role dedicada comum apenas para passar o gate.
