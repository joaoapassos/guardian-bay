# Task 11 — métricas e calibração

k6 2.3.0 Windows amd64 oficial: https://github.com/grafana/k6/releases/tag/v2.3.0, SHA256 112276d495e5741c968e2bc09ea6196099c1275bd6db9ee0875d173c7148ce43. Verificado contra manifesto da release e digest do asset antes de extrair em .vitest/epic12/tools/k6. Não adicionado ao npm runtime.

`node scripts/validation/prepare-load.mjs` cria 1000 identidades sintéticas/sessões privadas no cluster validado; não mede login nem desativa seus budgets. `node scripts/validation/performance.mjs 2 10 read` calibra; `2 15 commerce` exercita leituras, addCart e checkout PIX respeitando budgets (think time 3s, checkout a cada cinco iterações). Uma identidade por VU. Não executar paralelo a ZAP ou suites PG.

Coleta: k6 HTTP/checks/resultado comercial Flight, p50/p95/p99/RPS/erros; sampler de CPU/memória do host, CPU/working set do processo Next, conexões/locks PostgreSQL. Gerador e app compartilham máquina: resultado não é capacidade de deployment dedicado. Artefatos e tokens somente na pasta ignorada; sumários sanitizados por execução. k6 usa TLS skip apenas nesse destino literal e não segue redirects; validação de TLS real é feita separadamente pelo transporte com CA e browser com SPKI local.

Guard: processo presente, memória <=85%, conexões <80% max, CPU host <=90% sustentado por 60s, deadline e thresholds. Pré-requisito para >2 VUs: relatório SCA produção sem findings. Sucesso comercial precisa de success=true, não só HTTP 200. Nenhuma alteração de config de pool, limite ou regra comercial para melhorar números.

Run curto é calibração, não benchmark sustentado. Plano de capacidade exige patamares separados, aquecimento, medição e autorização operacional para aumentar conforme resultados. Requests de cadastro/login não entram no workload de capacidade; validar abuso separadamente.

Calibração observada: read 2 VUs/10s, 40 requests, 3.93 req/s, p95 11.15ms/p99 13.41ms; commerce 2 VUs/15s, 32 requests, 2.11 req/s, p95 13.49ms/p99 17.99ms. Zero falhas inesperadas, 13 conexões máximas e zero lock waiters; CPU host máxima 7.26%, memória 43.02%. Ambos PASS e integridade preservada. Amostra curta não estima capacidade máxima.

Revisão de isolamento do Chrome: substituída exceção TLS genérica por SPKI do certificado local; interceptação Fetch do CDP bloqueia toda URL externa antes do envio, incluindo redirect/subrecurso. `node scripts/validation/browser-safety.mjs` comprovou fetch externo interceptado/rejeitado, sem atingir terceiro. Isso protege o laboratório, não altera CSP do produto.
