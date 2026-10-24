# Task20 — comparar uma e duas instâncias

Mesmo build da Task19, banco e perfil simultaneous-http-burst-v1. [Resultados](epic13-http-two-instances.json): uma instância100requests reprovou p95698,98ms. Duas instâncias passaram50 e três repetições100, p95469,69/485,68/483,06ms.250requests com duas instâncias reprovou742,25ms. Zero erros HTTP e invariantes globais preservados. Nenhuma carga acima de250 foi enviada.

Pico de requests pendentes no proxy nas repetições100:99/95/99; por processo Next45/44/44. Em250:234 no proxy e110 em um processo Next. Não somar máximos de processos registrados em instantes diferentes como concorrência simultânea global. Conexões de cluster29; lock waiters amostrados zero. RPS publicado inclui pausas do runner e não mede throughput sustentado.

Warm-up por GETs sequenciais foi explícito; amostragem SQL do catálogo em duas instâncias teve62 chamadas, incluindo duas consultas auxiliares de inicialização do driver, e não60 exatas. Não ocultar essa diferença ou atribuí-la a query extra do domínio. Perfil de sessão/conta permaneceu parametrizado e sem exposição de SQL/cookies.

A distribuição do trabalho melhorou a mesma rajada100, mas não aprovou250. Isso justifica experimento controlado de quatro processos locais, com orçamento de conexões ainda abaixo do guard80/100, e não escalada de carga ou aumento automático de pool. Padrão continua uma instância. Somente loopback e processos pertencentes ao laboratório poderão ser usados.

Referência de métricas: http_req_duration do k6 mede envio/espera/recebimento, sem tempo de estabelecimento de conexão; TLS e conexões precisam ser observados separadamente, sem somar percentis como se fossem da mesma request. [Documentação oficial](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/). PASS dessa métrica não significa que toda a rajada terminou em500ms, nem certifica cold start ou PKI.
