# Task28 — deduplicação de sessão por render RSC

O guia instalado de autenticação do Next recomenda React.cache para a resolução de sessão dentro da mesma renderização. session-cookie.ts aplica essa deduplicação somente no render; não existe cache global ou persistente de identidade. Actions e handlers continuam executando a resolução; ownership e validação transacional permanecem nas operações.

24 GETs reais de /account com sequência AAB, distribuídos entre oito processos, verificaram identidade própria e ausência de outra identidade ou token no HTML. Revogação, idle expiry e acesso anônimo retornaram 307 na request seguinte. Duas sessões sintéticas foram revogadas/envelhecidas e novamente provisionadas antes da carga. Evidência: epic13-account-render-isolation-1792873104629.json.

pg_stat_statements confirmou /account com 40 SELECTs em 20 GETs (2/request, antes 3); /products permaneceu 3/request. Medição sequencial não representa capacidade concorrente. Evidência: epic13-request-sql-1792873107966.json.

250 requisições medidas: proxy confirmou pico250, p95 228,74ms, p99 236,47ms, zero erros. 500 falharam no aquecimento: 190 recusas de conexão, nenhuma request medida. A redução de consultas não resolveu admissão no proxy. Não há aprovação de500 nem5000; percentis zero em execução sem medição são ausência de amostras.

Validação: lint, TypeScript,121unitários,83auth direcionados,187PostgreSQL completos,13HTTP/browser, build e revisão independente sem achados. Preservados SLOs, autorizações, origem, cookies e integridade. Relatórios anteriores permanecem para comparação.
