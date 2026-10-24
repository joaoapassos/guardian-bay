# Task 12 — progressão de carga

Runner: `node scripts/validation/capacity.mjs`. Pré-requisito fail-closed: SCA produção sem findings, relatório recente (15min), lease e cluster válidos, fixtures privadas e captures da build atual. Não editar o relatório SCA para contornar o gate. Antes da campanha, executar o gate real e conferir advisory/política.

Progressão: 10 → 50 → 100 → 500 → 1000; em cada patamar, read e commerce separados, aquecimento de 15s e medição exploratória de 60s. Interrompe ao primeiro threshold/recurso/integridade fora do critério. 500/1000 não são garantidos; só são enviados se todos os passos anteriores passarem. A campanha curta identifica sinais de capacidade, não substitui repetição sustentada de 5min por patamar para estabelecer SLO.

Não autenticar todos os usuários pelo endpoint de login durante a subida: isso mediria o budget global de autenticação. Sessões são de fixtures provisionadas e sua atividade é renovada na preparação, explicitamente fora do período medido; não é evidência de login ou idle expiry. Commerce respeita budget real de checkout por usuário e não confirma automaticamente Pix pendente. Não extrapolar estes números para todo fluxo de venda paga ou outro deployment.

Capturar RPS, p50/p95/p99, erros inesperados/resultado comercial, CPU/memória do host e app, conexões e lock waiters. Conservar relatório e integridade mesmo se k6 abortar. A operação usa máquina compartilhada com o gerador; saturação do gerador exige classificação inconclusiva, não limite comprovado do servidor.

Estado histórico inicial: execução acima de 2 VUs bloqueada pelo finding SCA-01 (Zod); runner produziu INCONCLUSIVE e exit 2, com zero tráfego de capacidade. A correção foi posteriormente autorizada e aplicada no commit 4883e34. Consultar [reteste](zod-retest.md) e [resultados atuais](results.json) para os patamares efetivamente executados; o bloqueio original permanece na evidência histórica.
