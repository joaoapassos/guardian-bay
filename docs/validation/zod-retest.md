# Correção autorizada e reteste — 2026-10-24

Commit corretivo `4883e34`: somente `package.json` e `package-lock.json`, Zod 4.6.5 → 4.6.7, sem alterações transitivas, de código comercial ou política de exceções. Instalação com scripts desabilitados. Revisão independente do diff sem achados.

| Gate | Resultado após correção |
| --- | --- |
| SCA produção | Zero findings; bloqueio do advisory removido |
| SCA completo | Quatro Moderate de ferramentas aceitos pela política vigente, sem novas exceções |
| Lint / TypeScript / unitários | PASS / PASS / 115 PASS |
| PostgreSQL | 185 PASS |
| Build produção / HTTP e browser | PASS / 13 PASS |
| Escopo / supervisão do laboratório | Três testes Node PASS |
| Gitleaks / Semgrep / actionlint | PASS / PASS / PASS |
| Integridade de manifesto e lockfile | PASS |

A primeira tentativa de integração não executou asserções por PostgreSQL indisponível: o comando de inicialização omitiu a porta dedicada. Corrigido para bind loopback e porta 55442; repetição completa aprovada. Isso foi uma falha operacional de setup, sem conclusão sobre regras comerciais nessa tentativa.

Nova campanha: runId `36ec72c4-3d42-4bb3-95d6-bb504380a690`, build de produção com Zod corrigido e Actions recapturadas pela UI. A primeira captura encontrou corrida entre navegação e hidratação do botão; o harness passou a esperar seu handler antes de clicar. Aplicação preservada. Uma tentativa de abuso foi interrompida por ausência da variável explícita do Chrome; repetição com ambiente completo passou.

[Evidência anterior preservada](results-zod465.json): descreve corretamente o bloqueio anterior e não deve ser reinterpretada como execução de carga. [Resultados atuais](results.json) separam a nova campanha por runId/build. O ZAP da campanha anterior não foi reexecutado por esta correção; seus achados e limites continuam históricos.

O reteste não representa execução humana no Burp, observação natural da expiração de boleto de 24 horas, teste de canal temporal, garantia integral ASVS/WSTG ou resistência a DDoS. Nenhuma atualização de pool, limites ou regra comercial foi aplicada para melhorar números.

## Instrumentação e tentativas preservadas

Na primeira progressão após a atualização, 10 VUs passaram nos dois fluxos; 50 VUs em leitura passaram nas requisições, mas reprovaram pelo máximo de CPU de 100%. A inspeção revelou que o coletor convertia delta zero dos contadores iniciais em 100% (`Math.max(1, delta)`). Essa leitura inicial não sustenta uma conclusão de saturação. Relatórios e séries da tentativa foram preservados localmente, sem reinterpretar a falha como sucesso.

Commit de harness `047cd96`, separado da correção do Zod: exige um intervalo inicial de 250 ms, rejeita deltas inválidos e registra o intervalo bruto de CPU nas séries. Thresholds e guard de recursos preservados; revisão independente sem achados. Também registra a espera por hidratação e consolidação com versão/SCA atuais. A progressão foi reiniciada após nova calibração, sem aumentar limites para obter aprovação.

Commit `3d1b272`: separa os nomes de evidência de estresse (`task-13-perf-*`) dos nomes de capacidade (`task-12-perf-*`). Sem essa separação, a repetição de baseline sobrescreveria o sumário do patamar medido. Workloads, volume, thresholds e métricas não foram alterados.

## Carga progressiva observada

Cada linha aprovada teve aquecimento de 15s e medição exploratória de 60s. RPS corresponde ao workload inteiro; percentis em milissegundos. Todos os seis patamares medidos tiveram zero erro inesperado, no máximo 20 conexões PostgreSQL e zero lock waiters nas amostras. CPU do host máxima nesses patamares: 19,04%; memória: 46,86%. Não são campanhas sustentadas de cinco minutos.

| VUs | Fluxo | RPS | p50 | p95 | p99 |
| --- | --- | --- | --- | --- | --- |
| 10 | Leitura | 19,20 | 20,51 | 26,43 | 29,55 |
| 10 | Comércio | 10,42 | 20,60 | 31,62 | 41,72 |
| 50 | Leitura | 87,55 | 70,34 | 107,22 | 132,92 |
| 50 | Comércio | 49,08 | 63,89 | 127,20 | 178,21 |
| 100 | Leitura | 156,50 | 141,01 | 204,98 | 255,15 |
| 100 | Comércio | 90,31 | 148,66 | 236,79 | 343,93 |

**500 VUs: FAIL no aquecimento de leitura.** Duração planejada 15s, interrompida antecipadamente pelo threshold de erros. p95 1094,30ms; p99 1186,88ms; taxa customizada de falhas por iteração 19,87%; falhas HTTP 16,03%. Os denominadores são diferentes: a métrica customizada agrega o par de leituras e não equivale à taxa de falhas HTTP. RPS 478,72 durante a tentativa abortada não é throughput sustentável.

O log privado do k6 registrou recusas de conexão com o proxy local em 3449. O supervisor/app continuou ativo, a rota voltou a responder 200 após a interrupção e a auditoria DB mostrou zero estoque negativo, totais divergentes, estados inconsistentes ou intenções duplicadas. Causa-raiz da indisponibilidade transitória não isolada entre proxy, sockets do host, gerador e aplicação. Não atribuir ao Next.js nem declarar capacidade máxima do produto sem diagnóstico separado.

Não houve medição de 60s com 500 VUs, fluxo comercial nesse patamar ou qualquer tráfego de 1000 VUs. Maior patamar exploratório aprovado nesta configuração compartilhada: **100 VUs**, limitado aos dois workloads definidos, com sessões provisionadas. Não cobre login nem confirmação de pagamentos sob carga.

## Pico e recuperação

Baseline de leitura 100 VUs/30s: PASS, 153,16 req/s, p95 251,05ms, zero erro inesperado. Pico planejado 500 VUs/10s: FAIL, interrompido antecipadamente, p95 1151,70ms, p99 1245,44ms, taxa customizada de falhas 20,64%. Não elevar para 1000.

Recuperação: PASS em 9,122s após o encerramento do runner de pico, com dez leituras consecutivas HTTP 200 dentro de 120% do p95 de referência da medição de capacidade de 100 VUs. Auditoria de integridade aprovada. Tempo não inclui o encerramento do gerador, não cobre todas as rotas nem recuperação após falha/reinício real de processo. O cenário agregado de estresse permanece FAIL porque o pico violou os thresholds.

Achado PERF-01 → indisponibilidade transitória e latência fora do limite a 500 VUs no ambiente local → bloqueia aprovação desse cenário e escalada para 1000, sem bloquear a correção do Zod ou os patamares inferiores observados. Diagnóstico de causa-raiz e otimizações exigem escopo próprio; nenhum ajuste de produto foi realizado nesta execução.
