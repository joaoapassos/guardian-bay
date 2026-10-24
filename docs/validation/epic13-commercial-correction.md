# Task 10 — decisão sobre correção comercial

Estado: **correção bloqueada por ausência de gargalo comercial isolado**. Não houve alteração de produto nesta Task. PERF-01 permanece aberto. Amostragem da Task09 não demonstra que SQL, checkout, locks ou confirmação sejam a causa dominante da reprovação250VU de leituras mistas.

Consultas repetidas da conta são uma hipótese de redução de round trips. Antes de alterar: medir chamadas/latência por operação no mesmo build/perfil, comparar variantes com mesmo volume de requests e testar revogação concorrente, idle/expiração absoluta, isolamento A/B e DTO mínimo. Não considerar redução de contagem de queries como prova suficiente de ganho no SLO. A query protegida de readOwnIdentity revalida a sessão; removê-la sem preservar o invariante mudaria a segurança.

Não foram alterados locks, transações, cálculo monetário, idempotência, estoque, auditoria, timers de pagamento, cache de identidade ou rate limiting. Redis, filas e microsserviços não são justificados pela evidência atual.

Critério para retomar: trace que localize custo material, proposta mínima revisada, comparação A/B reproduzível e invariantes PostgreSQL/browser aprovados. Sem isso não existe correção a validar, e esta decisão não é um PASS de desempenho.
