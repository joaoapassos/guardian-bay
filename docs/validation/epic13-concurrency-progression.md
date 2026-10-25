# Task30 — progressão HTTP com evidência de sobreposição

Os níveis10/25/50/100/250/500/1000/2000/3500/5000 não executam automaticamente. Acima500 é obrigatório relatório do patamar anterior com mesmo run/build/sourceTree/topologia/pool/backlog, idade menor30min, todas requests emHTTP2,zeroerros,p95500/p991500ms e pico de concorrência efetivamente observado. Apenas proxy/reuseH2 autorizado nesses níveis. Gate de medição também exige pico>=N, impedindo declarar capacidade por contar apenas requests concluídas. Testes negativos cobrem ausência/idade/build/topologia/latência/overlap insuficiente.

Usuários fictícios disponíveis1000; níveis maiores reutilizam esses principals com índice circular, pois a meta é requestsHTTP em voo, não5000identidades distintas. Esse limite deverá permanecer explícito nas conclusões.

Primeiro1000:1000HTTP200 medidos,1000HTTP2,proxy pico1000; p95 649,63ms,p99 661,61ms. Zero erros,49conexõesPG,sem lockwaiters amostrados,integridade preservada. **FAIL por latência**, portanto2000bloqueado. Não aumentarSLO ou repetirnívelsuperior para obterPASS. Próximo passo: localizar custo com observação/perfil e comparar alteração mínima. Evidênciaepic13-http2-1000.json. TesteNode eBiomePASS; sem mudanças de produto.
