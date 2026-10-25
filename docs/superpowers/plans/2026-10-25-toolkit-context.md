# Toolkit Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** melhorar contexto e seleção de capacidade sem enfraquecer as regras do Guardian Bay; avaliar o catálogo inteiro e comprovar o que for executável.

**Architecture:** documentação versionada como memória em camadas; AGENTS.md como entrada curta; ferramentas nativas com delegação seletiva. Sem alteração arquitetural de produto.

**Tech Stack:** Codex, Markdown, skills locais; Next.js/React/PostgreSQL e npm/Biome/Vitest existentes.

**Spec:** [desenho aprovado](../specs/2026-10-25-toolkit-context-design.md).

## Global Constraints

- Preservar produto, contratos, dados, stack, npm, lockfile, CI e controles existentes.
- Biome continua como formatter/linter principal; não adicionar ESLint apenas para copiar templates.
- Não mudar modelo principal, provedor, autenticação, permissões, custos ou configurações globais.
- Sem publicação, push, mensagens externas, migrations, produção, hooks de Git, novas exigências de branch/worktree ou atualização geral da máquina.
- Não alegar economia de tokens ou integração funcional sem observação correspondente.
- Execução no principal para arquivos compartilhados; subagentes somente para investigação delimitada, revisão ou casos descartáveis independentes. Aprovação do desenho e instrução “so seguir” preservadas; não há nova arquitetura a aprovar neste plano.

## Review Focus

- Garantia removida ao encurtar AGENTS: comparar todos os invariantes originais com fontes e novas referências.
- Modelo indisponível ou fixado pelo host: registrar limitação e herança; não inventar seleção efetiva.
- Skill instalada confundida com carregada: distinguir instalação, descoberta e execução.
- Banco/browser sem ambiente de teste: preflight falha sem fallback para ambiente normal.
- Alterações locais ou reexecução: preservar configuração e impedir cópia duplicada; revisão de caminhos, origens e backups.

## Etapa 1 — contexto e operação

**Files:** AGENTS.md, README.md; criar PRODUCT.md, docs/onboarding.md, docs/quality.md, docs/setup.md, docs/agent-workflow.md e docs/agent-invariants.md. CLAUDE.md, arquitetura, DESIGN.md e identidade visual permanecem canônicos. Dependência: desenho. Recursos: checkout, sem serviços.

**Interface:** mapa de documentos e política de delegação consumidos por agentes e evidências da etapa 3.

- [x] Guardar backup ignorado de arquivos de configuração antes de editar; registrar baseline do contexto em bytes/linhas.
- [x] Preservar literalmente os invariantes detalhados em docs/agent-invariants.md; manter garantias essenciais e precedência no índice, com link de leitura obrigatória antes de implementação/revisão.
- [x] Escrever política com escolha dinâmica, modelo/esforço explícitos, contexto limpo, dono de arquivos, limite de duas tentativas antes de diagnóstico/escalada, e retorno compacto.
- [x] Criar documentos faltantes a partir do produto observado e fontes existentes; corrigir versão obsoleta no README. Links e comandos sem secrets.
- [x] Verificar correspondência dos invariantes, links locais e diferença do bloco gerado Next; comparar tamanho sem converter bytes em tokens.

## Etapa 2 — ferramentas aplicáveis

**Files:** .agents/skills/<upstream-name>/**, skills-lock.json se produzido oficialmente, docs/setup.md e docs/agent-workflow.md. Modificar configurações locais apenas se houver mecanismo suportado e lacuna concreta. Dependência: catálogo na revisão fixada. Recursos: downloads upstream para temporários, sem execução de código desconhecido.

**Interface:** inventário de origem/revisão/licença/nome/hash e estado por componente para etapa 3.

- [x] Ler guias restantes e fontes upstream; inventariar CLI/MCP/skills existentes sem ler credenciais.
- [x] Inspecionar antes de copiar skills aplicáveis; instalar somente arquivos de instruções/referências necessários em escopo local, com proveniência verificável e portabilidade Windows. Não duplicar skills já disponíveis que cumpram o mesmo papel.
- [x] Avaliar todo o web set Vercel, PostgreSQL, CI e differential-review; justificar equivalência ou não aplicação dos extras. Registrar ferramentas globais ausentes/indisponíveis com comando/intervenção e efeito, sem instalá-las implicitamente.
- [x] Avaliar typed lint/limite de linhas/rules do toolkit contra Biome e scanners existentes; manter implementação atual se não houver benefício comprovado compatível. Não copiar plugin ESLint sem consumidor.
- [x] Testar integrações existentes com operação real read-only/local quando possível; distinguir falha ambiental de falta de instalação. Revisar duplicação e arquivos novos.

## Etapa 3 — evidência, recuperação e revisão

**Files:** docs/setup.md, docs/quality.md, plano e desenho para status final. Dependência: etapas 1–2. Recursos: build serial; perfis/fixtures temporários; sem DB real sem TEST_DATABASE_URL validado.

**Interface:** ledger final de cobertura, antes/depois e próximos passos sem dados privados.

- [x] Executar `npm run check`, `npm run build`, `npm run security:dependencies`, preflights de integração/browser e `git diff --check`; registrar saída/limites. Não alterar gates para obter sucesso.
- [x] Validar startup loopback em porta livre e rota sem DB; browser real se disponível com perfil novo; encerrar somente recursos criados pela tarefa.
- [x] Smoke em contexto novo: localizar fonte de segurança/arquitetura e comando; verificar despacho explícito de capacidade; fixture com handoff stale e revisão read-only, usando evaluator externo. Limite de uma comparação para falha concreta; casos sem observação ficam não executados.
- [x] Revisar tamanho, links, proveniência e reexecução segura em cópia descartável; preservar customizações. Registrar adaptação Harness2 nativa e Prompt 13/14/15 versionados.
- [x] Revisão independente read-only do diff e contratos documentais; corrigir achados pertinentes, repetir apenas checks afetados e consolidar matriz final de todo catálogo com condição de retomada de cada pendência.

## Verificação do plano

Cobertura: contexto/produto na etapa 1; catálogo/configuração na etapa 2; qualidade, comportamento, segurança, manutenção e entrega na etapa 3. Não há interfaces de produto novas ou assinaturas a coordenar. Mudanças documentais reversíveis usam verificação de conteúdo e recuperação; lógica nova, se necessária, exige self-check significativo antes da adoção.

## Ledger de execução

- Etapas 1 e 2: concluídas localmente; fontes e decisões em docs/setup.md.
- Etapa 3: checks, build, audit canônico corrigido e validado, smoke real Chrome, hashes/links/invariantes e reaplicação segura executados; revisão final e follow-up do gate sem achados acionáveis. Integração/CI remoto/MCP carregado dependem dos pré-requisitos registrados.
- Ruling: sem worktree ou commits automáticos, conforme limites expressos do Prompt 12; backup ignorado e diff revisável preservam recuperação. Sem testes novos de produto para documentação/skills; fixtures descartáveis verificam comportamento e regras novas.
- Ruling: copiar módulos ESLint sem consumidor seria redundância; Biome 2.4.2 comprovadamente oferece ambas as regras async e as medições/negativos sustentaram sua adoção. Nenhum linter adicional.
- Ruling inicial: preservar gate herdado e registrar EINVAL Windows. Superada após revisão pela necessidade de validar o comando canônico dentro do próprio setup: correção anunciada, limitada a Node + npm_execpath, sem shell e sem mudar política. Regressão descartável red/green e seis casos de fail-closed executados; gate real passou. Não foi aberta outra Task de produto nem alterada arquitetura comercial.
