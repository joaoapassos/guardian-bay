# Task38 — 500 usuários navegando

Mesmo build e perfil: um processo Next, pool de dez conexões e proxy HTTPS/H2 local. Foram60s de rampa,60s de aquecimento e900s medidos.

Participação:500 usuários completos, mínimo de 66 leituras medidas por usuário. 37482 leituras e 3133 escritas no plateau (~45.13 requisições/s).

| Métrica | Resultado |
| --- | --- |
| Leitura p95 / p99 | 6.07058 / 8.566123 ms |
| Escrita p95 / p99 | 9.1941 / 12.63902 ms |
| Erros inesperados | 0 |
| Pedidos pagos | 160 |
| Unidades / eventos de conclusão | 160 / 160 |
| Ator de auditoria incorreto | 0 |

Métodos observados: 125 cartão, 20 Pix e 15 boleto. Invariantes globais preservados.

Host compartilhado: CPU máxima amostrada 46.0058963919697%, RAM 56.0618314589069%, conexões PostgreSQL 19 e lock waiters 0. Isso não demonstra ausência absoluta de contenção.

PASS somente neste ambiente, build, dados, perfil e duração. Evidência: epic13-navigation-500-1792895487606.json. Não equivale500requisições em voo nem aprova1000usuários. Próximo patamar:1000 por20min após revisão.

Nenhum código de produto, migration, dependência, proteção ou SLO alterado.
