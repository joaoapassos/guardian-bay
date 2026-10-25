# Task33 — teto de conexões do proxy para backends

Hipótese derivada de amostrasconnect no proxy: Agent explícito keepalive,maxSockets16/maxFreeSockets16 porbackend reduz aberturas simultâneas. LAB_UPSTREAM_CONNECTIONS=16 éopt-in; defaultunbounded preservado. Semmudanças de timeout,SLO,ownershipoucache. Resposta downstream encerrada cancela upstream pendente. Agent e sessõesowned encerrados no shutdown. Manifest/métricas/gate de progressão incluem teto para impedir mistura de topologias.

500:pico500,p95372,63ms,PASS.1000:pico970,p95594,73ms,p99610,12ms,zeroerros,49conexõesPG,integridadepreservada,FAIL. Não há solução comprovada; não adotar como padrão nem avançar2000. Pico individualNext16confirma teto de encaminhamento, mas proxycontinua pendente enquantoespera. Essa fila conta como HTTP em voo, sem endpointdelay ou simulação artificial.

ChecksNode4/Biome/integridadePASS. Próxima investigação: alternância determinística de rotas e roundrobinpar podem concentrar catálogo/conta em subconjuntos de processos. Instrumentar rota agregada porprocesso e comparar distribuição preservando50/50,rotas,identidades,SLOecontagemreal.
