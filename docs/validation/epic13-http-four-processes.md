# Task21 — quatro processos e custo de conexão

Experimento opt-in LAB_APP_INSTANCES=4, somente3139–3142 em loopback. Padrão1 preservado; nenhum ajuste de pool ou produto. Budget observado49conexões/100, abaixo do guard80%; memória host chegou75,01%, sem desabilitar guard85%. Manifesto e supervisão incluem os quatro PIDs e abortam se um falhar.

[Resultados](epic13-http-four-instances.json): primeiro100 com aquecimento insuficiente reprovou p951247,21ms. O profiler passou a aquecer explicitamente20GETs por instância em cada rota, antes das20medições, separando inicialização do driver. Depois100 passou três vezes:464,66/415,28/452,70ms;250 reprovou602,18ms. Nenhum request acima de250 enviado. Não eliminar o FAIL inicial nem apresentar esses ensaios como estabilidade sustentada.

No250, proxy observou pico145requests pendentes e um processo Next21; batch250 não significa250requests efetivamente em voo. Tempo de conclusão da rajada999ms, TLS p95497,64ms, TCP p952,50ms. A métrica http_req_duration continuou com os limites500/1500ms. Percentis TLS/HTTP não podem ser somados para derivar p95 total; burstWallMs mede o lote inteiro, incluindo estabelecimento de conexões e excluindo as pausas de instrumentação.

A ausência de ganho proporcional ao número de processos, redução de requests em voo no backend e custo TLS são sinais para isolar o proxy. Não constituem causa completa comprovada: próximo experimento deve comparar acesso direto de leitura ao mesmo conjunto de processos e preservar os resultados HTTPS. Não substituir aprovação HTTPS por PASS de HTTP interno.

Checks do harness: nove testes Node e Biome PASS; SCA produção0. Mudanças: allowlist fixa de quatro portas, supervisão até quatro PIDs, métricas explícitas de topologia/TCP/TLS/tempo do lote e aquecimento por instância. Nenhuma dependência, migration ou requisito de segurança alterado.
