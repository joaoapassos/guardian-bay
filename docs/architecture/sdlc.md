# SDLC seguro do Guardian Bay

## Política (ECMSG-118)

Fluxo: branch de feature/Epic → commits pequenos e gates locais → push → Pull Request → CI → revisão → merge. Preservar a sequência de commits exigida por cada Epic. Nunca implementar diretamente em main ou alterar a base aprovada. Esta seção define o processo; CI será introduzido nas Tasks seguintes, não é controle existente nesta base.

O autor explica problema, mudança, evidências e riscos; CI executa verificações reproduzíveis; revisor confere comportamento e limites de confiança; maintainer decide merge e exceções. Em projeto solo, a revisão explícita continua obrigatória, sem alegar independência de um segundo reviewer.

| Gate | Contrato |
| --- | --- |
| Lint, tipos e unitários | `npm run check`, rápido, sem autofix, DB ou rede após instalação |
| PostgreSQL | `npm run test:integration`, PostgreSQL 18 local dedicado; constraints, transações e concorrência reais |
| HTTP/browser | `npm run test:security`, aplicação e Chromium reais, sem skips como evidência |
| Produção | `npm run verify`, check e build; Google Fonts exige rede durante compilação |
| Migrations/schema | Instalação vazia, upgrade da base suportada, journal/snapshots, Drizzle check e drift; automatização nas próximas Tasks |
| Dependências | Lockfile, produção versus tooling e triagem de advisories; nenhum audit fix automático |
| Secrets e SAST | Detecção mais revisão contextual; scanners complementam security-review, não substituem autorização ou threat model |
| Integridade | Diff/whitespace, lockfile e arquivos versionados sem alterações causadas pelos gates |

Teste/build falhando, migration inconsistente, lockfile incompatível, secret real ou vulnerabilidade Critical/High confirmada bloqueiam merge. Gate obrigatório ausente, skipped ou indisponível não comprova aprovação. Alerta genérico não equivale a vulnerabilidade: exige evidência, contexto e classificação antes da decisão. Não resolver problema fora de escopo silenciosamente nem ignorar para obter CI verde.

Exceção deve registrar finding/local, justificativa, risco, mitigação, responsável e prazo de reavaliação quando aplicável. Falta de análise e “CI vermelho” não são justificativas. O maintainer aprova explicitamente; uma exceção não autoriza remover assertions ou enfraquecer runtime. Branch protection é configuração operacional, não se presume aplicada pela existência desta política.

## Gates locais (ECMSG-119)

`check` permanece lint/tipos/unitários e `verify` acrescenta build. `test:integration` exige banco local guardian_bay_test, sem fallback. `test:security` preserva unitários → PostgreSQL → build → HTTP/Chromium; agora browser ausente é falha antecipada, não sucesso com skip. `test:security:http` é a etapa concreta para reutilizar um build e banco preparados, não substitui sozinho o gate completo. CI pode compor check → integração → build → HTTP uma vez cada, sem executar verify e security completos repetidamente. Abra apenas uma suíte por banco, pois fixtures compartilham budgets de teste.

Pré-requisitos: Node 24, PostgreSQL 18, TEST_DATABASE_URL local exclusivo, SECURITY_BROWSER_PATH executável e OpenSSL para TLS temporário. Typegen/build geram apenas saídas ignoradas. Nenhum gate aplica autofix.

## CI base (ECMSG-120)

`.github/workflows/security.yml` define Secure SDLC / Quality and security: PRs, push em main e nesta branch de bootstrap, além de execução manual. O push de bootstrap permite validar antes do primeiro PR; para futuras branches de feature basta o PR, evitando duplicação indiscriminada em todo push. Um job sequencial usa Ubuntu 24.04, Node 24.19.0 e PostgreSQL 18.6 isolado. `npm ci` respeita lockfile; `npm run ci` compõe check → integração → build → HTTP/browser uma vez cada. Chrome instalado na imagem do runner e OpenSSL são verificados, sem browser omitido. Google Fonts/registry exigem rede; versão do Chrome da imagem é variável, registrada na execução.

Actions checkout v6.0.2 e setup-node v6.3.0 são fixadas por SHA verificado contra tags oficiais. Permissão global contents:read; checkout não persiste credencial, sem cache de dependências/build, sem secrets privilegiados e sem pull_request_target. Credencial do service PostgreSQL é fictícia/efêmera, não de aplicação ou produção. Configuração versionada não comprova execução remota: o resultado do run deve ser observado antes de alegar CI verde.

## Migrations/schema (ECMSG-121)

`npm run db:check` requer PostgreSQL 18 e TEST_DATABASE_URL dedicado com permissão de criar DBs temporários. Cria somente bancos com prefixo fixo e UUID aleatório, remove somente os que criou e nunca recria/trunca guardian_bay_test. Aplica zero → HEAD e base imutável 46be877 → HEAD; preserva produto/estoque sintéticos no upgrade e compara colunas/defaults/constraints/índices. Requer história Git da base disponível (checkout completo).

Valida ordem/timestamps do journal, snapshots encadeados, arquivos SQL e imutabilidade das migrations já aprovadas. Drizzle check e generate executam numa cópia temporária com schema atual; qualquer alteração nessa cópia significa drift e falha, sem geração no diretório versionado. Nenhuma migration vazia foi criada para esta Epic. CI executa o mesmo comando antes dos testes.

## Dependências e supply chain (ECMSG-122)

`npm run security:dependencies` executa npm audit de produção e completo, distingue erro de registry de finding e não faz correção. Finding novo fica pending triage e requer revisão antes de merge; isso não declara vulnerabilidade confirmada. Critical/High confirmado bloqueia por padrão; Moderate requer contexto; Low entra em manutenção após triagem. O único risco aceito automatizado é o advisory GHSA-67mh-4wv8-2f99 na cadeia/versionamento exatos Drizzle Kit → esm-loader → core-utils → esbuild, exclusivamente tooling, sem consumidor de serve; responsável maintainer, revisão até 2026-11-06. A política expirada ou versão/advisory diferente exige nova análise. Há quatro entradas moderadas afetadas, não quatro vulnerabilidades distintas confirmadas de runtime.

Relatórios sanitizados em .vitest distinguem production/all e decisão; nenhuma credencial ou dump de ambiente. Dependabot propõe atualizações npm mensalmente (até três PRs) e Actions (até dois), sem auto-merge. Toda nova dependência requer consumidor, provenance, changelog, scripts de instalação e lockfile revisados; npm ci verifica compatibilidade do manifest, mantendo integridade de tarballs. Não adicionar overrides ou executar audit fix para esconder alerta.

## Secrets (ECMSG-123)

Gitleaks 8.24.3 complementa o scanner diagnóstico existente com gate redigido, versão verificada e SHA256 fixo do release oficial. `npm run security:setup` instala em .vitest/tools, sem curl|bash, sem desabilitar TLS/checksum; o instalador Node 24 respeita o proxy do ambiente; `security:secrets` verifica binário, arquivos Git-indexados (incluindo novos staged) e seus conteúdos atuais. CI cobre a árvore inteira do PR, não histórico completo; incidente histórico requer investigação específica e rotação mesmo após remoção. Arquivos ignorados/credenciais locais não são lidos nem enviados.

O gate rejeita .env rastreado exceto template vazio, chaves/arquivos de credenciais e symlinks não revisados. Nenhuma regra global ignora tests ou password; exceção de fixture, se necessária, deve ser precisa e justificada. Scanner não prova que toda senha plausível seja real; finding bloqueia para triagem, sem expor o valor. Valores de service container são deliberadamente sintéticos, loopback/efêmeros. Não apagar testes para esconder alertas.

## SAST (ECMSG-124)

Semgrep 1.140.0, instalado em venv isolado com TLS preservado, executa regras AST locais revisadas para TS/React/Node: eval/Function, HTML bruto, hash fraco, shell command strings, Drizzle raw SQL, request → SQL/path/redirect e RNG em identificador sensível. Não baixa regras móveis do registry nem envia métricas/versão/código ao serviço Semgrep. `security:sast` exige versão/configuração/parsing válidos e arquivos realmente analisados; relatório sanitizado contém regra/local, não dump da fonte.

O ganho em relação ao pattern-scanner complementar é parsing estrutural/taint local, não repetir todo alerta de template SQL parametrizado. Drizzle/Postgres.js tagged templates não são sinks raw. A criação/drop de DB temporário em db:check tem identificador server-generated com regex e conexão explicitamente de teste; não recebe input HTTP. Não há ignore global de SQL. Resultados são pending triage, classificados em confirmed, false positive, accepted risk ou tool limitation; Critical/High confirmado bloqueia. Nova exceção deve ser localizada, justificada e revisada; scanner sem alcance interprocedural completo não prova autorização ou ausência de vulnerabilidade. security-review permanece obrigatório nas mudanças de confiança.

## Segurança do workflow (ECMSG-125)

Permissão global vazia; somente o job que faz checkout recebe contents:read. SHA pins oficiais, credenciais não persistidas, sem secrets/deployment/ID token, sem pull_request_target, sem execução shell de título/branch/body/commit. Expressões de concorrência não viram comandos. Runner hospedado efêmero, timeout explícito e shell bash com falha propagada; não há continue-on-error, || true ou exit 0 em gates bloqueantes. Nenhum artefato é publicado: DB, browser profile, .env e logs operacionais permanecem locais/temporários. Npm ci executa scripts de dependências necessárias no contexto sem privilégios; não elimina risco de supply chain.

`ci:validate` executa actionlint 1.7.7 para sintaxe/contextos/expressões do GitHub Actions, complemento específico de workflow, não outro linter de aplicação. Binário tem versão e SHA256 do release verificados pelo mesmo instalador concreto de ferramentas. Findings de segurança exigem também revisão manual; actionlint não confirma privilégio mínimo por si. Primeiro run remoto da base foi observado com sucesso (37552751664); a revisão final deve observar novamente o HEAD completo. API indisponível não é ausência de Git authentication: a página pública de Actions fornece evidência de run. Branch protection não foi aplicada.

## Revisão de mudanças críticas (ECMSG-126)

| Classe | Quando | Revisão exigida |
| --- | --- | --- |
| Normal | Texto/UI sem alteração de autoridade ou infraestrutura | Comportamento, acessibilidade aplicável, check/build e documentação |
| Security-sensitive | Auth, cart/orders/inventory/audit, lib/audit ou lib/abuse, qualquer Server Action, privacidade/headers | security-review: autenticação, role atual, autorização/ownership/IDOR, contrato strict, valores server-owned, DTO/erros, audit/logging, transação/concorrência e sessão após lock; testes negativos e threat model |
| Infrastructure-sensitive | src/db, drizzle, environment, scripts de gates, .github/workflows, políticas de scanners, package.json/lockfile | Permissões, secrets, código não confiável, exit codes e bypass; provenance/instalação, migration/drift, integridade e evidência do CI |

Classes podem se acumular. Paths críticos concretos: src/features/auth/**, cart/**, orders/**, inventory/**, audit/**, catalog/server/** e actions/**; src/lib/audit/**, abuse/**, env/**; src/db/**; drizzle/**; next.config.ts; scripts/**; .github/**; .gitleaks.toml/.semgrep.yml; manifest/lockfile. Um arquivo fora da lista também pode alterar confiança; a lista não dispensa revisão contextual.

DB/migration exige revisar constraints, FKs/delete behavior, upgrade, preservação de dados e alterações destrutivas. Rollback automático de SQL não é presumido; defina recuperação/forward fix conforme mudança real e backups operacionais. Não executar migrations de teste sobre desenvolvimento/produção. CI/políticas podem eliminar um gate: comparar checks/permissions/triggers, pinnings e exceções com a base antes de aprovar.

O autor registra classificação e evidência no PR. Revisor/maintainer explicita resultado e riscos; em projeto solo, checklist e revisão deliberada continuam obrigatórios, sem inventar segundo reviewer ou enforcement GitHub indisponível. Role admin da aplicação não dá permissão de alterar política de SDLC. Gate verde não substitui revisão nem autoriza exceção silenciosa. Consulte AGENTS.md → arquitetura → security-review; exemplos de scanner não substituem os invariantes.
