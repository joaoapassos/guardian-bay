# Epic 13 — entrega e limites de capacidade

> Relatório histórico da Task 17. A meta atual é **1.000 usuários virtuais navegando**, conforme o [procedimento vigente](epic13-navigation.md). Comandos para scripts aposentados neste relatório descrevem a revisão original do Git e não devem ser usados no fluxo atual. As conclusões abaixo permanecem como evidência daquela execução; não são o status da campanha de navegação em andamento.

> A campanha atual foi concluída: [1.000 VUs por 20 minutos — resultados e condições](epic13-navigation-results.md).

**Meta de5000 usuários não demonstrada. PERF-01 continua aberto.** Não há correção causal aprovada nem baseline representativa sustentada. Todos os resultados históricos da Epic12 permanecem preservados; os documentos epic13-* acrescentam diagnósticos e decisões.

## Resultados observados

- Diagnóstico local de leituras mistas:100VU/20s passou;250VU reprovou por latência, inclusive com rampa e duas instâncias. Não repetir esse PASS curto como aprovação sustentada de100.
- Evidência de utilização elevada do event loop do processo Next sob carga mista; causa completa das recusas e função responsável não isoladas. Não comprovada saturação PostgreSQL ou responsabilidade exclusiva do proxy.
- Correção independente de sessão: atividade por interação visível, com autoridade do servidor e limites idle/absoluto preservados; testes de browser/DB e revisão registrados na Task06.
- Calibração de dois usuários:56requests, zero falhas, p9522,06ms e p9930,87ms, aproximadamente95s. Teto180s não é duração sustentada. Seis pedidos PAID (dois por método), seis unidades consumidas e seis eventos de conclusão, com integridade global preservada.
- Três amostras SQL READ ONLY abaixo de0,05ms de execução, dados pequenos em cache; não representam planos completos da aplicação nem concorrência em escala.
- Preflights1000/2000/3500/5000: exit2, zero tráfego, sem patamar anterior aprovado. Endurance/picos não executados nesta entrega.

## Estado das Tasks

| Task | Entrega | Limite ou pendência |
| --- | --- | --- |
| 01 | Instrumentação, manifesto e guard de recuperação | Não mede diretamente fila do pool/portas |
| 02 | Experimentos locais controlados | Causa completa de PERF-01 não isolada |
| 03 | Experimento com duas instâncias | Reprovado; sem correção de laboratório aprovada |
| 04 | Perfil CPU e decisão de não otimizar especulativamente | Sem correção de produto comprovada |
| 05 | Gate de progressão e evidência de bloqueio | Revalidação sustentada100/250/500 pendente |
| 06 | Atividade legítima de sessão implementada e validada | Não é solução comprovada de PERF-01 |
| 07 | Hipóteses, jornadas e calibração de dois usuários | Coortes sustentadas, atividade no workload longo e dataset em escala pendentes |
| 08 | Avaliação do laboratório autorizado | Staging separado não provisionado; usuário limitou a local |
| 09 | Amostragem SQL e análise do caminho da conta | Trace representativo completo pendente |
| 10 | Decisão e critérios para correção comercial | Correção bloqueada por falta de evidência causal |
| 11 | Orçamento e critérios de dimensionamento | Sem ajuste de infraestrutura justificado |
| 12 | Preflight1000 bloqueado | Carga1000 não executada |
| 13 | Preflight2000 bloqueado | Carga2000 não executada |
| 14 | Preflight3500 bloqueado | Carga3500 não executada |
| 15 | Preflight5000 bloqueado | Carga5000 não executada |
| 16 | Procedimento condicionado de endurance/recuperação | Campanha não executada |
| 17 | Consolidação, reprodução e checks | Documentação não encerra as validações pendentes |

Commits individuais registram trabalho, decisões e bloqueios; sua existência não significa que todas as Tasks atingiram seus critérios de conclusão.

## Reprodução independente

Usar environment.md para reconstruir cluster dedicado, lease, certificado, fixtures e produção local. Nunca usar next dev para comparar capacidade. O escopo atual recusa destinos externos; todas as variáveis devem apontar exatamente para os destinos locais documentados.

1. Registrar `git rev-parse HEAD`, Node/SO/hardware, `.next/BUILD_ID`, configuração e hashes do workload. `npm ci`, `npm run check`, `npm run build`; preparar cluster/seed e iniciar `lab.mjs serve` em terminal próprio. Só executar sobre novo run isolado; preservar dados/evidência anteriores.
2. Definir LAB_BASE_URL, TEST_DATABASE_URL e SECURITY_BROWSER_PATH como em environment.md; usar representative.md para captura real, preparação de duas sessões, calibração e verificação posterior. Capturas pertencem ao build atual; arquivos privados não devem ir para Git. Tokens provisionados não medem autenticação.
3. Conferir exitcode, checks, tendências por leitura/mutation, iterações concluídas e guards; inspecionar reports, manifest.json, summary.json, resources.json e observadores privados. `seconds:180` é o teto da calibração, não uma medição de180s. O relatório público preserva o identificador legado task-11 dessa execução, explicado na Task07.
4. Executar verify-representative.mjs após o término do k6, não durante espera de boleto. Exigir contagem esperada de pedidos, status, estoque, auditoria e invariantes globais. Nenhum k6 PASS isolado é aprovação final.
5. `node scripts/validation/profile-selects.mjs` executa somente três planos de leitura, sanitizados; não transforma uma query rápida em prova de capacidade do banco.
6. `node scripts/validation/stage-preflight.mjs 1000` deve retornar2 no estado atual. O mesmo vale para2000/3500/5000. Não preencher registros de aprovação sem medição/revisão real nem usar runners históricos para contornar o gate. Atualmente não existe runner sustentado representativo concluído para essas escalas.
7. Antes de qualquer novo diagnóstico de carga, repetir SCA, verificar certificado/lease, ausência de campanhas concorrentes e capacidade do monitor/gerador. Alterar uma variável por experimento; conservar baseline e falhas. Critérios/durações em endurance.md precisam de implementação/revisão antes da campanha.

O k6 usa exceção TLS exclusivamente para a origem literal local; isso não valida PKI de produção. Chrome/transport Node usam o certificado local específico. Dados de pagamento são fictícios; nenhum gateway, banco externo ou transferência real foi acionado.

## Checks e conclusão

Checks finais:119 testes unitários, oito testes Node de escopo/gates/supervisão, Biome e TypeScript aprovados. Produto após Task06 já teve build,186 testes PostgreSQL,82 auth direcionados,13 HTTP/browser e quatro cenários adicionais Chrome/DB aprovados; alterações posteriores são harness/documentação, sem migrations/dependências novas. Não confundir testes de integridade funcional com endurance natural.

Próximo trabalho técnico: completar observabilidade de serviço/fila/gerador e workload sustentado, isolar PERF-01 mantendo volume e coortes controlados, demonstrar correção mínima e revalidar100/250/500. A restrição local permite diagnóstico, mas não remove a interferência do host compartilhado. Não há garantia para5000 sessões ativas, usuários navegando, requests concorrentes ou disponibilidade de produção.

SCA final: produção sem findings; quatro findings existentes de tooling, sem triagem pendente, sujeitos à política de aceitação já vigente. Gitleaks final:330 arquivos indexados, nenhum segredo pendente. Nenhuma atualização de dependência foi necessária nesta Epic.
Semgrep final:213 arquivos, zero findings pendentes de revisão contextual. Laboratório e cluster dedicado encerrados após coleta, com dados e evidências preservados.
