<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Comece pela Task atual

- Preserve `Sistema → Epic → Tasks → Task atual → Implementação → Validação`; não avance para outra Task. Leia instruções, código e configuração pertinentes antes de agir; preserve mudanças locais.
- Antes de implementar/revisar, leia os [invariantes completos](docs/agent-invariants.md). Precedência: `AGENTS.md e invariantes → arquitetura aprovada → segurança → frontend-patterns e recomendações genéricas`. Skills externas cedem às regras do Guardian Bay.
- Preserve `app → feature/server → db`, Server por padrão e Client mínimo. Actions são endpoints públicos: validam entrada, autenticação, autorização e ownership na própria operação. Cliente envia intenção, nunca autoridade; DTOs mínimos, secrets no servidor e SQL parametrizado. Detalhes obrigatórios nos invariantes.
- Faça a menor alteração correta, com critérios e checks definidos antes de editar. Informe conflito ou ampliação de escopo. Biome é formatter/linter principal; não introduza ESLint ou camadas sem necessidade comprovada.

## Comandos

Use npm e package-lock.json. `npm run dev` inicia a aplicação; `npm run check` executa Biome, tipos e unitários; `npm run verify` acrescenta build. Use `git diff --check` e `git diff --cached --check` para whitespace. Gates por risco: [qualidade](docs/quality.md) e [SDLC](docs/architecture/sdlc.md).

Integração exige `TEST_DATABASE_URL` local dedicada, validada pelo preflight; nunca usar produção ou DATABASE_URL como fallback. Não executar migrations, publicar ou alterar serviços por efeito colateral.

## Contexto e delegação

Resolva trabalho simples no principal ou com ferramenta determinística. Delegue apenas quando isolamento de contexto, especialização ou independência justificarem o custo. Consulte a [política de contexto e capacidade](docs/agent-workflow.md) antes de delegar: contexto novo e mínimo, modelo/esforço explícitos quando suportados, um escritor por arquivo, até dois subagentes simultâneos. Preserve modelo principal, provedor e autenticação; respeite papéis fixados pelo host. Não crie subagentes recursivos por padrão.

## Mapa de fontes — leia conforme a Task

| Precisa de | Fonte |
| --- | --- |
| Produto e contratos implementados | [PRODUCT.md](PRODUCT.md) |
| Rodar localmente e preparar testes | [README](README.md), [onboarding](docs/onboarding.md) |
| Camadas, colocation, Server/Client | [arquitetura](docs/architecture/README.md), skill `architecture` |
| Confiança, auth, dados e concorrência | skill `security-review`, [threat model](docs/architecture/threat-model.md) |
| React/Next e interface | skill `frontend-patterns`, [DESIGN.md](DESIGN.md), [identidade visual](docs/visual-identity/README.md) |
| Componentização, formulários, estado e notificações | skill [guardian-bay-components](.agents/skills/guardian-bay-components/SKILL.md) |
| Ilustração editorial, criação por descrição e transformação pictórica | skill [guardian-bay-illustration](.agents/skills/guardian-bay-illustration/SKILL.md) |
| Movimento solicitado | skill `guardian-bay-motion`; compatibilidade/acessibilidade antes de APIs externas |
| Scan complementar solicitado | skill `nextjs-security-scan`; não substitui revisão contextual |
| Skills externas e gatilhos de uso | [workflow](docs/agent-workflow.md#skills-sob-demanda), [origens](docs/skill-sources.json) |
| Gates, revisão e avaliação do harness | [qualidade](docs/quality.md) |
| Instalação, evidências e pendências | [setup](docs/setup.md) |

Documente mudanças na fonte responsável, sem duplicar decisões. Handoff é contexto, não evidência: confira checkout, arquivos e processos ao retomar. Responda status e continue trabalho autorizado; bloqueio parcial afeta só suas dependências. Nunca alegue execução em background sem processo observável.
