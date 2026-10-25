# Task39 — 1.000 usuários navegando: PASS

Meta demonstrada neste laboratório: um processo Next em produção, pool de dez conexões, proxy HTTPS/H2 e PostgreSQL dedicado no mesmo host do gerador. Perfil:70% navegação,20% carrinho,8% checkout e2% histórico; pausas de8–16s. Sessões fictícias distintas previamente provisionadas.

Foram60s de rampa,60s de aquecimento e1.200s medidos. Os1.000usuários completaram participação, com pelo menos 92 leituras medidas por usuário.

| Métrica do plateau | Resultado |
| --- | --- |
| Leituras / escritas | 99972 / 8565 |
| Requisições por segundo | 90,45 |
| Leitura p95 / p99 | 25,77 / 48,72 ms |
| Escrita p95 / p99 | 38,18 / 76,61 ms |
| Erros inesperados | 0 |

Na execução completa, incluindo preparação e drenagem: 480 pedidos pagos (362 cartão, 63 Pix, 55 boleto), 480 unidades consumidas e 480 eventos de conclusão com ator correto. Invariantes PostgreSQL preservados.

Host compartilhado: CPU máxima amostrada 65,95%, RAM 60,66%, conexões PostgreSQL 19 e lock waiters amostrados 0. PicoHTTPpendente no proxy: 26. Portanto,1.000VUs não equivalem1.000HTTPemvoo.

Recuperação pós-carga: dez leituras HTTPS consecutivas com status200 e conteúdo esperado, abaixo de14,49ms (referência comparável de12,08ms mais20%). Maior leitura das dez:12,81ms. Verificação concluída29,17s após o relatório da carga. Invariantes globais e novo smokeHTTP2/CA/anonimato/autoridade/CSP também passaram. Isso não é teste de recuperação de pane ou DDoS.

Evidência principal: epic13-navigation-1000-1792896960658.json. Evidências auxiliares: epic13-navigation-recovery-baseline-*.json, epic13-navigation-recovery-*.json e dois novos epic13-http2-smoke-*.json.

A conclusão vale para este build, recursos, dados, perfil e duração. Não mede1.000logins simultâneos, navegadores completos, assets, grandes carrinhos ou qualquer servidor de produção. Código de produto, dependências, migrations, rate limiting e SLOs preservados.
