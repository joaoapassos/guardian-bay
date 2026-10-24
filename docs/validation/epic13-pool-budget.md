# Task24 — orçamento por processo e oito réplicas locais

DATABASE_POOL_MAX opcional, server-only, inteiro textual1..10, padrão10 do driver instalado. Configuração inválida falha sem ecoar valor. db usa accessor de lib; nenhuma dependência invertida ou cache de identidade. .env.example documenta orçamento. Laboratório permite somente1/2/4/8processos em3139–3146; fixa pool5 em8 e10 nos demais. Runner verifica teto total40 e registra pool/topologia. max_connections100 e guards preservados.

[Resultados](epic13-http-eight-instances.json): primeira rajada100, após warm-up sequencial, reprovou764,13ms. Repetição de diagnóstico com pools já abertos passou267,27ms; seguintes246,73/219,97ms. Não se comprovou que somente abertura de conexão explique a primeira falha. Estado aquecido explicitamente separado, sem apagar o FAIL.

250requests passou três vezes no estado aquecido:371,19/409,46/419,52ms. Zero errosHTTP; cluster49conexões, lock waiters amostrados0, pico de memória72,46% na primeira tentativa. Não foi enviado500ou5000. Os lotes250 atingiram apenas129–136requests pendentes no proxy e7–8em um processo Next: não demonstram250efetivamente em voo ao mesmo tempo. Conclusão do lote543–684ms, distinta dos percentis de request.

Gates:121unitários,187PostgreSQL com pool5,13HTTP/browser com pool5, build/lint/TypeScript e nove testes de harness PASS; SCA produção0; revisão independente sem achados. Garantias de ownership, sessão, idempotência, estoque e auditoria mantidas. Configuração não prova ganho para todo workload e oito processos não viraram padrão.

Próxima medição precisa distinguir HTTP em conexões já estabelecidas de tempestade de novas conexões TLS. Uma rajada com250operações que o TLS espaça não mede250requests simultâneas no backend. Perfil de conexões novas permanece preservado; qualquer perfil com reuse deve identificar aquecimento separado, manter500/1500ms na janela medida, verificar status comerciais/HTTP e publicar concorrência observada.
