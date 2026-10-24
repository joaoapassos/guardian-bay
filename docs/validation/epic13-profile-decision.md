# Task 09 — perfil limitado e lacunas

Executado `profile-selects.mjs` no cluster dedicado, sem carga simultânea: transação READ ONLY, statement_timeout2s, três SELECTs parametrizados, EXPLAIN ANALYZE/BUFFERS, exportação somente de agregados e tipos de nós. [Resultados](epic13-select-profile.json). Não foram persistidos hashes de sessão, e-mails, condições dos índices ou planos brutos públicos.

Sessão: execution0,041ms, seis shared hits, Index Scan. Projeção de catálogo:0,032ms, nove linhas, Seq Scan; histórico próprio:0,040ms, quatro linhas, Bitmap Index Scan. Planning1,08–2,789ms nesta primeira amostragem. Shared reads zero. Seq Scan em nove linhas não é vulnerabilidade ou evidência de índice ausente.

Essas projeções não reproduzem todas as queries do catálogo/histórico nem a concorrência do aplicativo. Não há distribuição temporal, fila do pool ou trace por request. O perfil representativo sustentado continua pendente; a Task09 entrega amostragem diagnóstica de baixo risco, **não perfil completo em escala**.

Análise do caminho da conta: layout resolve sessão; readAccount resolve novamente; readOwnIdentity faz autenticação e consulta protegida adicionais; readTestCards adiciona leitura própria. Repetição é candidata a investigação, não custo dominante comprovado. Referências: src/app/layout.tsx, src/features/auth/server/read-account.ts, read-own-identity.ts, session.ts e src/features/orders/server/test-cards.ts. Não remover checagens frescas de autorização para reduzir contagem de queries.

Evidência existente continua apontando saturação do processo/renderização sob workload misto250VU, sem isolar uma função comercial responsável. Comparações futuras precisam manter requests/ciclo, dados, hardware, build, profiler, cache e gerador constantes. Instrumentar aquisição do pool e correlação HTTP/SQL sem registrar tokens antes de atribuir causalidade ao PostgreSQL.

