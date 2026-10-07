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
