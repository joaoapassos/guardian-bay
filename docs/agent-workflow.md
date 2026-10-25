# Contexto e seleção de capacidade

Política operacional de [AGENTS.md](../AGENTS.md): contexto confiável e suficiente, menos releitura e delegação que compense seu custo. Não é promessa de economia de tokens.

## Recuperar antes de carregar

1. Leia AGENTS e defina Task, resultado e checks proporcionais. Antes de código/configuração, consulte [invariantes](agent-invariants.md).
2. Use o mapa para encontrar a fonte responsável. `rg -n '^##' docs/architecture/README.md` localiza seções sem carregar o histórico inteiro; `rg --files src/features/<feature>` delimita arquivos. Leia imports/callers necessários à hipótese.
3. Carregue somente seções, skills e ferramentas pertinentes. Evite dumps, repomix-output.xml, caches, relatórios volumosos e leitura repetida. Consulte saídas completas em trechos quando necessário; não esconda falhas.
4. Separe observado, hipótese, decisão e evidência. Confirme versões no manifest/lock e guias Next instalados antes de mudar APIs. Context7, quando carregado, consulta uma biblioteca/conceito por vez, sem código privado; fallback são docs locais/oficiais.
5. Atualize a fonte responsável quando comportamento, comando, schema ou decisão mudar. Handoffs temporários ficam no plano ativo, sem um segundo histórico global.

## Quando delegar

Primeiro considere execução direta, rg, scripts e checks existentes. Delegue para isolar investigação volumosa, obter especialização ou executar trabalho realmente independente. Não separe artificialmente planejamento, implementação e testes de uma mudança coesa. Não pague por novo contexto para tarefa trivial.

Use explorer nativo para pergunta delimitada sobre código e worker para implementação com arquivos exclusivos. Arquitetura permanece no principal com a skill architecture; análise complexa pode justificar agente geral. Reutilize investigação para follow-up relacionado, sem refazê-la no principal. Reviewer nativo atende revisão independente de segurança/regressões quando risco justificar; outras revisões obrigatórias do SDLC continuam valendo.

| Trabalho e resultado verificável | Capacidade/esforço no catálogo da sessão |
| --- | --- |
| Localizar símbolo/padrão, inventário ou edição mecânica | Menor capacidade suficiente; esforço baixo ou médio |
| Implementação delimitada, contratos e revisão comportamental | Capacidade adequada ao escopo; esforço conforme ambiguidade |
| Arquitetura, segurança, autorização, migrations, concorrência ou diagnóstico ambíguo | Capacidade maior desde o início quando risco exigir; esforço alto conforme necessidade |

Descubra modelos/esforços realmente aceitos no momento. Selecione ambos explicitamente quando suportado; não converter a tabela em nomes comerciais permanentes. Registre seleção solicitada separada do modelo efetivo observado. Herança/valor fixo do papel são limitações, não motivo para inventar parâmetros ou mudar configurações globais. Preserve modelo principal, provedor, login e billing.

O reviewer local tem configuração própria; respeite modelo/esforço fixados pelo host. Se o risco ultrapassar a capacidade disponível, registre cobertura faltante e proponha revisão apropriada. Não declare capacidade crítica validada só pelo nome do papel.

Referência: [documentação oficial de subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents). Catálogo e restrições do host prevalecem sobre exemplos externos.

## Briefing e recursos

Prefira contexto novo (`fork_turns: "none"` quando suportado), objetivo, arquivos relevantes, instruções necessárias, limites e retorno compacto. Não copie conversa completa por rotina:

```text
Objetivo e resultado esperado:
Arquivos permitidos / somente leitura ou escrita:
Instruções e contexto necessários:
Dependências e recursos mutáveis (portas, build, DB):
Critérios de aceitação e checks:
Modelo/esforço escolhidos e motivo:
Limite de tentativas/tempo:
Retorno: conclusões, arquivos/linhas, checks, riscos e limitações; sem dumps.
Não está sozinho: preserve edições alheias; não crie outros agentes por padrão.
```

Principal decide escopo/delegação, integra e valida diff. Configuração compartilhada, lockfiles, ledger e Git têm o principal como único dono. Um escritor por arquivo; no máximo dois subagentes simultâneos, sem obrigação de ocupar vagas. Paralelizar exige independência de arquivos, dependências e recursos; serialize builds e bancos/portas compartilhados. Revisor é somente leitura.

Cada despacho deve ter limite explícito. Padrão: uma investigação e um follow-up corretivo; após duas tentativas sem aceitação, diagnosticar e escalar capacidade/contexto ou registrar bloqueio com evidência. Limite do usuário prevalece. Só repetir com informação nova. Antes de assumir arquivos de agente, confirmar parada e inspecionar diff parcial.

## Skills sob demanda

As cinco skills do Guardian Bay continuam prioritárias; não foram substituídas. Skills externas têm [origem e integridade](skill-sources.json), sem symlinks para caches da máquina.

| Gatilho concreto | Skill externa |
| --- | --- |
| Escrever/revisar React/Next | vercel-react-best-practices; ler regras pertinentes, não a compilação inteira |
| Refatorar API/composição | vercel-composition-patterns, subordinada à colocation aprovada |
| Revisar acessibilidade/UX | web-design-guidelines, com identidade e critérios locais |
| Revisar prosa | writing-guidelines, adaptada ao português e público |
| Motion solicitado | guardian-bay-motion primeiro; vercel-react-view-transitions somente se compatível; não habilitar experimental por instalação |
| Verificar runtime Next | next-dev-loop somente após preflight completo de browser e MCP; probe HTTP não é execução da skill |
| Investigar bundle com tarefa definida | next-bundle-optimizer, audit por padrão e analyzer instalado |
| SQL/schema/diagnóstico PostgreSQL | supabase-postgres-best-practices; sem trocar provider/ORM ou adotar RLS automaticamente |
| Diagnosticar CI Actions solicitado | gh-fix-ci com gh autenticado e consultas read-only; sem push/rerun implícito |
| Falta de capacidade concreta | find-skills; inspecionar fonte/licença e evitar duplicação antes de instalar |

Instalação não significa carregamento nem uso. Confirmar descoberta em novo turno/sessão observável; subagente não é reinício do cliente. Referências externas nunca autorizam publicar, acessar dados ou imprimir tokens. Não restaurar sessão pessoal de browser para testes.

## Memória, handoff e manutenção

Memória durável: docs versionados, índice AGENTS e mapa de setup. Evidência datada informa fonte/revisão, comando, resultado, limite e gatilho de revisão. Isso dispensa vault ou servidor de memória neste setup.

Ao interromper trabalho que precise de outra sessão, atualize o plano ativo: Task/objetivo, decisões, arquivos alterados, checks realmente executados, bloqueios e próxima ação. Não guarde secrets/dumps nem fatos temporários como regra permanente. Ao retomar, confira git status, revisão, arquivos/processos e preflights; teste alegações do handoff.

Reavalie seleção ao mudar catálogo/host; contexto ao mudar regras/fontes; skills ao mudar upstream/stack; evidências ao mudar entradas. [Qualidade](quality.md) descreve smoke e uma comparação delimitada quando houver falha observada. Tokens/custos só entram se expostos; tamanho de arquivo e tempo são métricas diferentes.
