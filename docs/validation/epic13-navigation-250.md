# Task37 — 250 usuários navegando

Mesmo build, perfil e topologia da baseline: um processo Next, pool10 e proxy HTTPS/H2 local. Janela:60s de rampa,60s de aquecimento e600s de medição.

Participação:250 usuários completos, mínimo de 44 leituras por usuário. 12521 leituras e 1045 escritas medidas; throughput do plateau de 22.61 requisições/s.

Leitura p95/p99: 6.239 / 9.49233999999994 ms. Escrita p95/p99: 9.10138 / 12.545332 ms. Zero erros inesperados.

Banco: 60 pedidos pagos, 60 unidades consumidas e 60 eventos de conclusão, sem ator incorreto. Métodos: 49 cartão, 8 Pix e 3 boleto. Invariantes globais preservados.

Recursos amostrados do host compartilhado: CPU máxima 42.272802243114%, RAM 52.4286659374674%, conexões PostgreSQL 16, lock waiters 0. Picos amostrados não representam ausência absoluta de contenção.

Resultado PASS somente neste ambiente e perfil. Evidência: epic13-navigation-250-1792894398757.json. Não aprova1000 nem equivale250requisições HTTP em voo. Próximo patamar:500, após revisão.

Nenhuma alteração de produto, dependência, migration, segurança ou SLO.
