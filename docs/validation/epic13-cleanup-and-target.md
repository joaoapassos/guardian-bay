# Task34 — nova meta e limpeza de experimentos encerrados

A meta atual, definida pelo usuário, é1000usuários virtuais navegando com pausas e fazendo requisições. Não equivale1000HTTPemvoo e substitui a investigação até5000. O laboratório local e SLOs anteriores permanecem; nenhuma garantia absoluta de produção pode ser inferida. O próximo trabalho é implementar/validar workload sustentado representativo, com dados fictícios e relatório limitado a build/recursos/duração testados.

Removidos sete scripts de uso pontual cujo diagnóstico já foi registrado: cpu-profile-summary.mjs, diagnostic-results.mjs, http-cpu-summary.mjs, isolate-sql-cycle.mjs, node-http-control.mjs, profile-selects.mjs e tcp-admission.mjs (todos emscripts/validation). Removido bloco de profilerCPU do observador; métricas contínuas,eventloop e contagemHTTP permanecem. Os scripts removidos não tinham consumidores emoutros scripts,CI oupackage.json. Resultados sanitizados e commits anteriores são a referência histórica; não executar comandos antigos que mencionem esses scripts sem consultar aquela revisão Git.

Gates de estágios e burst agora rejeitam patamares acima1000. Mantidos testes de segurança,isolamentoRSC,sessões,integridade,contratos,runnerk6,supervisão,escopo,HTTP2 eprovisionamento. Não removidos código de produto,dados do usuário,resultados anteriores ou arquivos de segurança. Experimentos opcionais existentes não são adotados como configuração padrão.

Validação:13testesNode dos gates/contadores/proxy/contratosPASS;BiomePASS. PróximaTask:workload de navegação1000VUs com thinktime,jornadas comerciais proporcionais e progressão controlada,sem meta5000.
