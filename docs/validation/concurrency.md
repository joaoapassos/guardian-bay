# Task 10 — concorrência e falhas

`node scripts/validation/concurrency.mjs` dispara requests HTTP independentes; Promise.all no dispatcher Client de Actions não é prova de concorrência. Fixtures A/B, cartão próprio, produtos normal/última unidade e pedidos novos. Preparação só altera carrinhos/estoque das fixtures do run; invariantes são consultadas após cada grupo. Não executar paralelamente a outros testes/carga.

Casos: dois donos pela última unidade (um PAID, outro OUT_OF_STOCK); mesma checkoutKey (um pedido/decremento/evento); chaves distintas sobre mesmo carrinho (uma pendência, outro EMPTY_CART); duas confirmações (um efeito); pagamento aguardando escritor de estoque (releitura após lock, falha se estoque zerado). O escritor do último caso é transação DB controlada de fixture, não uma Action administrativa; não alegar que esse caso isolado prova autorização administrativa.

Regressão complementar: `npm run test:integration` no cluster dedicado inclui testes existentes de mudança administrativa de estoque, múltiplos produtos em ordem invertida, expiração absoluta/idle enquanto aguardam locks, sessão/pagamento expirando durante auditoria e falha real do append. Preservar resultados separados dos requests públicos; testes internos têm fixtures e mocks de sessão e não substituem pentest de transporte.

Manual: criar dois perfis/sessões, capturar as requests válidas no Burp e enviar de conexões independentes, sincronizando a liberação. Consultar orders, order_items, order_payments, inventory e audit_events; cardinalidade e somatório devem corresponder ao efeito único. Falha/timeout não autoriza repetir com outra chave inadvertidamente. Toda falha de integridade interrompe a campanha antes da carga.

Observado: cinco casos HTTP PASS; um único consumidor da última unidade, um pedido/evento para mesma intenção, uma conversão de carrinho com chaves diferentes, um decremento na confirmação duplicada e recusa após estoque zerado sob lock. Suíte PostgreSQL complementar: 185 testes PASS, sem skips. Sem estoque negativo ou inconsistência de snapshot/estado na auditoria global do laboratório.
