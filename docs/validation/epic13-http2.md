# Task29 — HTTP/2 opcional e conexões previamente estabelecidas

LAB_PROXY_PROTOCOL=h2 habilita Node HTTP/2 builtin com fallback HTTP/1; padrão continua h1. Não foi instalada dependência nem proxy externo. Host/:authority estritos, Origin preservado, forwarded removido, cabeçalhos hop-by-hop/pseudoheaders filtrados; cookies/CSP mantidos. HTTP/2 possui contagem explícita de requests iniciadas/terminadas, idempotente em finish/close. Sessões H2 owned são encerradas com o laboratório.

Experimento inicial:250PASS,500FAIL no aquecimento com44recusas, nenhuma medida. O batch inicial ainda podia iniciar múltiplas conexões. Perfil reuseH2 agora realiza1GET real e verifica protocolo antes do warmbatch, espera2s, então mede. Total2N+1requests; nenhuma falha do aquecimento é ignorada. Perfil new preservado. Gate exige todas as requests medidas negociadasHTTP2; revisão independente encontrou a falta inicial dessa verificação, corrigida antes da aceitação.

Três500bursts:500HTTP200 medidos/500H2/pico500 confirmado em cada execução; p95 352,84/314,81/347,71ms, p99 363,04/321,69/364,39ms. Zero erros,49conexõesPG, integridade preservada. SLO500/1500ms mantido. É concorrência real em streamsHTTP, não500conexõesTCP ou5000requests e não demonstra estabilidade sustentada. RPS inclui preparação/sleeps e não serve como throughput sustentado.

O certificado autoassinado expirou durante uma pausa: smoke com CA estrita recusou corretamente; certificado/chave renovados apenas no diretório ignorado, cópias anteriores preservadas. Terceira execução ocorreu após renovação. SmokeHTTP2 real validou dono200,anônimo307,autoridadeestrangeira/conflitante400,CSP. GateSCA produção0;4findings tooling previamente triados.10testesNode eBiomePASS. Gates de produto daTask28 preservados; não houve nova mudança de produto.

Fontes: [Node HTTP/2 Compatibility API](https://nodejs.org/api/http2.html#compatibility-api), [k6 HTTP/2](https://grafana.com/docs/k6/latest/using-k6/protocols/http-2/). Alteração de protocolo é variante explícita de laboratório, não aprovação de produção nem correção comprovada da admissãoHTTP1. Resultado comparativo em epic13-http2-bursts.json.
