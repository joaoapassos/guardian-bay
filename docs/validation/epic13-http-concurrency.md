# Continuação — requisições HTTP em voo

Meta esclarecida pelo usuário:5000 requisições HTTP em voo, não5000 VUs com think time. Novo perfil `simultaneous-http-burst-v1`: uma rajada, metade GET/products, metade GET/account, identidades sintéticas próprias, sem redirects e sem mutations. Não representa checkout ou disponibilidade sustentada. Nenhum endpoint artificial leve foi criado para obter PASS.

Task18: observer usa diagnostics_channel http.server.request.start nos processos do proxy e Next; término finish/close contabilizado uma única vez. PeakInSample preserva sobreposição real entre amostras; não é inferido pelo número de VUs. Proxy mede requests pendentes incluindo espera pelo backend; backend mede requests aceitos naquele processo, não sockets na fila do SO. Picos de processos diferentes não devem ser somados como simultâneos.

Runner: LAB_REQUESTS=10|25|50|100|250 e `node scripts/validation/performance.mjs 1 30 concurrent`. Um VU dispara http.batch com batchPerHost explícito; destino permanece loopback3449, cluster55442. Dois segundos antes e três após permitem amostras do observador; não entram na latência HTTP. RPS global inclui essas pausas e não é throughput sustentado do servidor.30s é teto do runner, não duração sustentada. k6 não verifica PKI nesta exceção TLS local; não extrapolar para produção.

[Baseline](epic13-http-bursts-before.json):10 a frio reprovou p95526,37ms; aquecido10 passou112,92ms;25 passou263,74ms;50 reprovou525,99ms. Zero erros HTTP nas quatro tentativas. Proxy observou10/10/25/50 requests em voo; um processo Next observou10/9/25/47. Não enviar100 ou5000 após FAIL50. A comparação aquecida não apaga falha de cold start.

pg_stat_statements foi ativado somente como opção de inicialização do cluster de teste e extensão nele. Não houve migration de produto.20requests sequenciais confirmaram60SELECTs no catálogo e100 na conta. Tempo de execução SQL agregado por request muito menor que latência HTTP, mas não inclui aquisição de pool/rede. Os arquivos request-sql exportam somente contagens/agregados; não publicam texto SQL ou parâmetros.

refresh-load-sessions.mjs cria novas sessões de1000identidades que pertencem ao run atual, validando ownership no banco; preserva fixture anterior em arquivo privado. Preparação é fora da medição e não prova login, expiração ou5000identidades. Leitura e autorização do produto não mudaram na Task18. Correções de produto serão comparadas no mesmo nível, sem relaxar SLO500/1500ms, integridade ou limites de abuso.
