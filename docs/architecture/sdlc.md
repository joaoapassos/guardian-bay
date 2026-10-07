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
