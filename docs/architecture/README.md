# Arquitetura e fronteiras do sistema

Sistema: E-commerce seguro · Fundação, segurança base, identidade/acesso, catálogo, carrinho, checkout, pedidos e estoque.

Este documento registra as decisões aprovadas. As seções de revisão de Epics anteriores registram evidências e escopo histórico àquela conclusão; o estado atual inclui a Epic 7. O [AGENTS.md](../../AGENTS.md) estabelece invariantes; as [skills](../../.agents/skills/) descrevem procedimentos para aplicá-las.

O [threat model](threat-model.md) identifica atores, ativos, entradas externas, trust boundaries e ameaças dos fluxos existentes.

## Modelo do pedido e checkout (ECMSG-66)

Pedido pertence ao usuário da sessão, nunca a userId externo. Checkout consome somente uma chave UUID de intenção, gerada no servidor para a confirmação e validada como identificador sem autoridade. UNIQUE(userId, checkoutKey) garante no máximo um pedido por intenção, incluindo double submit/retry; chave igual de outro usuário é independente. Nova intenção usa nova chave.

Snapshot imutável contém productId de referência histórica (UUID sem FK para produto), nome, quantity 1–99, unitAmount em centavos BRL, subtotal e total. Alterar/remover catálogo no futuro não altera nem apaga histórico. FK do dono é RESTRICT; exclusão de identidade demanda política explícita de retenção. Item tem FK RESTRICT de pedido e chave (orderId, productId). Valores derivados usam PostgreSQL bigint em modo number, CHECK com máximo 21.260.088.105.300 centavos, seguro em JavaScript/Dinero; preço unitário segue integer. Nenhum valor monetário vem do Client.

Checkout rejeita vazio, qualquer item despublicado ou quantidade sem estoque suficiente, sem compra parcial ou remoção silenciosa. Preview é UX: confirmação relê tudo na mesma transação. Carrinho alterado entre preview e confirmação usa o conjunto atual consistente: vazio/indisponível retorna resultado controlado; conjunto ainda elegível produz snapshot atual apresentado no detalhe. Não há promessa de congelar o preview. Ordem de locks: identidade → sessão → itens próprios → produtos em UUID crescente → inventory em productId crescente; SHARE de produto preserva preço/nome/publicação até commit. Lock da identidade serializa com todas as mutations do carrinho; adição que chega depois permanece após a conversão. Sessão é revalidada com clock_timestamp após espera e antes do commit, com rollback por expiração.

Pagamento acadêmico é síncrono, sem gateway/dados financeiros. PENDING_PAYMENT é estado transacional intermediário, não workflow público; somente PENDING_PAYMENT → PAID ou PAYMENT_FAILED. Simulação determinística aprova total menor que 1.000.000 centavos e recusa a partir desse valor, sem input paymentStatus. Não é análise financeira. Snapshot de pedido recusado permanece histórico; carrinho permanece para correção/nova intenção. Pedido pago, consumo de estoque e remoção somente dos itens convertidos são atômicos. Retry resolve pedido existente antes de tocar carrinho/estoque; nunca remove itens novos nem repete decremento. Erro inesperado faz rollback, log allowlist e exception sanitizada.

`features/orders` possui snapshot/checkout/histórico; reutiliza auth server-only, lib/money e schemas físicos, sem acessar internals de cart/catalog. `app` compõe rotas. Histórico privado usa 20 pedidos por página, página 1–1.000 e ordem mais recente/data + UUID, sem cache compartilhado; detalhes consultam id + dono na query, sem reconstruir snapshot pelo catálogo. Frete, descontos, reserva de estoque, gateway, pagamento real e guest checkout permanecem fora do escopo.

## Revisão da Epic 6 (ECMSG-78)

Base `epic-5-carrinho` em b2187e6 inclui a correção documental final. Treze Tasks sequenciais ECMSG-66–78, um commit por Task, sem reescrever base/squash. `orders` e `order_items` acrescentam snapshot privado; UNIQUE(userId, checkoutKey), FK RESTRICT do usuário/pedido e CHECKs de estado/BRL/quantidade/subtotal/limites. A FK para produto é deliberadamente ausente no snapshot histórico. Constraints não somam linhas: total coerente e pedido não vazio são garantidos pela única operação comercial transacional, sem API de edição monetária. Privilégio operacional de DB exige controle externo.

Checkout aceita somente checkoutKey e nenhum argumento extra. A chave é UUID gerado no render Server e mantido na confirmação Client para retry/double submit, não autorização. Recarregar/iniciar outra confirmação gera outra intenção; não promete exactly-once entre chaves diferentes. Mesmo usuário/key retorna o pedido original antes de tocar carrinho, incluindo recusa; outro usuário é independente. PENDING_PAYMENT não é estado observável do checkout normal: criação, snapshot, simulação e limpeza dos itens pagos são uma transaction. Não há Action de pagamento separada, HTTP interno, Zustand autoritativo, gateway ou dados financeiros.

Identidade serializa todas as mutations do carrinho e checkout; locks de sessão/itens e SHARE de produtos em ordem estável preservam uma composição consistente. Quem obtém primeiro o lock do produto define o estado aceito: edição já bloqueando checkout é relida; edição posterior espera o snapshot terminar. Carrinho adicionado depois da conversão permanece. Expiração absoluta/idle após espera causa rollback; revogação anterior à autorização impede pedido. Não desfaz commit já autorizado antes de revogação posterior. Snapshot não muda com nome/preço/publicação ou remoção operacional do produto. Pagamento recusado persiste pedido histórico e preserva carrinho; nova tentativa comercial usa nova chave.

Gates: check, integração, security e verify. Evidências: 104 unitários, 126 PostgreSQL e 9 HTTP/Chromium, sem skips; login → catálogo → carrinho → checkout → detalhe/histórico, preço alterado entre preview/confirm, snapshot congelado, recusa com carrinho preservado e XSS como texto. Quatro mutantes temporários (ownership, total, retry e relógio de sessão) falharam por assertions e foram restaurados. Teste HTTP de Host usa node:http: fetch da versão local normaliza Host e não prova spoofing desse header. Nenhuma proteção do produto foi relaxada.

Onze migrations, zero → HEAD e upgrade desde as dez da Epic 5, snapshots/journal/constraints/índices revisados e geração sem drift. Banco exclusivamente local de teste PostgreSQL 18. Preserva-se a limitação herdada: no PostgreSQL 17 FK RESTRICT funciona com 23503, enquanto assertion antiga do catálogo espera 23001 do 18. Não alteramos essa assertion. Nenhuma dependência nova; audit de produção sem findings e quatro moderados herdados no tooling Drizzle/esbuild, sem consumidor serve no caminho atual e sem patch indicado pelo audit. Scanner complementar: 27 alertas de secret são fixtures/exemplos; 345 alertas SQL correspondem a tags parametrizadas e um aviso allowedOrigins é incompatível com a política same-origin. Triagem contextual não confirmou finding bloqueante.

Permanecem CSP parcial, bearer roubado, e-mail não verificado, deployment/HTTPS/proteção volumétrica, logs não duráveis e limpeza de sessões. Browser usa o wrapper local herdado do contêiner, somente em perfil de teste; não comprova isolamento operacional nem autoriza exposição pública. Não há estoque, reserva, frete, desconto, gateway/pagamento real ou guest checkout. Os gates locais não substituem controles de deployment.

## Modelo do carrinho (ECMSG-54)

Carrinho é o conjunto de `cart_items` de um usuário autenticado: uma única tabela ligada a `users` basta, sem registro `carts`, estados ou criação durante leitura. Conjunto vazio é carrinho vazio. Chave composta `(userId, productId)` garante um produto por dono; IDs de usuário/produto já são gerados server-side. Ownership deriva exclusivamente do cookie/sessão e toda query restringe o usuário resolvido no servidor. Nenhuma entrada aceita userId/cartId/ownerId ou autoridade monetária.

Item guarda somente usuário, produto e quantidade inteira entre 1 e 99. Adicionar novamente incrementa atomicamente; atualizar define quantidade absoluta e zero é inválido; remover é explícito e idempotente. Máximo de 100 produtos distintos por usuário, serializado pelo lock da identidade: limita leitura/custo e dinheiro, não representa estoque. FK de usuário e produto é RESTRICT: não apagar carrinho silenciosamente ao remover identidade/produto operacionalmente; uma operação futura de exclusão precisará definir limpeza explícita. Catálogo não oferece hard delete.

Produto deve existir e estar publicado para add/update. Se despublicado depois da adição, item permanece visível como indisponível; qualquer alteração de quantidade é negada, mas remoção continua permitida. Inexistente e privado têm rejeição equivalente na mutation. Leitura relê nome, imagem, preço inteiro/BRL e publicação atuais, sem revisão administrativa, sessão ou userId no DTO. Item indisponível mostra preço atual como referência, mas subtotal comercial é nulo e não participa do total elegível. Estoque insuficiente é distinto de publicação: availableQuantity e stockSufficient são relidos; item permanece e não participa do total informacional. Add valida quantidade resultante e update quantidade absoluta, sem reserva.

Carrinho não congela preço: nunca persiste unitPrice/subtotal/total/desconto. Cálculos reutilizam Dinero em `lib/money`, exclusivamente no servidor. Limite monetário: 2.147.483.647 × 99 × 100 = 21.260.088.105.300 centavos, abaixo de Number.MAX_SAFE_INTEGER; subtotal/total não ficam limitados a PostgreSQL integer. Snapshot comercial pertence a orders/checkout, implementados na Epic 6. Não há reserva, frete, desconto, guest cart, localStorage autoritativo ou merge de visitante.

Concorrência: mutations transacionais serializam por identidade → sessão → item → produto → inventory, seguindo auth; add usa incremento UPSERT sem read-modify-write desprotegido. Produto precisa ser revalidado sob lock proporcional à linha, incluindo despublicação durante espera. Sessão é conferida pelo relógio atual após esperas relevantes e antes de concluir o efeito; revogação serializada precede ou sucede a mutation, nunca autoriza estado já revogado. Update concorrente usa last writer sob serialização; update após remove é conflito/no-op controlado, sem recriar item; remove repetido é sucesso. Replay de add incrementa de novo até limite (não é idempotente), update define o mesmo valor e remove é idempotente. Checkout serializa com essas mutations conforme o modelo do pedido; estoque é relido sem reserva.

Dependência explícita permitida: cart/server reutiliza autoridade server-only de auth e schemas físicos de products/inventory; UI de app compõe botão de cart junto ao catálogo, sem import arbitrário entre internals de features. Leitura usa DTO de imagem público já aprovado, não modelo Drizzle como contrato.

### Catálogo durante o carrinho (ECMSG-62)

Read relê produto por join no mesmo snapshot da sessão/itens: mudança de preço/nome/imagem/categoria aparece na próxima leitura, sem preço antigo persistido. Item despublicado continua visível, com subtotal nulo e total elegível excluído. Mutation add/update usa lock SHARE da linha de produto antes de decidir publicação; se esperou uma edição/despublicação, o PostgreSQL READ COMMITTED entrega o estado atualizado. O lock permanece até terminar a transaction, serializando alterações posteriores. Remoção não depende de publicação/categoria nem precisa bloquear o produto. Não se bloqueia catálogo inteiro. Testes usam transactions independentes e verificam espera real em pg_stat_activity, sem inferir race somente por timer.

### Cobertura do carrinho (ECMSG-64)

| Garantia | Teste real |
| --- | --- |
| PK composta, default, FK/RESTRICT e quantidade no DB | `cart.integration.test.ts`; exclusão RESTRICT usa 23001 no PostgreSQL 18 e 23503 no 17 |
| Contrato estrito, UUID/quantidade, NaN/Infinity e mass assignment | `cart-item.test.ts`, PostgreSQL e HTTP das três Actions |
| Ownership A/B, vazio/visitante, publicação e catálogo atual | Integração Drizzle/PostgreSQL com sessões reais; fixtures resetadas antes de cada caso |
| Add/add, limite de 99 e 100 produtos, update/update, update/remove, remove/remove | Transactions independentes, UPSERT/locks reais e assertions de estado persistido |
| Catálogo concorrente, revogação e expiração absoluta/idle durante espera | Espera observada em pg_stat_activity, relógio PostgreSQL e rollback de add/update/remove |
| Centavos, subtotais, total máximo, indisponibilidade e preço forjado | `cart-money.test.ts` e integração com preço alterado no catálogo |
| Origin/Host, body >16 KiB, replay, autoridade extra e erro sanitizado | Harness Next HTTP das Actions reais, sem endpoint de diagnóstico no produto |
| Login → lista/detalhe → add → cart → update/remove; preço/despublicação e XSS | Chromium/HTTPS contra build da aplicação; nomes escapados, quantidade e total relidos do servidor |
| Allowlist de logs e sink indisponível | `cart-event.test.ts` e exceção operacional injetada somente na boundary do DB |

Negative testing temporário: retirar ownership da leitura ou UPDATE, filtro de publicação, limite do schema, contrato strict ou revalidação após lock faz as assertions falharem. Código original é restaurado antes do gate/commit; não há mutantes no produto. Testes não mockam Drizzle para provar queries/concorrência. Cart não renova idle durante render/mutation; novo login é necessário ao expirar. Mocks de cookies/headers na integração não substituem o harness de transporte real.

## Revisão da Epic 5 (ECMSG-65)

Base: `epic-4-catalogo` em `1b9aac0` (ECMSG-53). Epic 5 usa doze commits sequenciais ECMSG-54–65, sem squash ou alteração da branch base. `cart_items` guarda apenas userId/productId/quantity, com PK composta, FK RESTRICT e CHECK 1–99. Índice da PK atende leituras por dono e unicidade; nenhum índice de catálogo inteiro ou tabela carts sem consumidor. Até 100 produtos distintos é regra transacional sob lock da identidade, não constraint de cardinalidade SQL.

`/cart` lê via feature server-only, sem userId/cartId público, cache compartilhado ou mutation durante render. Client fica nos controles e envia apenas intenção; não há Zustand/localStorage autoritativo, fetch HTTP interno, REST, guest cart, camada repository/service genérica ou dependência nova. Cart reutiliza auth e schemas físicos do catálogo por dependências server explícitas; app compõe UI das duas features. Preço vem do catálogo atual, quantidade do contrato estrito e subtotal/total do Dinero no servidor. Valores derivados podem exceder PostgreSQL integer, mas o máximo de 21.260.088.105.300 centavos permanece seguro em JavaScript. Item indisponível persiste, pode ser removido e não participa do total. Snapshot comercial continua exclusivo do futuro pedido/checkout; carrinho não promete estoque/reserva.

Revisão contextual confirmou autenticação atual, ownership nas queries, Origin/Host/body limitado, rejeição de mass assignment/preço/moeda/roles, SQL parametrizado, nomes escapados e logs allowlist. Locks identidade → sessão → produto/item serializam mutations com mudança de credencial/revogação e preservam publicação durante add/update. Expiração absoluta/idle durante espera causa rollback e resultado UNAUTHENTICATED; o sentinel privado é somente mecanismo de rollback transacional, não fluxo normal de validação. Erro inesperado é registrado sem cause/input e relançado com mensagem controlada, mantendo Next error handling; Client não exibe Error/message/stack internos. Revogação posterior ao ponto de autorização/commit não desfaz efeito já autorizado. Replay de add incrementa até o limite; update absoluto e remove explícito têm comportamento documentado, sem promessa de exactly-once.

Gates finais: `check`, `test:integration`, `test:security` e `verify`; 98 unitários, 109 PostgreSQL e 8 HTTP/Chromium sem skips. Seis mutantes temporários foram detectados por assertions reais (ownership da leitura/UPDATE, publicação, contrato strict, quantidade e sessão após lock), e restaurados. `git diff --check`, staged, diff acumulado contra Epic 4 e origin/main passam. Apenas `.env.example` é rastreado entre `.env*`; não há valores reais de sessão/conexão no patch.

Dez migrations aplicadas pelo migrator Drizzle em instalação vazia e upgrade desde as nove da Epic 4, preservando usuário/sessão. Colunas/defaults, constraints, índices e journal são equivalentes; snapshots encadeiam corretamente. `db:generate` não detecta drift e `drizzle-kit check` passa. Toda validação de persistência usa PostgreSQL local isolado de teste. A suíte herdada do catálogo espera SQLSTATE RESTRICT 23001, introduzido no PostgreSQL 18; no 17 ela falha embora o FK restrinja a exclusão (23503). Gates completos foram validados com PostgreSQL 18, sem alterar testes/regras da Epic 4. Compatibilidade dessa assertion com versões anteriores é pendência de tooling/testes, não falha da regra comercial.

`npm audit --omit=dev`: zero findings. Audit completo: quatro moderados na cadeia Drizzle Kit → esm-loader → core-utils → esbuild 0.18.20, pelo GHSA-67mh-4wv8-2f99 do servidor HTTP `serve`. Inspeção do loader confirma transform/transformSync; nenhum comando deste projeto usa `serve` do esbuild. Finding não bloqueante no caminho atual; atualização compatível do tooling permanece pendente, sem audit fix ou upgrade automático. Nenhuma dependência foi adicionada nesta Epic.

`nextjs-security-scan` aplicado a cópia dos arquivos rastreados: 27 alertas de secret são fixtures sintéticas, atributo password, URL fictícia do validador ou exemplo proibido da própria skill; nenhum secret real confirmado. Dos 227 alertas de padrões, 226 referem-se a templates SQL parametrizados Postgres.js/Drizzle e um recomenda allowedOrigins genericamente, contrário à política same-origin. Triagem manual inspecionou tags, inputs, guards, DTOs e sinks; nenhum finding bloqueante confirmado. Scanners não comprovam segurança sozinhos.

Limites herdados: CSP parcial, token bearer roubado, e-mail não verificado, proteção volumétrica/HTTPS/deployment, coleta/retenção de logs e limpeza de sessões. Cart acrescenta queries/quantidades limitadas, mas não proteção de taxa de tráfego global; não instala Redis/WAF/rate limiter sem deployment/custo concreto. O contêiner desta validação exigiu wrapper local para iniciar Chromium sem o sandbox de processos disponível; somente perfil descartável de teste, sem arquivo/política de produção alterado. Isso prova fluxo/browser/CSP, não isolamento operacional do browser ou aprovação para exposição pública. Veja o threat model para classificação dos riscos residuais.

## Modelo do catálogo (ECMSG-42)

Catálogo define o que é vendido e apresentado; não gerencia inventory, carrinho, pedidos, estoque ou total de compra. Produto tem UUID gerado pelo servidor/banco, nome plain text de 1–120 caracteres após trim, descrição plain text de até 2.000 caracteres, categoria obrigatória, preço inteiro em centavos e moeda explícita BRL. URLs usam UUID, sem slug ou compatibilidade de renomeação de slug. Nomes de produto não precisam ser únicos.

Uma categoria plana tem UUID e nome de 1–80 caracteres após trim, único sem distinção de maiúsculas segundo `lower` do PostgreSQL. Uma categoria pode conter vários produtos; cada produto pertence a exatamente uma categoria. Não há hierarquia ou estado de categoria: publicabilidade pertence ao produto.

`isPublished` booleano, inicialmente false, basta: false cobre rascunho e produto retirado do público, sem workflow adicional. Toda consulta pública deve restringir `isPublished = true` no SQL; inexistente e não publicado têm resposta pública equivalente. Não há delete físico na UI; FK de categoria é restritiva, sem cascade destrutivo sobre produtos.

Preço é inteiro positivo entre 1 e 2.147.483.647 centavos, BRL, representável em PostgreSQL integer e com segurança em JavaScript. Zero/gratuidade não é requisito. `lib/money/price.ts` valida o contrato estrito e usa Dinero.js 2.0.2 com BRL/escala 2. O DTO contém amount, currency e formatted; a apresentação usa a representação decimal exata do Dinero e Intl, sem cálculo monetário decimal ou arredondamento de entradas fracionárias. Nunca persistir float ou tratar preço reenviado pelo cliente como autoridade. Futuras compras deverão reler o valor no servidor.

Produto/categoria possuem revisão inteira positiva para detectar edição concorrente, sem timestamps sem consumidor. Ilustrações seguem a política ECMSG-50; não há upload ou origem externa. Escritas administrativas exigem capacidade persistida e sessão atual, nunca role ou ownership vindos do cliente. Schemas, constraints e migrations implementam esse modelo.

### Administração (ECMSG-48)

`users.role` tem somente customer/admin, CHECK no PostgreSQL e default customer. Cadastro não aceita role; a identidade/sessão pública não transporta capacidade administrativa. `auth/server/require-admin.ts` consulta sessão válida e role atual no banco, retornando apenas id autorizado. O catálogo reutiliza essa autoridade de autenticação, uma dependência server explícita necessária, sem engine de permissões.

O primeiro admin é um usuário cadastrado provisionado por operador com acesso controlado ao PostgreSQL: `BEGIN; SELECT id FROM users WHERE id = '<UUID conferido>' FOR UPDATE; UPDATE users SET role = 'admin' WHERE id = '<mesmo UUID>'; DELETE FROM sessions WHERE user_id = '<mesmo UUID>'; COMMIT;`. O operador deve conferir a identidade antes da alteração e exigir novo login. Remoção de privilégio segue a mesma transação com customer e revogação de sessões; não há endpoint de mudança de role. A consulta da role atual evita autoridade obsoleta em cookies.

`/admin/catalog` cria/edita categorias e produtos, publica/retira produtos sem delete físico. A Action aplica mesma origem, contrato estrito e rejeita argumentos extras; a operação server-only projeta campos explicitamente e verifica admin dentro da transação. Locks seguem identidade → sessão, compartilhando a ordem da troca de senha; role/revogação ficam serializadas com o efeito, e expiração é revalidada com relógio atual antes do commit. Revisão na condição do UPDATE impede lost update; conflito exige recarregar antes de editar. A confirmação de despublicação usa o diálogo nativo do browser, sem biblioteca adicional. Leituras públicas continuam por request; a Action invalida também as rotas afetadas. Falha operacional registra somente timestamp/event/operation/result/correlationId, sem payload/SQL/erro original. A UI atual apresenta até 100 categorias e 50 produtos por página, suficiente para o catálogo acadêmico atual; expansão da navegação de categorias exige consumidor concreto.

### Ilustrações do catálogo (ECMSG-50)

Produtos usam a chave opcional lock/shield, validada por allowlist no contrato e CHECK no PostgreSQL. A apresentação usa somente LockKeyhole/ShieldCheck do Lucide React, com ImageOff como fallback e nome acessível escapado pelo React. Não há arquivos SVG próprios, paths/URLs aceitos, fetch de imagem, upload ou origem externa; a CSP permanece inalterada. São ilustrações, sem fotografias de produto neste escopo.

Na revisão ECMSG-51, nomes/descrições/categorias/alt permanecem plain text escapado; sort usa somente colunas conhecidas e busca parametrizada trata `%`, `_` e barra como literais. Input inválido não chega ao banco, preço fracionário/forjado e campos extras são rejeitados. Queries públicas não usam cache persistente nem retornam revisão/publicabilidade. Testes PostgreSQL comprovam rollback se a sessão expirar esperando uma linha e rejeição se for revogada antes da autorização bloqueada, além do conflito de revisão. Administração concede capacidade sobre todo o catálogo; trocar UUID não concede essa capacidade a customer/visitante. Proteção volumétrica de entrada e CSP completa continuam dependências/pendências anteriores, sem novos mecanismos simulados.

O catálogo público em `/products` lê pelo server da feature, com publicação restrita no SQL e DTO de id/nome/categoria/preço/ilustração. Paginação usa 20 itens por padrão, máximo 50 e página máxima 1.000, ordenação por nome/preço com UUID como desempate estável e uma linha extra para detectar próxima página. `connection()` exclui a leitura de prerender/cache estático; queries Drizzle não usam cache persistente. Estados vazio, input inválido, loading e falha operacional têm apresentação controlada.

## Revisão da Epic 4 (ECMSG-53)

A matriz reutiliza os runners existentes: unitários validam contratos, centavos/precisão, limites e allowlist de imagens; PostgreSQL real valida constraints/FK/unicidade, publicação, busca/sort/paginação, autorização atual, mass assignment e concorrência. Next HTTP real testa Origin/forwarded/body limit na Action administrativa, visitante/customer/admin, role alterada e retirada imediata do público. Chromium/TLS isolado cria categoria/produto, edita preço, cancela/confirma despublicação e verifica escaping, Lucide e hydration. Não há rotas ou fixtures de teste versionadas no produto.

`check`, `test:integration`, `test:security` e `verify` passaram: 90 unitários, 92 testes PostgreSQL e sete testes HTTP/Chromium, sem skips. Nove migrations aplicam do zero e em upgrade desde Epic 3 preservando identidade; colunas/constraints/índices coincidem, snapshots/journal são consistentes e Drizzle não detecta drift. Checks de diff incluem o patch acumulado contra Epic 3 e origin/main.

Dinero.js 2.0.2 e Lucide React 1.52.0 são dependências com consumidores reais. Audit de produção: zero vulnerabilidades. Audit completo: quatro moderados na cadeia Drizzle Kit/esm-loader/core-utils/esbuild 0.18.20, referentes ao servidor `serve` do esbuild; o loader instalado utiliza transform/transformSync, sem consumidor `serve` nos scripts atuais. Não bloqueia este escopo; atualização de tooling permanece pendente. `npm ls esbuild` aponta peer opcional do Vite fora do intervalo, enquanto lockfile/dry-run e gates passam; também pendência de tooling, sem atualização automática.

A revisão security-review e o nextjs-security-scan examinaram conteúdo rastreado, sem `.env` real ou configurações privadas. Os 26 alertas de secret são fixtures sintéticas/atributo password/URL fictícia; 138 alertas de injection correspondem a tags parametrizadas Postgres.js/Drizzle, e o aviso allowedOrigins não justifica ampliar same-origin. Nenhum finding bloqueante foi confirmado na revisão contextual. CSP parcial, e-mail não verificado, proteção volumétrica/HTTPS/deployment, coleta/retenção de logs e limpeza de sessões permanecem limites reais anteriores. A sessão administrativa também expira por atividade persistida: render e mutations do catálogo não renovam a janela, exigindo novo login ao atingir idle timeout. Não se promete proteção completa de entrada, auditoria durável, fotos de produto ou operações de compra.

## Revisão da Epic 3 (ECMSG-41)

Ao encerrar a Epic 3, as rotas `/`, `/login`, `/register` e `/account` usam composição Server; somente formulários e botão de logout são Client. RHF/Zod cuidam de UX e contratos, sem importar DB/credenciais/sessão privilegiada. As cinco Actions validam entradas/origem e delegam às operações server-only. Conta expõe somente e-mail próprio; hashes intermediários do login e tokens não integram DTOs públicos. Não há Zustand, roles/admin, recuperação self-service ou operações comerciais.

Cadastro não autentica nem sobrescreve credencial existente. Login rotaciona, e mudança de senha exige senha atual, atualiza hash e revoga todas as sessões atomicamente. Locks da identidade e conferência do hash verificado impedem criação de sessão com credencial obsoleta após troca concorrente. Ownership, expiração e revogação são verificados na operação; redirect/navegação não concedem autoridade. A correção de reset dos campos foi comprovada pelo browser ao repetir o formulário após senha atual incorreta.

As seis migrations aplicam do zero pelo CLI Drizzle. Upgrade desde as quatro migrations da Epic 2 preserva usuário, sessão e budget de fixture; catálogo de colunas/constraints/índices coincide com instalação nova. `reg:`/`pwd:` são aceitos e prefixo inválido é rejeitado; journal/snapshots encadeiam corretamente. `db:generate` não encontra mudanças e `drizzle-kit check` passa.

Evidências finais: 70 unitários, 80 testes PostgreSQL e seis testes HTTP/Chromium sem skips; `check`, `verify`, build real e checks de diff passam. A [matriz ECMSG-40](#testes-de-identidade-e-acesso-ecmsg-40) identifica o nível de cada garantia. HTTPS do harness é isolado de teste, não deployment aprovado.

`npm audit --omit=dev` não encontra vulnerabilidades, inclusive no RHF 7.89.0 adicionado. O audit completo mantém quatro moderados na cadeia Drizzle Kit → esm-loader → core-utils → esbuild 0.18.20, conforme [triagem registrada](#findings-e-pendências): o loader usa transform/transformSync, não `serve` afetado pelo advisory. O peer opcional esbuild/Vite continua fora do intervalo; gates passam e `npm ci --dry-run --ignore-scripts` aceita o lock. Ambos são pendências de tooling, sem atualização automática ou impacto comprovado nos caminhos atuais.

`nextjs-security-scan` foi executado sobre cópia de conteúdo rastreado da aplicação/testes, sem configurações privadas ou artefatos ignorados. Os 26 alertas de secret são fixtures sintéticas, URL fictícia e atributo `type="password"`; nenhum secret real foi identificado. Os 76 alertas SQL são tags parametrizadas Postgres.js/Drizzle (incluindo EXISTS/locks); um aviso de `allowedOrigins` é incompatível com a decisão same-origin e não justifica ampliar acesso. Triagem manual revisou imports, queries, respostas e logger; scanners não comprovam autorização.

Não bloqueiam a conclusão local, mas continuam pendentes: proteção de entrada/TLS/deployment antes de exposição pública; CSP parcial sem restrição de scripts/styles/conexões; coleta/retenção de logs e limpeza de sessões expiradas; tooling acima. E-mail cadastrado não comprova posse e não há MFA; os controles existentes não são apresentados como proteção completa contra abuso ou roubo de sessão. O threat model classifica esses riscos residuais.

## Conta e ciclo de vida (ECMSG-32)

Conta é a identidade persistida em `users`: UUID imutável, e-mail canônico único, hash Argon2id da credencial, instante de criação e role customer/admin adicionada para o catálogo. Não há perfil, verificação de e-mail ou coluna de status. Toda conta persistida é utilizável; não existem estados pending/active/suspended/deleted/verified/locked. Limites temporários de tentativas não mudam o estado da conta.

Criação exige e-mail válido segundo o contrato existente e senha com a política de criação vigente; unicidade pertence ao PostgreSQL. Login verifica a credencial existente sem impor o mínimo de criação e não distingue publicamente conta inexistente de senha incorreta. Identidade não concede autorização. Sessões são registros separados, revogáveis e limitados por expiração absoluta/inatividade.

A alteração de credencial exige identidade/sessão válida e senha atual; persistência da nova credencial e revogação de todas as sessões são atômicas, exigindo novo login. Cadastro não implica privilégios ou verificação de posse do e-mail.

Guardian Bay não possui recuperação self-service de senha: não haverá link de reset, e-mail, OTP, pergunta secreta ou recovery code. Perda de acesso requer contato direto com administrador, por processo externo ainda não implementado. A ECMSG-38 formaliza os requisitos; a administração atual gerencia catálogo/estoque, sem reset privilegiado, senha padrão ou canal de recuperação configurado. Administração futura deverá verificar identidade e autorização, substituir a credencial sem conhecer a senha original e revogar sessões com auditoria.

## Testes de identidade e acesso (ECMSG-40)

`test:security` reutiliza os unitários, a integração PostgreSQL e os harnesses Next/Chromium. Os arquivos HTTP rodam sequencialmente porque compartilham o orçamento global no banco dedicado. Não há framework adicional ou rota de teste no produto.

| Garantia | Evidência |
| --- | --- |
| Política de criação/login e inputs estritos | Unitários Zod; integração comprova rejeição antes de hashing/DB e credencial legada |
| Cadastro válido, duplicado, concorrente e limitado | PostgreSQL real; browser registra/repete/atinge limite e confirma hash persistido |
| Login e conta | Formulários reais Chromium: falhas equivalentes, credencial válida, navegação, DTO próprio e ausência de hash/token/ID no HTML/RSC da conta |
| Sessão | Integração cobre expiração absoluta/idle e revogação; HTTPS/browser confere cookie HttpOnly/Secure/SameSite, rotação, logout e replay |
| Mudança de senha | Integração cobre transação, múltiplas sessões, concorrência e login obsoleto; browser repete após erro, troca credencial e entra com senha nova |
| CSRF, autoridade e payload | Transporte Next real rejeita origens/header spoof, campos de autoridade e body excessivo nas Actions existentes |
| Abuso, ownership e logs | PostgreSQL real testa limites/slots concorrentes e IDOR/BOLA; testes conferem allowlist, secrets ausentes e logging best effort |
| Recuperação | Rotas de reset não existem (404); login não oferece link para fluxo inexistente |

Fluxos completos de browser exigem `TEST_DATABASE_URL`, `SECURITY_BROWSER_PATH` e OpenSSL disponível. O harness termina TLS exclusivamente em loopback com certificado temporário, preserva Host e remove headers forwarded. Somente o perfil isolado de teste aceita esse certificado; não altera trust store ou deployment. `SECURITY_OPENSSL_PATH` permite apontar o executável; Windows usa o OpenSSL do Git por padrão. Sem browser/banco, subtestes explicitam skip, que não comprova o fluxo.

## Proteção dos fluxos de identidade (ECMSG-39)

As cinco Actions de identidade (cadastro, login, logout, leitura autorizada e alteração de senha) exigem Origin/Host conforme a política same-origin, validam campos/argumentos permitidos e devolvem resultados mínimos. A Action administrativa do catálogo aplica os mesmos controles e autorização específica. Cadastro e login não confirmam existência de conta; cadastro duplicado executa hash e não sobrescreve credencial. Não se promete tempo constante absoluto, pois banco, concorrência e rede também afetam duração.

Limites por operação são deliberadamente distintos: login 5, cadastro 2 e alteração de senha 3 por identificador/15 minutos, com orçamento global de 20/minuto e dois slots compartilhados. Não há IP confiável: limites internos não substituem proteção de entrada no deployment. Mutations repetidas continuam exigindo sessão/credencial atuais; logout é idempotente, login rotaciona e mudança de senha revoga todas as sessões. Leitura de conta só projeta e-mail próprio, sem mutation durante render.

Os formulários usam texto escapado pelo React, schemas públicos sem implementação privilegiada e nenhuma persistência Client de sessão/senha. CSP permanece parcial, sem relaxamento para os formulários. Eventos são allowlisted e best effort; registro de mudança de credencial não contém identidade, senha ou sessão e uma falha de logging não altera o resultado. Recuperação administrativa não tem endpoint na aplicação.

## Recuperação administrativa (ECMSG-38)

Perda de acesso exige contato com administrador e processo administrativo externo ao fluxo atual. A página de login informa essa decisão sem inventar canal de atendimento. Não há recuperação self-service, e-mail, token/link de reset, OTP, código de recuperação, pergunta secreta, senha padrão ou backdoor.

Não existe painel ou Action de reset; role admin atual autoriza somente gerenciamento do catálogo. Uma implementação futura deverá definir autenticação forte do administrador, autorização, auditoria, revogação de sessões e nova credencial temporária ou processo equivalente. Recuperação substitui a credencial; ninguém pode ler ou recuperar a senha original. Conhecer o e-mail não prova identidade nem autoriza substituição de senha.

## Alteração de senha (ECMSG-37)

`/account` compõe formulário Client mínimo; a Action valida objeto estrito com senha atual (política de autenticação) e nova senha (política de criação), exige mesma origem e resolve ownership pela sessão. Não recebe ID de usuário. Exige nova senha diferente da atual. Não há alteração sem confirmar a credencial atual.

Três tentativas por conta/15 minutos em chave `pwd:` compartilham orçamento global e slots Argon2 com login/cadastro. Verificação e novo hash são sequenciais no mesmo slot. O servidor trava a identidade e a sessão, revalida expiração pelo relógio do banco após hashing e atualiza hash/revoga todas as sessões na mesma transação. Sucesso expira cookie e exige login novo; falha não altera credencial. Evento allowlisted registra mudança sem senha, hash, e-mail ou token.

Criação de sessão trava a mesma identidade e confere que o hash verificado pelo login ainda é atual. Assim, login concorrente com senha antiga ou cria sessão antes da troca (revogada por ela), ou é rejeitado depois. Hash intermediário permanece exclusivamente entre módulos server-only e não compõe resposta pública.

## Cadastro (ECMSG-33)

`registerAction` exige mesma origem, valida o contrato strict de criação e delega ao server-only. Normalização de e-mail e política de senha são as mesmas da credencial existente. Argon2 precede INSERT com `ON CONFLICT(email) DO NOTHING`; não há SELECT prévio como garantia de unicidade. Novo cadastro e duplicado retornam somente `{ success: true }`, sem confirmar existência, e ambos executam hashing. Não há autenticação automática: o usuário deve realizar login com sua credencial; o cadastro nunca substitui a senha de conta existente.

Cadastro admite duas tentativas por e-mail/15 minutos em chave `reg:` pseudonimizada, distinta da chave de login. Compartilha vinte operações/minuto globais e os dois slots Argon2 do login, impedindo multiplicação de custo pela nova superfície. Slots indisponíveis/limites produzem RATE_LIMITED antes do hash. Não registra senha/e-mail bruto nem cria perfil/status. Proteção volumétrica e confiança de origem continuam requisitos de deployment.

## Interface de autenticação (ECMSG-34)

`/login` e `/register` são páginas Server que compõem um formulário Client compartilhado da feature auth. React Hook Form 7.89.0 trata inputs, pending e foco de validação; schemas Zod seguros são reutilizados somente para UX. As Actions continuam validando no servidor. Labels, erros associados, autocomplete current/new-password e password managers são preservados; a senha não é trimada e é removida do formulário após resposta. Falhas inesperadas recebem mensagem genérica, sem serializar erro interno. Não há estado de sessão no Client.

Inputs e botões nativos com Tailwind atendem aos controles atuais; não há consumidor que justifique adicionar primitives Radix ou Zustand. A interface de autenticação utiliza RHF, compatível com React 19; Lucide tem consumidor nas ilustrações do catálogo. Login navega para a aplicação após sucesso; cadastro orienta login sem revelar duplicidade. A integração de navegação/sessão segue a ECMSG-35.

## Sessão integrada à aplicação (ECMSG-35)

O layout Server resolve identidade por cookie/sessão e compõe navegação de visitante ou autenticado, sem enviar sessão, token ou identidade completa ao botão Client de logout. A navegação é UX; não autoriza recursos. Logout chama a Action existente sem argumentos, revoga no DB antes de expirar cookie e atualiza navegação por router refresh. Login atualiza a composição Server após sucesso.

`cookies()` torna a composição dependente da request; identidade não usa cache compartilhado, `use cache`, store ou contexto Client. Render continua somente read: não renova idle timeout. Reads e queries protegidas continuam validando expiração/revogação. O link para `/account` não concede acesso: a leitura é autorizada no servidor.

## Área da conta (ECMSG-36)

`/account` é Server e recebe de `readAccount` somente `{ email }`. O identificador vem da sessão resolvida no servidor; o caller não escolhe userId por URL, query ou hidden input. A operação existente revalida sessão e ownership na query antes de projetar o DTO. Visitante/sessão inválida não recebe dado e é redirecionado para `/login`; o redirect é somente UX. Não há perfil completo, IDs/timestamps internos ou registro de sessão no HTML. Render não renova atividade; logout/revogação/expiração impedem nova leitura.

## Contrato de entrada e proteção contra abuso (ECMSG-27)

Não há deployment, proxy ou origem confiável definidos. Atualmente `X-Forwarded-For`, `X-Real-IP` e `Forwarded` não identificam o caller; os limites de login funcionam sem eles.

Antes de exposição pública, a entrada deve garantir HTTPS, limitar conexões, taxa e tamanho de requests antes do Next.js e impedir acesso direto ao backend. Um proxy confiável deve remover/sobrescrever headers de origem enviados pelo cliente, preservar o Host público usado pela verificação de Origin e definir uma fonte de endereço autenticada pela topologia. Somente após configurar e testar essa infraestrutura a aplicação poderá consumir um header explicitamente definido; nenhum header está aprovado hoje.

Limitação por origem deverá complementar os cinco logins por identificador/15 minutos, vinte globais/minuto e dois slots Argon2 compartilhados. Não substitui o limite por conta ou transforma bloqueio temporário em estado permanente do usuário. Sem essa entrada, o orçamento global pode ser consumido por terceiros: protege hashing, mas não garante disponibilidade para usuários legítimos nem proteção volumétrica.

Logout é idempotente e a leitura autorizada usa queries limitadas; não executam Argon2. Não recebem novos limitadores por request nesta etapa. Taxa/conexões do tráfego geral pertencem à entrada, enquanto autenticação, ownership e limites de custo permanecem na operação server-side. Os testes PostgreSQL verificam limites, concorrência, slots e spoof de headers sem simular um proxy existente.

## Segurança do browser (ECMSG-28)

A CSP restringe imagens, fontes e manifests à própria origem; bloqueia objetos, mídia, frames, workers e framing externo. A aplicação usa fontes servidas pelo Next.js. Scripts/styles/conexões continuam sem restrição CSP: o HTML contém scripts inline de RSC/hydration. As páginas já são dinâmicas pela sessão, mas não há propagação de nonce por request ou política validada para os scripts inline. Não acrescentamos `unsafe-inline`, `unsafe-eval`, nonce fixo ou origens amplas. Uma CSP rigorosa deve ser reavaliada quando houver conteúdo dinâmico não confiável. A política parcial não garante prevenção de XSS.

Não há HTML de usuário, `dangerouslySetInnerHTML`, URLs dinâmicas ou scripts externos próprios. Trusted Types não foi habilitado: não há sink próprio consumidor, e enforcement no runtime do framework exigiria validação específica. Links externos são literais; novas entradas exigem validação pelo contexto.

`nosniff`, referrer `strict-origin-when-cross-origin`, Permissions-Policy restritiva e `frame-ancestors 'none'` permanecem. Não adicionamos headers obsoletos ou HSTS sem deployment HTTPS definido. Cookies de produção permanecem `__Host-`, Secure, HttpOnly, SameSite=Lax, Path=/ e sem Domain; desenvolvimento HTTP usa outro nome e não usa Secure. Testes HTTP verificam headers e recursos do build real; integração verifica a política de cookie e logout.

## Trilha mínima de segurança (ECMSG-29)

O logger server-only da feature é compartilhado por cadastro, login, sessão, leitura autorizada e alteração de senha. Registra limiar de rate limit, falhas operacionais inesperadas e mudança de credencial com somente `timestamp`, `event`, `operation`, `result` e `correlationId` aleatório por evento. Não recebe input, identidade ou objeto de erro. O ID correlaciona o evento no coletor, não usuários ou requests; não há correlação por e-mail. Não registra senhas, hashes, tokens, cookies, SQL, conexão, stack ou payload.

Não logamos requests normais, cada tentativa inválida, negação de ownership ou rejeição de Origin: são respostas esperadas e logging por request criaria amplificação sob abuso. Limiares são registrados somente ao serem atingidos. Falhas internas de login são registradas no controle externo de hashing, evitando duplicação pelo verificador. Falhas de sessão/consulta são registradas na operação que falhou. Erros públicos permanecem genéricos.

O destino atual é `console.warn` server-side; falha do sink é absorvida e não muda autenticação/autorização ou resultado. Não há entrega durável garantida. Deployment deverá restringir acesso ao coletor, definir retenção e monitorar indisponibilidade do sink; isso não está configurado localmente. Esta é trilha operacional de segurança, não auditoria de domínio ou histórico de cada login.

## Matriz de testes de segurança (ECMSG-30)

`npm run test:security` reúne unitários, integração PostgreSQL, build do produto e testes HTTP. Exige `TEST_DATABASE_URL` local dedicado `guardian_bay_test`, sem fallback ao banco normal; execute sem outra suíte concorrente no mesmo banco, pois o orçamento global é compartilhado. Portas loopback 3107/3108 e, para os fluxos HTTPS da Epic 3, 3447 devem estar livres. Para enforcement/hydration em Chromium real, configure `SECURITY_BROWSER_PATH` com um executável Chromium/Chrome/Edge instalado e use Node.js 22.12+ ou 24+; a porta CDP loopback 3110 deve estar livre. Sem essa variável, o subteste de browser é explicitamente skipped, sem alegar essa garantia. Não há download automático de browser.

| Garantia | Evidência |
| --- | --- |
| Argon2id, salt, política de criação/login e erros sem credenciais | `password.test.ts`, `credential.schema.test.ts` e integração ECMSG-23 |
| PK/NOT NULL/canonicalidade/unicidade/formato, tokens somente como hash, FK/cascade | Migrations reais e `auth.integration.test.ts` |
| Rotação, expiração absoluta/idle, revogação, leitura sem mutation | Integração ECMSG-24/25; HTTP cobre rotação e replay após logout |
| Ownership A→A/A→B, IDs/autoridade falsificados, revogação entre resolução e query | Integração ECMSG-25 e HTTP da leitura protegida |
| Inputs malformados/extras antes de DB/Argon2, budgets, janelas, concorrência e slots | Integração ECMSG-26; spies observam chamadas reais, sem substituir PostgreSQL/Argon2 |
| Origin ausente/indevida, HTTP em produção, forwarded forjado, payload >16 KiB | Contexto de request simulado na integração e transporte HTTP real no harness |
| CSP/headers, JS/CSS/fontes/imagens disponíveis | `scripts/security-browser.test.mjs` contra o build de produção real |
| Allowlist, correlação por evento, sink indisponível sem alterar resultado | Unitários do logger e login/revogação PostgreSQL no limiar |

`security-actions.test.mjs` copia o código para um diretório único ignorado em `.vitest`, substitui somente a composição por formulários de teste e usa o mesmo Next.js/configuração/implementação privilegiada contra DB real. O harness usa webpack e layout mínimo sem fontes; a aplicação real usa Turbopack e é validada separadamente. Form wrappers devolvem resultados via redirect só nesse harness. Processos, diretório e fixtures são limpos ao terminar; nenhuma rota de teste é adicionada a `src/app` do produto.

HTTP loopback envia Origin HTTPS para testar a política de produção, mas não comprova TLS de deployment. O subteste Chromium, quando configurado, usa perfil descartável, verifica runtime/hydration sem exceptions ou erros de console, imagens/fontes locais e violações CSP ao tentar carregar imagem externa e frame. CSP permanece parcial. Assertions negativas exigem ausência de efeitos/cookie nos requests rejeitados e ausência de dados internos no retorno. Testes não atribuem a mocks garantias de transporte ou concorrência do banco.

## Revisão da Epic 2 (ECMSG-31)

A base revisada desde a Epic 1 preserva Server-first, `app → feature/server → db`, guards `server-only`, Actions finas e DTO mínimo. Não há regras críticas somente no browser, repository/ACL genérico ou operações comerciais antecipadas. A [revisão da Epic 3](#revisão-da-epic-3-ecmsg-41) atualiza as evidências para os consumidores de UI existentes.

Na conclusão da Epic 2, os quatro SQLs então versionados foram aplicados pelo CLI Drizzle em banco novo do cluster local de testes. O upgrade desde 0002 manteve usuário/sessão de fixture; catálogo PostgreSQL de colunas/constraints/índices coincidiu com a instalação do zero e snapshots. `db:generate` não gerou alterações e `drizzle-kit check` passou. Integração real cobre rejeições, FK/cascade, parametrização, concorrência e revogação entre resolução e query; autorização vale no snapshot da query, sem promessa de cancelar resposta já produzida após revogação.

### Findings e pendências

| Problema | Impacto / evidência | Decisão |
| --- | --- | --- |
| Sem deployment, origem confiável ou proteção volumétrica | Budget global pode ser consumido por atacante; TLS, acesso direto ao backend, privilégios do DB e coleta/retenção de logs não foram validados em produção | Não bloqueia a base local; bloqueia exposição pública até cumprir o contrato ECMSG-27 |
| CSP parcial e ausência de MFA | Scripts/styles não são restringidos; token roubado é bearer até revogação/expiração | Risco residual documentado; CSP rigorosa deve acompanhar conteúdo dinâmico e MFA exige requisito próprio |
| Sessões expiradas persistem até logout/remoção de usuário | Não autenticam, mas acumulam registros; índice de expiração já existe | Definir limpeza operacional no deployment; não bloqueia validação local |
| `npm audit`: quatro moderados em `drizzle-kit` → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` → `esbuild@0.18.20` | Somente tooling dev. [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) afeta o servidor HTTP `serve` do esbuild; o loader instalado usa transform/transformSync, sem `serve`. Nenhum script do projeto expõe esse servidor. Impacto potencial é leitura de conteúdo servido por um site externo | Não bloqueante no caminho atual; Task futura para atualização compatível do tooling. Não aplicar o downgrade major sugerido pelo audit nem `audit fix` |
| Peer opcional esbuild do Vite 8.3.2 fora do intervalo | `npm ls` informa `ELSPROBLEMS`; esbuild raiz 0.25.12 não satisfaz o peer opcional ^0.27/^0.28. Unitários usam Vite/Rolldown e passam; `npm ci --dry-run --ignore-scripts` aceita o lock | Não bloqueante nesta execução; revisar resolução do tooling antes de depender desse transform opcional. Sem alteração de dependência para silenciar diagnóstico |

`npm audit --omit=dev` não encontrou vulnerabilidades. O audit completo retorna status não zero pelos quatro moderados triados, não por erro de conectividade. A revisão não afirma ausência de vulnerabilidades desconhecidas.

Os scripts da skill `nextjs-security-scan` foram executados sobre cópia dos arquivos rastreados, sem ler `.env` real ou artefatos locais. Secret scan: 13 alertas — exemplo proibido em referência da skill, senhas sintéticas de fixtures e URL fictícia de teste do validador; nenhum secret real identificado. Pattern scan: 52 alertas de SQL template são tags parametrizadas de Postgres.js/Drizzle, não concatenação; um aviso de `allowedOrigins` não requer correção porque same-origin é deliberado e allowlist adicional ampliaria acesso. Triagem manual confirmou contexto e imports. Scanners não comprovam autorização sozinhos.

Gates finais: `check`, integração, `test:security` com Chromium configurado e sem skips, `verify` e os três checks de diff. A matriz/threat model registra riscos parciais e superfícies ausentes; conclusão da base não equivale a autorização para deployment público.

## Precedência das instruções

A ordem entre instruções do projeto é `AGENTS.md → arquitetura aprovada do Guardian Bay → regras de segurança → frontend-patterns e outras recomendações genéricas`. Exemplos genéricos não alteram as decisões específicas. A skill de frontend conserva seu repertório de composição, fetching e performance; aplique-o dentro dos limites abaixo. Essa precedência não dispensa os invariantes de segurança registrados no projeto.

## Estado observado

O projeto usa Next.js 16.3.8 com React 19.2.8, App Router em `src/app`, Tailwind 4 e React Compiler habilitado. `page.tsx` e `layout.tsx` têm um componente principal cada e não usam `"use client"`. TypeScript está em modo estrito, com `@/* → ./src/*`. Biome 2.4.2 já formata, organiza imports e aplica regras recomendadas de Next/React por `npm run lint`.

Há infraestrutura PostgreSQL com Drizzle ORM/Kit e Postgres.js em `src/db`, configuração privada validada em `src/lib/env`, testes unitários e de integração com Vitest, baseline de headers HTTP e quality gates. `users`, `sessions` e `login_rate_limits` têm schemas/migrations; `features/auth` contém contratos Zod, Argon2id, cadastro, login/logout, alteração de senha, proteção compartilhada contra abuso e leitura autorizada da própria identidade. Há UI de login/cadastro/conta com RHF e sessão resolvida no layout Server. Catálogo e carrinho possuem operações comerciais limitadas aos modelos documentados; checkout/pedidos persistem snapshots e pagamento acadêmico; inventory controla quantidade atual, sem reserva. Radix UI e Zustand permanecem opções para consumidor concreto.

## Decisões arquiteturais essenciais

Estas decisões orientam todas as features. O [estado observado](#estado-observado) distingue a infraestrutura existente das implementações ainda ausentes; os links abaixo levam às regras detalhadas.

### Next.js full stack

**Decisão:** frontend e backend da aplicação ficam na mesma base Next.js, com App Router.

**Motivação:** manter composição e operações server próximas, aproveitando o modelo do framework sem uma API intermediária para cada leitura.

**Consequências:** Server Components fazem reads e Server Actions são a entrada padrão de writes. Route Handlers existem somente para uma interface HTTP real; rotas delegam comportamento às features. Veja [reads](#reads-e-data-loading) e [writes](#writes-e-server-actions).

### Server-first

**Decisão:** Server é o padrão; Client fica na menor subtree que precisa de interação ou APIs do navegador.

**Motivação:** reduzir JavaScript e lógica enviados ao browser e manter secrets e implementação privilegiada no servidor.

**Consequências:** páginas/layouts permanecem Server; componentes client não importam DB ou `feature/server`. Fetching client-side exige motivo concreto. Veja [Server-first e componentes](#server-first-e-componentes).

### Organização por feature e dependências dirigidas

**Decisão:** `app` cuida de rotas/composição; `features`, do negócio; `db`, de PostgreSQL/Drizzle; `lib`, de infraestrutura transversal; `components`, de UI compartilhada; `hooks`, de hooks transversais.

**Motivação:** manter regras e contratos próximos de seus responsáveis, com dependências visíveis e sem acoplamento arbitrário entre domínios.

**Consequências:** imports seguem o mapa abaixo, inclusive transitivamente. UI específica fica junto da rota/feature; reutilização concreta justifica compartilhamento. Veja [camadas e responsabilidades](#camadas-e-responsabilidades).

```text
app        → components, features, lib
features   → components, db, lib
components → lib
hooks      → lib, components
db         → lib
```

### Persistência relacional restrita ao servidor

**Decisão:** PostgreSQL com Drizzle ORM e Postgres.js é a persistência; UI e páginas/layouts não acessam Drizzle diretamente.

**Motivação:** combinar queries tipadas e controle explícito de SQL com constraints e transactions, mantendo regras, autorização e persistência desacopladas da UI.

**Consequências:** reads seguem `Server Component → feature/server → db`; writes, `Client → Server Action → feature/server → db`. Módulos privilegiados usam `server-only`; queries são parametrizadas e a operação define controles de concorrência/integridade. Migrations são revisadas e versionadas quando houver tabelas. Veja [PostgreSQL e Drizzle](#postgresql-e-drizzle-ecmsg-16).

### Intenção do cliente e autoridade do servidor

**Decisão:** o cliente é não confiável e envia intenção; o servidor determina ou valida preço, desconto, estoque, total, permissões, ownership e status de pagamento.

**Motivação:** alterações de payload ou estado de UI não podem conceder autoridade sobre dados críticos.

**Consequências:** para `productId + quantidade`, o servidor consulta preço/estoque e calcula o total. Zustand representa estado de UI. Validação frontend serve à UX; a boundary server valida novamente, usando Zod junto dos consumidores reais, sem substituir autorização. Veja [intenção e validação](#client--server-intenção-e-validação).

### Server Actions como boundary pública

**Decisão:** Actions são endpoints públicos finos; a implementação interna privilegiada fica em `feature/server`.

**Motivação:** uma chamada pode ocorrer independentemente da navegação ou da UI prevista.

**Consequências:** toda execução sensível verifica input, autenticação, autorização, ownership e estado atual antes do efeito protegido, delegando checks à implementação server quando adequado. UI escondida, página protegida e Proxy não autorizam a operação. O Client pode importar a referência remota de uma Action apropriada, nunca sua implementação interna. Veja [writes e Server Actions](#writes-e-server-actions).

### DTO mínimo na saída

**Decisão:** Server → Client envia apenas os dados necessários e serializáveis, inclusive nos retornos de Actions.

**Motivação:** reduzir exposição e evitar que contratos de UI dependam da estrutura interna de persistência ou sessão.

**Consequências:** a feature projeta campos explicitamente; entidades completas, secrets e detalhes internos de autorização não atravessam a boundary. Tipos Drizzle permanecem internos. Veja [DTO e serialização](#server--client-dto-e-serialização).

### Erros conforme a boundary

**Decisão:** falhas esperadas têm resultado explícito controlado; inesperadas em Actions propagam com `throw` ao Next.js. Handlers podem produzir HTTP 500 controlado com observabilidade server-side.

**Motivação:** distinguir rejeição de negócio de falha operacional, preservando recuperação e investigação sem expor detalhes internos.

**Consequências:** respostas e logs usam campos seguros; exceptions internas não viram mensagens públicas ou sucesso aparente. Contratos de erro pertencem à feature, sem hierarquia global antecipada. Veja [tratamento de erros](#tratamento-de-erros-e-observabilidade-ecmsg-17).

### Segurança transversal

**Decisão:** segurança é responsabilidade de cada feature e boundary, desde entrada até persistência e resposta.

**Motivação:** headers, proteção de página e scanners isolados não verificam as regras de uma operação.

**Consequências:** cada superfície real exige análise contextual de autenticação/sessão, autorização e IDOR/BOLA, validação, injection, XSS, CSRF, concorrência, integridade e exposição de informação. A [security-review](../../.agents/skills/security-review/SKILL.md) orienta essa revisão; o scan é complementar. A [baseline HTTP](#baseline-de-segurança-http-ecmsg-18) mantém CSP parcial, que não restringe scripts/styles/conexões nem substitui esses controles. A composição depende da request pela leitura de sessão com `cookies()`; CSP rígida deve ser reavaliada conforme novas superfícies reais exigirem.

### Testes pela garantia e gates pelo risco

**Decisão:** unitários verificam regras puras; componentes, comportamento observável da UI; integração, DB/framework reais; E2E, fluxos críticos completos. `check` é o gate rápido e `verify` acrescenta produção, com gates adicionais conforme o risco.

**Motivação:** obter evidência adequada à mudança, mantendo feedback rápido sem atribuir a mocks garantias que dependem da infraestrutura real.

**Consequências:** constraints, transactions e concorrência exigem PostgreSQL real de teste; autenticação/sessões têm integração separada dos unitários. Biome é o único linter/formatter, e boundaries de imports ainda são revisadas manualmente. Veja [testes](#testes-ecmsg-19) e [quality gates](#quality-gates-ecmsg-20).

### Evolução incremental

**Decisão:** camadas, dependências e abstrações surgem com necessidade concreta.

**Motivação:** preservar clareza, facilidade de revisão e menor superfície de bugs e segurança.

**Consequências:** não antecipar repositories, services, use-cases ou domain layers genéricas, helpers globais ou diretórios vazios. Uma nova abstração precisa demonstrar o problema e respeitar as boundaries existentes. Zustand, React Hook Form e Radix UI são escolhas para consumidores futuros, não dependências já instaladas. Veja [colocation e reutilização](#colocation-e-reutilização) e [revisão de novas adições](#revisão-de-novas-adições).

## Camadas e responsabilidades

A estrutura é conceitual: crie pastas somente quando existir código que as justifique.

```text
src/
├── app/
├── components/
├── features/
├── db/
├── lib/
└── hooks/
```

| Camada | Responsabilidade | Limite |
| --- | --- | --- |
| `app` | Rotas, layouts, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, composição e Route Handlers realmente necessários | Não concentra regras de negócio nem acessa Drizzle/PostgreSQL diretamente |
| `components` | UI verdadeiramente compartilhada | Não acessa DB ou código server privilegiado |
| `features` | Comportamento de funcionalidades/domínios | Separa recursos client-side de módulos server privilegiados |
| `db` | Somente PostgreSQL + Drizzle; conceitualmente `index.ts` e `schema/` | Não conhece React, app, components, features ou hooks |
| `lib` | Infraestrutura transversal, independente das features | Não importa app, features ou components |
| `hooks` | Hooks realmente transversais, como `use-media-query.ts` | Hooks específicos ficam na feature |

Evite antecipar `src/types`, `src/schemas`, `src/server`, `src/utils` e `src/assets`. Tipos, schemas e código server ficam próximos de seus responsáveis.

### Direção das dependências

```text
app        → components, features, lib
features   → components, db, lib
components → lib
hooks      → lib, components
db         → lib
```

O mapa trata dependências internas entre camadas; não exige que todas existam. As restrições de ambiente também se aplicam: a permissão `features → db` é para código server, nunca para componentes, hooks ou stores client-side. Código server da feature pode usar schemas e outros módulos server necessários, respeitando os limites entre domínios. Dependências não apontam de camadas inferiores para superiores; `db → feature` é proibido.

Prefira `app → feature/server → db`. `app` compõe features em vez de criar uma teia como `cart → catalog → orders → auth`. Um workflow server que atravesse domínios precisa primeiro demonstrar o problema concreto e então adotar a menor abstração necessária. Não antecipe `domain`, `application`, `use-cases`, `repositories` ou `services`.

### Colocation e reutilização

Um arquivo contém apenas um componente React principal. Não agrupe componentes independentes: ao dividir uma página, cada componente fica em seu arquivo. Componentes devem ser pequenos, coesos e reutilizáveis.

Um componente exclusivo de uma rota fica próximo dela, por exemplo:

```text
app/(store)/products/[slug]/
├── page.tsx
└── _components/
    ├── product-gallery.tsx
    └── product-details.tsx
```

Mova para a camada compartilhada adequada quando houver possibilidade real de reutilização por outras páginas/features. Não centralize antecipadamente. Em `components`, a organização conceitual é:

- `ui/`: primitives e elementos de design system, principalmente Radix UI + Tailwind, como `button.tsx`, `input.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `table.tsx` e `pagination.tsx`; sem pasta por componente desnecessária.
- `forms/`: infraestrutura genérica de formulário; formulários de domínio ficam na feature.
- `shared/`: componentes compostos reutilizados, como header, footer, logo e navegação.

`auth`, `catalog`, `cart`, `orders` e `inventory` já existem; checkout está em `orders`, sem camada paralela. Novas features dependem de consumidor concreto. Cada uma cria somente o necessário: `actions/`, `components/`, `schemas/`, `server/`, `hooks/`, `store.ts` ou `types.ts` são possibilidades, não um scaffold obrigatório.

`lib/money/` é transversal a catálogo, carrinho, checkout e pedidos. Já `get-cart-total.ts` pertence ao domínio do carrinho e fica na feature, não em `lib`. A mesma lógica vale para hooks: `features/cart/hooks/use-cart-drawer.ts` é específico.

## Diretórios e convenções (ECMSG-14)

Esta seção complementa as responsabilidades e o mapa de dependências acima. O código atual está em `src/app`, `src/db`, `src/lib/env` e `src/features/auth`, incluindo Actions de login/logout e schemas de identidade/sessão. Não há Route Handlers. Os exemplos abaixo orientam novas adições, sem criar diretórios antecipadamente.

### Onde colocar novo código

| Necessidade concreta | Local | Como decidir |
| --- | --- | --- |
| Rota, layout ou composição | `app/<segmento>/` | Preserve as convenções de arquivos do Next.js |
| UI exclusiva de uma rota | `app/<segmento>/_components/` | `_` exclui a pasta do roteamento; não é proteção de segurança |
| Formulário ou UI de um domínio | `features/<dominio>/components/` | Mesmo quando usado em várias rotas, permanece com o domínio |
| Leitura, regra crítica ou mutation interna | `features/<dominio>/server/` | Acesso a DB e projeção de DTO pertencem a essa implementação |
| Entrada por Server Action | `features/<dominio>/actions/` | Boundary pública fina; consulte a seção de writes |
| Schema de entrada ou contrato de saída | Junto da boundary na feature | Um arquivo dedicado basta; `schemas/` e `types.ts` surgem conforme o uso |
| Hook ou estado de UI específico | `features/<dominio>/hooks/` ou `store.ts` | Não promova estado de domínio ao Zustand |
| UI usada concretamente por áreas distintas | `components/ui`, `components/forms` ou `components/shared` | As responsabilidades são as definidas em colocation; `shared` aqui é UI composta, não depósito genérico |
| Hook transversal | `hooks/` | Sua dependência deve respeitar o mapa existente |
| Infraestrutura transversal | `lib/<responsabilidade>/` | Nomeie a responsabilidade, como `money`; não crie `utils`, `helpers`, `services` ou `common` genéricos |
| Conexão e schema PostgreSQL/Drizzle | `db/index.ts` e `db/schema/` | Sem regras de negócio ou contratos públicos derivados automaticamente de tabelas |
| Interface HTTP necessária | `app/<segmento>/route.ts` | Delega à implementação server da feature; não substitui reads diretos do servidor |

Configuração de ferramentas permanece na raiz e arquivos públicos em `public/`. Não coloque secrets em `public/`, módulos client ou variáveis `NEXT_PUBLIC_*`. Grupos como `(store)` organizam layouts sem mudar a URL; use-os apenas quando houver essa necessidade. Preserve segmentos dinâmicos como `[slug]` e nomes especiais do Next.js.

### Nomes e unidades de código

Use termos de domínio em inglês, seguindo `app`, `cart`, `catalog` e `orders` dos exemplos aprovados. Escolha nomes que revelem a operação e permitam localizar arquivo e símbolo sem abrir todo o módulo.

| Elemento | Convenção | Exemplo e finalidade |
| --- | --- | --- |
| Diretório ou arquivo comum | `kebab-case`; `.ts` para lógica, `.tsx` para JSX | `product-details.tsx`, `get-cart-total.ts`; busca consistente entre arquivos |
| React Component | `PascalCase`, um componente principal por arquivo | `ProductDetails` em `product-details.tsx`; props locais como `ProductDetailsProps` |
| Função ou variável | `camelCase`, verbo para operação | `getProducts`, `updateQuantity`; predicados como `isAvailable` |
| Hook | Arquivo `use-*.ts`, função `use*` | `use-cart-drawer.ts` / `useCartDrawer`; explicita a regra de hooks |
| Schema Zod | Arquivo `*.schema.ts`, símbolo `*Schema` | `change-quantity.schema.ts` / `changeQuantitySchema`; distingue validação de tipo |
| Tipo TypeScript ou DTO | `PascalCase`, sem prefixo `I` | `ChangeQuantityInput`, `CartSummaryDto`; nomeia o papel do contrato |
| Server Action | Arquivo `*.action.ts`, função assíncrona `*Action` | `update-quantity.action.ts` / `updateQuantityAction`; distingue endpoint de implementação interna |
| Operação server interna | Nome da operação, sem sufixo de Action | `server/update-quantity.ts` / `updateQuantity`; não é endpoint remoto |
| Route Handler | `route.ts`, exports HTTP exigidos pelo Next.js | `GET`, `POST`; não renomeie exports reservados |
| Schema de banco | Arquivo pelo conjunto de tabelas, símbolos descritivos | `db/schema/products.ts` / `products`; tipos inferidos usados internamente |
| Store de UI | `store.ts` na feature; hook `use*Store` | `useCartUiStore`; não armazena autoridade sobre preço ou permissões |

Nomes reservados (`page.tsx`, `layout.tsx`, `error.tsx`, `route.ts`, `proxy.ts` etc.) e exports exigidos pelo framework prevalecem sobre regras gerais. Não renomeie os componentes atuais `Home` e `RootLayout` por estética. Evite arquivos vagos como `data.ts` quando o nome da operação puder explicar seu conteúdo.

### Imports, exports e pontos de entrada

O alias existente é `@/* → ./src/*`; mantenha-o sem aliases adicionais. Use imports relativos dentro do mesmo módulo/feature e `@/` ao atravessar áreas, sempre para o arquivo responsável. O caminho não concede permissão: aplique o mapa de dependências e a boundary Server × Client também aos imports transitivos.

Prefira exports nomeados para componentes reutilizáveis, funções, schemas e tipos, para que o nome do contrato seja consistente nos consumidores. Preserve default exports onde Next.js exige, e os defaults existentes. Use `import type` e `export type` para dependências exclusivamente de tipos; isso não autoriza expor tipos internos de banco ou sessão como contratos client.

Não crie barrel files (`index.ts` de reexports) automaticamente. Imports diretos tornam o ambiente e a origem visíveis e reduzem ciclos. Um ponto de entrada necessário deve ter exports explícitos, sem `export *`, e responsabilidade única. Nunca reúna componentes client, Actions e implementação server no mesmo barrel. `db/index.ts` é o ponto de conexão previsto, não um barrel para tornar tabelas acessíveis à UI.

Uma feature não importa arbitrariamente `server`, componentes, stores ou outros detalhes internos de outra. Primeiro prefira composição pela rota. Se um workflow exigir colaboração server entre domínios, documente o caso e o contrato mínimo antes de introduzir a dependência; o consumidor só usa esse ponto de entrada explícito e server protegido. Não crie fachadas vazias nem um `index.ts` por domínio preventivamente. A API pública continua sujeita à direção das camadas e ao ambiente do consumidor.

| Import hipotético | Resultado |
| --- | --- |
| `app/page.tsx → @/features/catalog/server/get-products` | Permitido para leitura server |
| `features/cart/actions/update-quantity.action → ../server/update-quantity` | Permitido; a operação verifica a segurança em cada chamada |
| Componente client → Action de arquivo com `"use server"` | Permitido como referência remota, conforme a boundary aprovada |
| Componente client → `features/cart/server/*` ou `db/*` | Proibido, inclusive via reexports e dependências transitivas |
| `components/* → features/*` ou `db/*` | Proibido pelo mapa; UI específica permanece na feature |
| `features/cart/* → features/catalog/server/*` sem contrato aprovado | Proibido; não acople internals entre domínios |
| `db/* → features/*` ou `lib/* → app/*` | Proibido por inverter a direção das dependências |

### Contratos e marcação de ambiente

Mantenha `"use client"` no topo da menor entrada interativa necessária. Não espalhe a diretiva para compensar imports incompatíveis. `"use server"` no topo de arquivo de Actions identifica exports assíncronos remotos; não use essa diretiva como proteção de helpers internos.

Módulos que acessam DB, secrets, autenticação/autorização ou regras privilegiadas devem usar `import "server-only";`, inclusive pontos de entrada server e infraestrutura privilegiada em `db`/`lib`. O nome `server/` ou um sufixo de arquivo sozinho não impede bundling client. Não marque schemas puros de entrada ou contratos seguros compartilhados como server-only apenas pela localização. `src/db/index.ts` e `src/lib/env/server.ts` já usam esse guard, com suporte interno do Next.js.

Tipos inferidos do Drizzle permanecem internos. Um DTO específico, junto da feature, declara os campos mínimos realmente enviados; a implementação server projeta os campos explicitamente, sem espalhar uma entidade inteira. Para inputs, prefira `z.infer` ou, quando houver transformação, `z.input`/`z.output` conforme o lado do contrato. Compartilhe schema com o formulário somente quando for puro, seguro e não trouxer dependências privilegiadas. Consulte as seções de DTO, validação e writes para as garantias da operação; nomes de arquivos e tipos não substituem esses checks.

### Revisão de novas adições

Antes de adicionar um módulo, identifique seu dono, consumidores e ambiente. Confira imports diretos, reexports e dependências transitivas client contra o mapa; revise os campos efetivamente enviados pela boundary. Crie somente os diretórios necessários ao código real e rode `npm run check` e os testes pertinentes disponíveis. O mapa continua sendo verificado em revisão; Biome atual não garante isolamento arquitetural nem ausência de vazamento de dados.

## Fronteira Server × Client aprovada

### Server-first e componentes

Server é o padrão. Client é uma exceção introduzida somente onde interação ou APIs do navegador realmente exigirem. Páginas e layouts permanecem Server sempre que possível; a necessidade de `useState`, Zustand, React Hook Form ou eventos em uma parte não transforma toda a árvore em Client.

```text
page.tsx                 SERVER
├── product-details      SERVER
├── description          SERVER
├── reviews              SERVER
└── add-to-cart           CLIENT
```

Coloque `"use client"` na menor subtree necessária. O módulo e suas dependências ordinárias entram no grafo client, mesmo com pré-renderização no servidor. Não podem importar `feature/server`, `db`, secrets, credenciais, sessão interna ou implementação `server-only`. Uma referência remota de Server Action apropriada é a exceção descrita abaixo: sua implementação continua no servidor.

Cada componente independente tem arquivo próprio, inclusive em composição e compound components. Exemplos genéricos que mostram vários componentes no mesmo bloco demonstram conceitos, não a organização de arquivos deste projeto. Componentes exclusivos ficam próximos da rota/feature; `src/components` exige possibilidade real de reutilização.

### Reads e data loading

O caminho principal de leitura é:

```text
Server Component
  → feature/server
  → autenticação/autorização quando necessário
  → DB
  → DTO mínimo
  → Server Component
  → Client Component somente se necessário
```

Mesmo sendo tecnicamente permitido pelo Next.js, Server Components não acessam Drizzle/PostgreSQL diretamente. `page.tsx → feature/server/get-products → db` centraliza queries, regras, autorização, projeção de DTO e pontos de teste/revisão na feature.

Não substitua essa leitura por `page.tsx → Client → useEffect/SWR/React Query → /api/products` quando o servidor já puder obter o dado. Fetching no browser ou polling é exceção com motivo concreto, como informação dependente de APIs exclusivamente do browser ou atualização periódica necessária. Os exemplos genéricos de fetching da skill só se aplicam após essa justificativa; não autorizam adicionar bibliotecas.

Server Actions não são o mecanismo padrão de data fetching. Render de Server Component faz leitura/composição, sem mutations ou efeitos colaterais relevantes: logout, update e alterações críticas pertencem a uma Action ou Route Handler.

### Server → Client: DTO e serialização

Props e retornos enviados ao cliente fazem parte da boundary. A feature projeta a entidade de banco para um DTO mínimo e serializável segundo React/Next.js; não repasse automaticamente registros completos.

Por exemplo, em vez de enviar `user`, `session` e `product` inteiros a um `CartButton`, passe somente `productId` e `initialQuantity` se forem suficientes. Usuários, endereços, pedidos, sessões, dados administrativos e simulação de pagamento exigem atenção especial à exposição.

Evite instâncias de bibliotecas de domínio quando representações simples bastarem. Dinheiro pode conceitualmente sair de uma instância Dinero no servidor para `{ amount: 12990, currency: "BRL" }`, ou para string formatada quando a UI apenas exibe. O contrato atual de preço do catálogo usa Dinero e projeta `{ amount, currency, formatted }`, conforme o modelo monetário documentado acima.

### Client → Server: intenção e validação

Toda entrada do cliente é não confiável: `FormData`, JSON, `params`, `searchParams`, headers, cookies, hidden inputs, argumentos de Server Actions, `.bind()`, Zustand, `localStorage` e query strings. Ter recebido um valor por props, hidden input ou `.bind()` não lhe concede autoridade. Uma identidade só se torna confiável após verificação server-side da sessão/credencial correspondente.

O cliente informa intenção, como `{ productId: "…", quantity: 2 }`. O servidor valida essa entrada, busca produto/preço/estoque reais e aplica a regra de domínio. Nunca aceite o cliente como autoridade sobre `unitPrice`, `discount`, `subtotal`, `total`, `stock`, `permissions`, `role`, `ownership` ou `payment status`.

React Hook Form e Zod client-side fornecem feedback imediato para UX. A boundary server (Action/Route Handler) valida novamente toda entrada com Zod antes da regra. Reutilize um schema quando seguro e adequado, mantendo-o próximo da feature/boundary e sem importar dependências privilegiadas no cliente. Validação de formato não substitui autorização sobre um ID válido.

### `actions/` × `server/`

Uma feature pode ter `actions/`, `components/`, `schemas/` e `server/`, somente com código real. Não crie essas pastas vazias.

| Local | Responsabilidade | Consumo pelo Client |
| --- | --- | --- |
| `features/<feature>/actions/` | Boundary pública Client → Server, com Server Actions finas | Pode importar uma Action apropriada de arquivo marcado com `"use server"`; recebe referência remota |
| `features/<feature>/server/` | Implementação interna privilegiada, regras, authz, queries e DTO | Não pode importar |
| `db` | PostgreSQL/Drizzle | Não pode importar |

`"use server"` expõe funções como chamadas remotas; não é sinônimo de módulo interno protegido. Use `import "server-only";` em `server/` quando apropriado. A exceção para referências de Actions não autoriza reexportar implementação interna nem importar DB no cliente. Componentes compartilhados continuam sem acesso à implementação privilegiada.

### Writes e Server Actions

O padrão de escrita é `Server Action → feature/server`. Trate Actions como endpoints públicos, invocáveis independentemente da UI ou da navegação legítima.

```text
features/cart/actions/update-quantity.action.ts
  → validar boundary
  → obter identidade quando necessário
  → features/cart/server/update-quantity.ts
  → regra + autorização/ownership + DB
```

A Action permanece fina. Cada operação sensível verifica novamente validação, autenticação, autorização e ownership. Os checks podem ser delegados à implementação server, mas devem ocorrer em cada execução antes do acesso/efeito protegido. Um botão oculto, página autorizada, rota protegida, hidden input ou `.bind()` não substitui esses checks. Verifique ownership/permissões dos IDs para impedir IDOR/BOLA.

O retorno também é boundary: prefira `{ success: true }` ou contrato específico mínimo necessário à UI. Não retorne entidades completas por conveniência. Erros não expõem stack traces, SQL, secrets, detalhes internos ou informações sensíveis; a política de classificação, tradução e logging está na seção [Tratamento de erros e observabilidade](#tratamento-de-erros-e-observabilidade-ecmsg-17).

### Route Handlers e Proxy

`route.ts` representa uma interface HTTP real: integração externa, webhook, callback, download, API externa, endpoint efetivamente consumido pelo cliente ou polling necessário. Não crie Route Handler para o próprio Server Component chamar: use `page.tsx → feature/server → db`, em vez de `page.tsx → fetch("/api/products") → route.ts → db`.

Trate o handler como entrada pública: `Request → validação → autenticação/autorização conforme a operação → feature/server → Response mínima`. Operações sensíveis verificam ownership e valores críticos com as mesmas garantias das Actions. Mutations HTTP ficam nesses handlers quando a interface HTTP justificar sua existência.

Um futuro `proxy.ts` pode ajudar em redirects, navegação, UX e filtragem inicial. Não é autorização final: a Action/handler e sua operação server verificam a própria autorização novamente.

### Composição Server dentro de Client

Um pai Server pode construir conteúdo Server e passá-lo por props/`children` a um Client, por exemplo `<Modal><Cart /></Modal>`, com `Modal` Client e `Cart` Server criado acima da boundary. Isso preserva composição válida sem o Client importar diretamente o componente Server ou implementação privilegiada.

### Zustand e estado local

Zustand representa UI/cliente: drawer aberto, filtro local, estado temporário, seleção visual ou quantidade antes do submit. Pode exibir dados recebidos, mas nunca é autoridade de domínio sobre preço, desconto, estoque, total, role, permissão, ownership, pedido ou pagamento. Valores reenviados ao servidor passam pelas validações da operação.

## Validação, tipos e segurança

Schemas Zod ficam próximos da feature ou boundary protegida, por exemplo `features/auth/schemas/login.schema.ts`, `features/cart/schemas/change-quantity.schema.ts` e `features/checkout/schemas/address.schema.ts`. A validação frontend melhora UX; toda entrada não confiável deve ser validada novamente no servidor. React Hook Form não fornece garantia de segurança server-side.

Tipos específicos ficam junto de seus donos. Prefira `z.infer<typeof schema>` e tipos derivados do Drizzle. Evite manter schema Zod, interface TypeScript, tipo DB, tipo de formulário e tipo API duplicados sem necessidade concreta.

Autenticação e autorização ocorrem no servidor. Cada mutation verifica permissão e ownership; esconder botões não impede IDOR/BOLA. Queries e mutations expõem somente o necessário. Dados críticos são determinados ou validados pelo servidor, e módulos client não acessam infraestrutura privilegiada.

No banco, use Drizzle de forma parametrizada e evite SQL inseguro. Considere concorrência e integridade nas operações críticas; o mecanismo concreto deve ser escolhido conforme a operação real, sem criar tabelas ou abstrações nesta Task.

## Variáveis de ambiente (ECMSG-15)

### Declaração e classificação

O inventário de configuração da aplicação é o `.env.example` na raiz. Toda nova variável precisa de consumidor concreto ou da próxima Task identificada, classificação server/public e comentário sobre quando é obrigatória. Valores reais são fornecidos em `.env.local` ignorado, ou pelo ambiente de execução/deploy; nunca pelo template. O template usa valores vazios ou placeholders claramente fictícios e não é carregado automaticamente pelo Next.js.

| Variável | Classificação | Consumidor e obrigatoriedade |
| --- | --- | --- |
| `DATABASE_URL` | Exclusivamente server-side, potencialmente contém credenciais | Obrigatória antes de obter a instância DB e para a CLI Drizzle Kit; não exigida por rotas sem DB |
| `TEST_DATABASE_URL` | Exclusivamente testes, potencialmente contém credenciais | Obrigatória para `test:integration`; banco local dedicado `guardian_bay_test`, sem fallback para a conexão da aplicação |

Não há variáveis públicas necessárias, nem variáveis de autenticação/sessão justificadas atualmente. Não antecipe `AUTH_SECRET`, `SESSION_SECRET` ou infraestrutura client de configuração. Os nomes aqui são exemplos de categorias privadas, não requisitos atuais.

Privada é a classificação padrão. `NEXT_PUBLIC_*` é informação deliberadamente pública e só se justifica com necessidade real no Client. Nunca inclua credenciais, connection strings, tokens privados, chaves de sessão, infraestrutura interna ou valores usados como autoridade de segurança. Não envie variáveis privadas em props/DTOs, respostas HTTP, logs, mensagens de erro ou bundles client. A proteção nativa do framework não substitui a revisão desses caminhos explícitos de exposição.

### Carregamento nativo do Next.js

A documentação instalada de Next.js 16.3.8 em `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md` é a referência de comportamento. Arquivos `.env*` ficam na raiz, mesmo com código em `src`. O runtime Next.js já os carrega em `process.env`; não adicione `dotenv` ou carregamento manual duplicado.

A precedência é: `process.env` → `.env.$NODE_ENV.local` → `.env.local` → `.env.$NODE_ENV` → `.env`. O primeiro valor encontrado prevalece; `.env.local` não é carregado em `test`. Sem `NODE_ENV` explícito, `next dev` usa `development` e os demais comandos usam `production`. Não use nomes de ambientes personalizados em `NODE_ENV`. Valores com `$` são expandidos; use `\$` para um dólar literal no arquivo.

Leituras estáticas de `process.env.NEXT_PUBLIC_*` são incorporadas ao bundle durante `next build` e ficam congeladas: mudar o ambiente em runtime não altera o bundle já gerado. Acesso dinâmico por nome de variável ou alias de `process.env` não oferece esse inlining. Configuração privada também pode ser avaliada no build se usada em prerenderização; quando houver necessidade de configuração runtime, o consumidor deve usar o fluxo dinâmico apropriado documentado pelo Next.js, sem tornar todas as páginas dinâmicas preventivamente.

Não use `next.config.ts` → `env` para secrets: essa opção incorpora os valores ao JavaScript mesmo sem prefixo público. Preserve o arquivo de configuração atual sem esse campo. A CLI Drizzle Kit usa `@next/env`, declarado como dependência direta, para carregar a configuração fora do runtime Next.js.

### Acesso e validação

A ECMSG-16 introduz o consumidor DB e o módulo `src/lib/env/server.ts`. Seu `getDatabaseUrl()` valida a configuração antes da criação da instância. A função pura em `database-url.ts` recebe somente o valor a validar e é compartilhada com a CLI; não lê nem exporta ambiente. Os contratos de credencial usam Zod; a validação de configuração mantém sua implementação pura existente.

O módulo `src/lib/env/server.ts` é protegido com `import "server-only";`. Ele lê somente as variáveis declaradas necessárias e exporta um acessor específico, nunca o objeto inteiro de `process.env`. Features/componentes não fazem leituras arbitrárias: a infraestrutura responsável usa esse ponto de acesso. Para `DATABASE_URL`, a infraestrutura `db` obtém o valor validado antes de abrir a conexão; UI não importa configuração privada.

A documentação instalada de Server/Client Components confirma que Next.js trata `server-only` internamente, inclusive produzindo erro de build em import client; instalar o pacote é opcional. Não adicione a dependência por padrão. A convenção de proteção da Task 3 permanece válida: diretório/sufixo não protege o módulo e `"use server"` não substitui esse guard.

O consumidor define quando a variável é obrigatória: valide antes do primeiro uso protegido e, se requerida na inicialização, antes de aceitar operações. Se utilizada durante build/prerenderização, valide nessa fase. Rejeite ausência, string vazia ou composta somente por espaços com erro como `Configuração obrigatória ausente: DATABASE_URL`, sem imprimir valor ou outras variáveis. Valide também o formato exigido pelo consumidor, sem defaults fictícios, non-null assertions ou fallback silencioso para configuração crítica. Não deixe um erro de configuração virar detalhe interno enviado ao usuário; a boundary aplica a política de erros já definida na arquitetura.

Não torne uma variável futura obrigatória só porque aparece no template. A Task que introduzir o consumidor deve atualizar sua obrigatoriedade e verificar ausência, vazio, formato inválido e valor válido com dados fictícios, além da rejeição de import client pelo framework.

Se houver consumidor público no futuro, mantenha o módulo público separado do privado e leia somente nomes públicos explícitos. Um módulo client nunca carrega configuração server para depois selecionar alguns campos. Não crie esse módulo sem necessidade atual.

### Arquivos e revisão de segurança

A regra existente `.env*` com exceção `!.env.example` já ignora arquivos locais, inclusive variantes de produção/desenvolvimento/teste. Mantenha somente o template seguro versionado; a recomendação genérica do Next.js de versionar `.env.test` não se aplica à política deste projeto. Não crie arquivos com valores reais nesta Task.

Revise novas variáveis no template, consumidores e caminhos de exposição. Use `git ls-files -- '.env*' '**/.env*'`, `git check-ignore --no-index .env .env.local .env.production .env.development.local .env.test` e busca por `NEXT_PUBLIC_`/`process.env` no código para confirmar a política. Ignore de Git não é proteção contra vazamentos em runtime nem remove um secret já rastreado.

## PostgreSQL e Drizzle (ECMSG-16)

`src/db/index.ts` exporta `getDb()`, a fonte canônica da instância Drizzle. O fluxo permanece `feature/server → db → PostgreSQL`; páginas não acessam DB diretamente, e Client não importa DB nem `lib/env/server`. Ambos os módulos privilegiados têm `import "server-only";`, com suporte interno do Next.js, sem pacote adicional. Use runtime Node nos consumidores de banco, não Edge; nenhuma rota atual teve seu runtime alterado.

O driver único é `postgres` (Postgres.js), oficialmente suportado pelo adapter `drizzle-orm/postgres-js`, com tipos próprios e pool integrado. A criação é lazy: `getDb()` valida antes de construir a instância, e o driver só abre conexões ao executar queries. Em desenvolvimento, o cache em `globalThis` reutiliza a instância nos reloads; em produção, o cache do módulo mantém uma instância por processo. Não encerre o pool após cada request. Mudanças de configuração exigem reiniciar o servidor. Limites, SSL, prepared statements e requisitos de proxies/poolers devem ser avaliados conforme o deployment real; esta Task não impõe limites arbitrários nem desabilita verificação TLS.

A validação compartilhada aceita `postgres:` ou `postgresql:`, com hostname, database path e porta válida quando informada. Ausência/vazio/espaços e URL incompatível falham com mensagem que informa apenas `DATABASE_URL`, sem valor, causa original ou connection string. Nenhuma conexão é feita na validação. Erros de query/conexão do driver podem conter detalhes internos: as futuras boundaries devem convertê-los em erros seguros, nunca retornar ou registrar o objeto bruto. Não há endpoint de diagnóstico ou tratamento HTTP de DB nesta Task.

`drizzle.config.ts` fica na raiz, usa dialect `postgresql`, schemas em `src/db/schema/**/*.ts` e migrations em `drizzle/`. A CLI usa `@next/env` como dependência direta de desenvolvimento para carregar os mesmos arquivos do Next.js; `NODE_ENV=development` seleciona variantes de desenvolvimento, caso necessárias. Ela importa somente a validação pura, não módulos com guard reservado ao runtime Next.js.

O fluxo padrão é schema TypeScript real → `npm run db:generate` → revisão e commit dos arquivos SQL/metadados em `drizzle/` → `npm run db:migrate` no banco correto. `npm run db:studio` abre a ferramenta local para inspeção e requer banco disponível; não exponha Studio publicamente. Não há script `db:push`. Revise migrations antes de aplicá-las, especialmente mudanças destrutivas. Não rode migrations automaticamente durante render, startup de página ou build.

`src/db/schema/users.ts` define a identidade e `sessions.ts`, a sessão revogável, com migrations em `drizzle/`. As definições físicas ficam em `db/schema`, e tipos inferidos permanecem internos: feature/server projeta DTO mínimo. Queries comuns usam APIs parametrizadas do Drizzle; não concatene SQL com dados externos. O schema é carregável pela CLI e não realiza acesso a dados; a conexão e os helpers de credenciais/sessão permanecem server-only.

Para verificar o carregamento da configuração sem banco nem migrations, use uma URL fictícia formalmente válida em ambiente temporário e `npx drizzle-kit check`. Esse comando verifica histórico de migrations, não conectividade ou integridade de um banco; com histórico ausente, não comprova migrations reais. Não execute migrate/studio com placeholders. Uma conexão real requer PostgreSQL e `DATABASE_URL` utilizável e deve ser validada localmente, sem endpoint público.

Referências oficiais consultadas: [PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql), [config](https://orm.drizzle.team/docs/drizzle-config-file), [generate](https://orm.drizzle.team/docs/drizzle-kit-generate), [migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate), [check](https://orm.drizzle.team/docs/drizzle-kit-check) e [lifecycle Postgres.js](https://github.com/porsager/postgres#the-connection-pool).

## Identidade e credenciais (ECMSG-23)

`users.id` é a identidade estável, UUID gerado pelo PostgreSQL. `email` é o identificador de autenticação: a entrada aceita e-mail ASCII, remove somente espaços nas extremidades e converte para minúsculas antes de validar formato e limite de 254 caracteres. Pontos e `+tag` são preservados; não há regras específicas de provedores nem suporte a e-mail internacionalizado nesta etapa. O contrato limita a entrada bruta a 320 caracteres antes da normalização. Login e cadastro usam o mesmo `emailSchema`.

O banco exige PK, campos `NOT NULL`, e-mail único e representação ASCII/minúscula sem espaços e com um único `@`. O schema Zod valida o formato mais estritamente; o banco garante a representação canônica e a unicidade inclusive em inserts concorrentes. `createdAt` é `timestamptz` com default `now()`; não há `updatedAt`: a área da conta não consome metadados de alteração e a troca de credencial não exige esse campo. Não há perfil, role ou permissões na identidade.

`passwordHash` é credencial sensível, não identidade ou sessão. `hashPassword` e `verifyPassword`, em `features/auth/server/password.ts`, usam `argon2` 0.45.1 com Argon2id v19, memória de 64 MiB, três iterações, paralelismo 1 e saída de 32 bytes. A biblioteca gera salt criptográfico aleatório de 16 bytes por hash e faz a comparação; o formato PHC incorpora salt e parâmetros. O custo é uma política versionada privada do servidor, ajustável no módulo após avaliação de recursos, nunca por input do cliente. A escolha segue a [orientação OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) e a API da [biblioteca](https://github.com/ranisalt/node-argon2); usa runtime Node, não Edge. Next.js já externaliza `argon2`, sem configuração adicional.

Criação aceita de 15 a 128 pontos de código Unicode, sem exigir classes de caracteres. Senhas não são aparadas, normalizadas ou truncadas; espaços são preservados. O limite inicial de 256 unidades UTF-16 e a rejeição de surrogates isolados limitam o UTF-8 a 512 bytes. Verificação mantém o limite máximo, sem aplicar novamente o mínimo de criação, e recebe o hash somente da persistência privilegiada. Senha incorreta retorna `false`; input de criação inválido e falha operacional produzem erros internos controlados, sem valor, hash ou causa original. Um hash inválido é falha operacional, não confirmação de identidade. A boundary de login controla respostas e usa verificação equivalente para identidade inexistente.

A tabela não possui coluna de senha em texto puro e exige formato PHC Argon2id compatível com a biblioteca. A constraint verifica representação, não prova que um hash foi derivado de uma senha: somente código server pode produzi-lo para persistência. O hash retornado pelo helper é exclusivamente interno e nunca integra DTO/Action/props, logs ou respostas públicas. Schemas de entrada puros podem ser compartilhados para UX; o Client não pode importar helpers de credenciais ou DB. Há cadastro público, sem leitura pública de credenciais.

Unitários usam Argon2 real para senha correta/incorreta, salts distintos, limites Unicode e erros sem secrets. O mock de `server-only` no runner substitui apenas o marcador Next.js, não criptografia nem a proteção de build. A integração aplica migrations em PostgreSQL isolado e verifica constraints/defaults e o fluxo hash → INSERT → SELECT → verificação.

## Autenticação e sessões (ECMSG-24)

`loginAction` valida a origem da requisição e delega a `feature/server`: `authenticationCredentialSchema` → e-mail canônico → reserva no rate limiter → slot de hashing → lookup parametrizado → `verifyPassword` → nova sessão → cookie. Criação continua usando `credentialSchema` com mínimo de 15 pontos de código; autenticação aceita senha existente não vazia, mantendo tipos, máximo de 128 pontos de código/256 unidades UTF-16 e rejeição de surrogates isolados. Ambos preservam a senha exatamente. Alterar o mínimo de criação não bloqueia credenciais existentes. Falhas de contrato, identidade inexistente e senha incorreta retornam somente `{ success: false, message: "Credenciais inválidas." }`; sucesso retorna `{ success: true }`. Limitação de tentativas/custo tem resultado próprio descrito abaixo. Identidade inexistente executa Argon2id contra hash sintético não secreto com o mesmo custo vigente, evitando o atalho sem hashing. Ao alterar a política de custo, atualize também esse hash. Isso reduz enumeração por timing, sem prometer tempo constante de banco/rede. Falhas operacionais propagam como exceções controladas, sem SQL, senha, hash, token ou causa bruta.

`sessions.tokenHash` é PK: SHA-256 de 32 bytes criptograficamente aleatórios apresentados como 64 caracteres hexadecimais. O token bruto fica somente no fluxo server → cookie → browser; não é persistido, retornado pela Action ou logado. A tabela exige hash canônico, FK `users.id` com `ON DELETE CASCADE`, timestamps `NOT NULL`, `expiresAt > createdAt` e `createdAt <= lastActiveAt < expiresAt`, com índices de usuário e expiração. A sessão tem limite absoluto de oito horas e idle timeout de 30 minutos, pelo relógio do PostgreSQL; nenhuma atividade prolonga `expiresAt`.

`recordSessionActivity` atualiza `lastActiveAt` somente para sessão ainda válida e cujo registro de atividade tem pelo menos cinco minutos. A Action protegida registra atividade após leitura autorizada; consultas durante render apenas leem, preservando a regra de não realizar mutations em Server Components. A janela de inatividade conta da última atividade persistida, podendo encerrar até cinco minutos antes da última interação real. Requests negados não renovam; sessão expirada/revogada não é ressuscitada. Futuras Actions/handlers autorizados devem registrar atividade na própria boundary, sem renovar em todo render. A migration inicializa atividade das sessões antigas com `createdAt`, sem conceder nova janela a sessões já inativas.

Cada login gera novo token; criação e revogação do token anterior apresentado no cookie ocorrem na mesma transaction. Tokens simultâneos de logins independentes são válidos; não há política de sessão única por usuário. `getAuthenticatedIdentity()` lê o cookie e retorna somente `{ id, email }` ou `null`, após join com usuário e verificação da expiração no banco; não usa cache compartilhado. Cookie/token ausente, malformado, inexistente, revogado ou expirado não autentica. Logout remove a sessão no banco antes de expirar o cookie e é idempotente. Não há tarefa automática de limpeza de registros expirados; eles já são rejeitados na leitura.

O cookie usa `HttpOnly`, `SameSite=Lax`, `Path=/`, sem `Domain`, e expiração igual à sessão. Em produção chama-se `__Host-guardian-session` e exige `Secure`/HTTPS; em desenvolvimento HTTP chama-se `guardian-session`, sem `Secure`. Não há sessão em localStorage, sessionStorage ou Zustand. Cookies e leitura da identidade permanecem server-only, em runtime Node. A posse de um token válido autentica até expiração/revogação; hashing no banco não impede replay de token bruto roubado.

As Actions usam POST, com a checagem Origin/Host (ou X-Forwarded-Host) do Next.js 16.3.8. `requireSameOrigin` é deliberadamente mais restrito: exige Origin válida, igual ao Host público e HTTPS em produção; requests sem Origin são rejeitados. Não usa X-Forwarded-Host como autoridade nem aceita uma allowlist vinda do request. O deployment assumido permite acesso direto ou proxy confiável que preserva o Host público, encaminha a Origin HTTPS e remove/sobrescreve headers forwarded do cliente. O backend atrás de proxy deve ficar inacessível diretamente. Proxy que troca Host por nome interno não é suportado por esta política; sua adoção exige configuração confiável explícita, sem simplesmente confiar em X-Forwarded-*. SameSite complementa a proteção; não há token CSRF próprio nem CORS como defesa. Não há mutations por GET ou Route Handler. Novas surfaces precisam reavaliar CSRF.

Autenticação resolve identidade, não concede autorização. Uma futura mutation de domínio deve verificar sessão atual, permissão e ownership na execução, considerando revogação/expiração concorrentes; a leitura prévia da página não autoriza o efeito. Mudança de privilégio deve rotacionar a sessão. A base ECMSG-24 não concede capacidade comercial; o catálogo agora adiciona autorização admin explícita.

As Actions são consumidas pelos formulários reais de cadastro/login/conta e pelo botão de logout. O login tem [proteção compartilhada contra abuso](#boundaries-e-requests-ecmsg-26); cada verificação Argon2 continua consumindo 64 MiB. A estratégia de sessão segue as [recomendações OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Autorização server-side (ECMSG-25)

Autenticação responde quem realizou a requisição; autorização decide se essa identidade pode executar uma operação sobre o recurso em seu estado atual. A política é deny by default: nenhuma sessão, rota, UI, hidden field ou role enviada pelo cliente concede acesso. Identidade própria usa ownership persistido; catálogo exige role admin atual. Não há ACL/RBAC genérica ou tabela universal de permissões.

O recurso de referência é a própria identidade existente. `readIdentityAction({ userId })` valida origem e delega a `readOwnIdentity`: contrato estrito UUID → `requireAuthenticatedIdentity()` → permissão de ler somente a própria identidade → query com ID solicitado, ID autenticado, join `sessions.userId = users.id`, hash do cookie e expiração absoluta/idle. O caller nunca fornece a identidade autenticada. Mesmo chamado diretamente, o módulo server aplica todos esses controles; a Action não depende de página protegida ou botão visível. O DTO autorizado contém somente `{ id, email }`.

Resultados internos distinguem `INVALID_INPUT`, `UNAUTHENTICATED`, `FORBIDDEN` e `NOT_FOUND`. Para esta leitura, a Action apresenta `FORBIDDEN` como `NOT_FOUND`, sem consultar ou revelar se o ID de outro usuário existe. Essa tradução é específica da operação, não regra global. Falhas operacionais continuam exceções controladas, sem SQL, token, hash ou causa bruta.

A query protegida revalida sessão e ownership no próprio snapshot PostgreSQL: revogar a sessão após o helper inicial, antes da query, impede o retorno. Uma revogação posterior não desfaz uma leitura já autorizada. Não há mutation de domínio nesta Task; futuras mutations devem incluir ownership/estado na própria instrução ou adotar transaction/lock quando o efeito exigir atomicidade, sem confiar em check anterior. Integração real demonstra A → A permitido, A → B negado ao trocar somente ID, tentativas de autoridade no payload rejeitadas e revogação entre check e query sem disclosure.

## Boundaries e requests (ECMSG-26)

Entradas de identidade: as cinco Actions abaixo, consumidas pela UI ou disponíveis como leitura autorizada. A Action administrativa do catálogo segue a mesma política de origem/body e exige autorização admin na operação. Carrinho e checkout também usam a mesma política; checkout aceita somente UUID de intenção e verifica sessão dentro da transação. Não há Route Handler ou Proxy/Middleware global. São boundaries públicas; validação/autorização não dependem da navegação.

| Action / caller | Entrada e validação | Identidade/autoridade | Custo, repetição e saída |
| --- | --- | --- | --- |
| `loginAction` / anônimo ou autenticado | Um argumento com `authenticationCredentialSchema` estrito; e-mail bruto até 320/canônico até 254, senha até 128 pontos de código/256 unidades UTF-16; rejeita argumentos extras | Valida credencial no servidor; caller não fornece hash, token ou role | Limites e slots compartilhados antes de Argon2; cada sucesso cria/rotaciona sessão; retorna sucesso, falha de credencial genérica ou limitação |
| `registerAction` / qualquer caller | Um argumento strict `credentialSchema`, mesma normalização e máximo, mínimo de criação de 15 pontos de código; rejeita campos/argumentos extras | Unicidade no banco, sem auto-login ou prova de posse do e-mail | Limite de duas tentativas/identificador/15 minutos e orçamento/slots compartilhados; hash mesmo em duplicidade; retorno mínimo equivalente |
| `changePasswordAction` / sessão válida | Um argumento strict com senha atual e nova, sem ID/autoridade e sem argumentos extras | Resolve identidade pela sessão; trava/revalida sessão e confirma credencial atual na transação | Três tentativas/conta/15 minutos e slots compartilhados; troca hash/revoga todas as sessões atomicamente, expira cookie; sucesso ou código controlado |
| `logoutAction` / qualquer caller | Zero argumentos; rejeita payload inesperado; somente cookie cujo token tem formato fixo é usado na query | Token é verificado pela correspondência do hash persistido, não pelo payload | DELETE indexado, idempotente e expiração do cookie; sem token válido não acessa DB; retorna sucesso ou `INVALID_INPUT` |
| `readIdentityAction` / sessão válida | Um argumento com `readIdentitySchema` estrito, somente UUID; rejeita campos/argumentos extras | Sessão atual, ownership e estado na query | Leituras indexadas; repetição só atualiza atividade na janela controlada; DTO `{ id, email }` ou código público mínimo |

Todas usam POST do framework, Origin/Host público e cookie SameSite conforme a [política CSRF](#autenticação-e-sessões-ecmsg-24). Não há token CSRF próprio, CORS como defesa ou confiança em headers forwarded do cliente. `next.config.ts` define `experimental.serverActions.bodySizeLimit = "16kb"`, cobrindo o body bruto, inclusive overhead multipart, antes da decodificação. É suficiente para os contratos atuais; nenhum aceita arquivo. Inputs/argumentos malformados falham antes de DB, hashing ou criação de sessão. No fluxo nativo de formulário de Next.js 16.3.8, excesso de body é rejeitado com erro sanitizado de produção e pode resultar em HTTP 500; não se presume que o transporte retorne 413.

### Abuso de login e custo

`login` aplica a política também na operação server, antes de lookup/hash. PostgreSQL mantém janelas fixas iniciadas na primeira tentativa: **cinco tentativas por e-mail canônico em 15 minutos** e **vinte tentativas globais por minuto**. Todo input válido consome o orçamento global, inclusive quando o limite por e-mail já foi atingido; tentativas admitidas incluem sucesso/falha e reserva sem slot disponível. Rejeições não prolongam a janela. Não há flag de conta bloqueada, bloqueio permanente nem reset por login bem-sucedido. Existência do usuário não participa da reserva, preservando equivalência externa.

`login_rate_limits` guarda somente chave `global` ou prefixo `email:`/`reg:`/`pwd:` + SHA-256 do identificador canônico, contador e timestamps. Não guarda senha, token, IP ou e-mail em texto puro; o digest é pseudônimo, não anonimização contra tentativa por dicionário. PK, formato da chave, contador positivo limitado a vinte, timestamps `NOT NULL` e janela válida são constraints; há índice de expiração. UPSERT condicional reserva global e identificador na mesma transaction, sempre nessa ordem, sem SELECT/incremento em memória. Janelas expiradas são reiniciadas atomicamente. Na primeira tentativa de cada janela global, a limpeza remove no máximo cem chaves expiradas; sem tráfego, não há timer nem novos registros.

A reserva termina antes do hashing, evitando manter locks de contador durante Argon2. Dois slots compartilhados no PostgreSQL usam `pg_try_advisory_xact_lock` no namespace privado `1195524428`; lookup/verificação usam a mesma transaction do slot. Se ambos estiverem ocupados, rejeita sem executar Argon2 e sem fila de hashing na aplicação. Locks são liberados ao encerrar a transaction; não há lease/token adicional. O limite de dois hashes implica até 128 MiB para a memória configurada do Argon2 nas entradas de login, além do overhead do processo/DB. Referências: [UPSERT Drizzle](https://orm.drizzle.team/docs/guides/upsert) e [locks transacionais PostgreSQL](https://www.postgresql.org/docs/current/functions-admin.html).

Quando orçamento ou slots se esgotam, a Action retorna `{ success: false, code: "RATE_LIMITED", message: "Não foi possível autenticar agora. Tente novamente mais tarde." }`, sem contador, chave, tempo interno ou informação de existência. É contrato de Action, não conversão própria para HTTP 429. Tentativas que alcançam autenticação continuam usando resposta genérica e hash sintético para usuário inexistente. Logout não precisa de idempotency key; leitura não cria efeito além da atividade limitada. Não foi criado mecanismo global de replay/idempotência.

Não há fonte confiável de IP definida neste deployment: `X-Forwarded-For` e `X-Real-IP` são ignorados. O orçamento global impede evasão apenas pela troca de e-mail, mas é compartilhado por usuários legítimos e atacantes; quem o consome pode causar indisponibilidade temporária do login. Também não limita volume de tráfego/queries baratas de logout/leitura. Antes de exposição pública, o deployment deve fornecer proteção de entrada por origem confiável, com proxy que substitui headers do cliente e backend inacessível diretamente. Não foram antecipados Redis, WAF, CAPTCHA ou parsing de cadeia de proxies.

Eventos de segurança usam allowlist: evento, operação, resultado geral, timestamp e UUID de correlação gerado no servidor. Registra chegada ao limite uma vez por limiar/janela e falha operacional; não loga cada tentativa bloqueada. Não registra payload, e-mail/digest, contador, IP, senha, hash, cookie, token ou erro/cause bruto. Logs são server-side e não integram respostas públicas.

## Tratamento de erros e observabilidade (ECMSG-17)

### Estado e classificação

Há erros controlados de configuração e autenticação/sessão, eventos mínimos de segurança do login e nenhum Route Handler. As Actions propagam falhas operacionais sem valores de input, hashes, tokens ou causas originais; rejeições de credencial têm resultado público mínimo. Configuração inválida é falha operacional, não input inválido do usuário: a boundary não deve traduzi-la em erro de credencial ou mostrar seu nome interno ao Client.

| Classe | Significado | Tratamento |
| --- | --- | --- |
| Esperado | Resultado conhecido da operação: input inválido, ausência legítima de recurso, autenticação necessária, autorização negada, conflito ou regra de negócio rejeitada | Resultado explícito definido pela feature, com código estável e dados mínimos; a boundary projeta mensagem externa controlada |
| Inesperado | Bug, falha desconhecida de DB/infraestrutura/integração ou configuração indisponível | Exceção interna; Actions preservam propagação ao Next.js, handlers podem produzir HTTP 500 controlado; observabilidade server-side no ponto apropriado |

A classificação depende da operação, não apenas do tipo da exceção ou de um status de serviço externo. Não crie hierarquia de classes nem catálogo global de códigos hipotéticos. Códigos de negócio e contratos de resultado surgem na feature que os consome e não conhecem HTTP, `Response`, `NextResponse` ou UI.

```text
Client → boundary pública → feature/server → infraestrutura
Esperado:   feature/server → resultado conhecido → boundary → resposta controlada
Inesperado (Action):  infra/feature → throw → Next.js error handling → boundary/digest + observabilidade server-side
Inesperado (Handler): infra/feature → exceção → boundary HTTP → 500 genérico + observabilidade server-side
```

### Tradução nas boundaries

**Server Actions:** falhas esperadas retornam resultado discriminado mínimo, por exemplo `{ success: false, error: { code: "INVALID_QUANTITY", message: "Quantidade inválida." } }`, somente quando esse caso real existir. Falhas inesperadas permanecem exceções (`throw`) e seguem para o tratamento de erros do Next.js, preservando error boundary e digest, e `instrumentation.onRequestError` quando aplicável. Não capture genericamente para convertê-las em retorno normal `{ success: false, ... }`. A UI de erro usa mensagem controlada; nunca retorne `error.message` bruto ou serialize o objeto interno. Em produção, a sanitização do framework protege os detalhes encaminhados ao Client, conforme os limites documentados abaixo. Não transforme falha em sucesso nem sugira que uma operação foi revertida sem evidência. Em mutations com resultado incerto, a UX de retry depende da segurança/idempotência da operação.

**Route Handlers:** a tradução para status é exclusiva da boundary HTTP. Use 400 para input inválido, 401 para autenticação necessária, 403 para autorização negada, 404 para ausência legítima, 409 para conflito, 429 quando houver rate limit real e 500 para falha inesperada. Diferentemente de Actions, handlers podem capturar falhas inesperadas para produzir HTTP 500 com corpo genérico e observabilidade server-side explícita no ponto apropriado; uma falha capturada e convertida em resposta não deve depender de `onRequestError` para ser observada. Respostas continuam mínimas e controladas; `error.tsx` não trata erros do handler. Não envie SQL, stack, cause, códigos/objetos brutos de bibliotecas ou detalhes de infraestrutura em JSON.

**Server Components:** resultados conhecidos permitem composição de UI segura; ausência legítima pode usar `notFound()`. Falhas inesperadas são observadas no ponto server que conhece a operação e seguem para a boundary de renderização adequada. Não capture indiscriminadamente todo render para transformar erro em 404 ou coleção vazia. Se houver tradução antes do render, preserve a indicação de falha sem copiar detalhes internos para props.

Capture somente a operação que precisa de tratamento. `redirect()` e `notFound()` lançam exceções de controle do Next.js: mantenha essas chamadas fora do `try/catch` de falhas operacionais e não as registre como bugs. Não implemente um wrapper genérico que capture toda Action/render/handler. A documentação instalada confirma o comportamento de controle de `redirect()` e a interrupção do segmento por `notFound()`.

**DB e integrações:** não traduza globalmente códigos PostgreSQL para erro de negócio. Uma unique violation só vira um resultado esperado quando a feature identificar a constraint e sua semântica, sem revelar o nome interno da constraint. Outros erros propagam internamente até o responsável pela boundary; não faça logging duplicado em cada camada. O fluxo DB/DTO da ECMSG-16 permanece intacto.

**Validação e autenticação:** quando Zod for usado, projete somente campos e mensagens necessários ao formulário; não serialize `ZodError`, payload recebido ou paths internos automaticamente. Mantenha unauthenticated e forbidden distintos internamente. Se a threat model exigir impedir enumeração, a boundary pode apresentar um recurso de outro usuário como inexistente, com resposta consistente; essa decisão é específica da operação, não regra para esconder toda falha.

### Logging server-side mínimo

A feature auth compartilha um logger server-only por allowlist conforme a [trilha mínima de segurança](#trilha-mínima-de-segurança-ecmsg-29). Registra limiares do login e falhas operacionais de sessão/leitura. Não adicione logs à criação lazy do pool nem ao validador apenas para produzir eventos. Actions de autenticação/sessão preservam propagação das exceções controladas ao Next.js; não há histórico/auditoria completa de login.

Use `error` como `unknown` ao capturar. Não espalhe suas propriedades, nem serialize `message`, `cause`, `detail`, SQL ou parâmetros; até `name` pode ser arbitrário. Se registrar tipo/nome, mapeie tipos reconhecidos para nomes controlados, com fallback neutro. Nunca faça `console.error(error)`/`String(error)` como alternativa quando a classificação falhar. Campos de contexto também são allowlist, não um objeto arbitrário aceito por conveniência.

Falhas esperadas comuns não precisam de `error` logs. Use `warn` somente quando houver evento operacional/de segurança concreto a investigar, e `info` para evento útil definido pela operação, sem ruído de toda leitura. Observe a falha inesperada no ponto apropriado, evitando logs duplicados por camada ou por Action. Quando existir instrumentação central, `onRequestError` poderá observar as exceções server capturadas pelo Next.js; não as engula para evitar propagação. Se uma operação precisar adicionar contexto antes de propagar, use somente campos seguros e preserve a exceção, sem logging bruto nem conversão em resultado esperado. Múltiplos eventos precisam representar etapas distintas. Logging não deve substituir o fluxo de erro nem iniciar efeitos de domínio.

Em produção, mantenha contexto operacional e categoria mesmo sem stack. Em desenvolvimento, detalhes técnicos/stack só são admissíveis após revisão explícita e sanitização; stack de biblioteca pode conter SQL, valores, URLs e caminhos. Não libere dumps automaticamente por `NODE_ENV`. Não envie stack ao Client. Logs nativos do framework/driver são outra superfície a revisar no deployment; a política da aplicação não promete sanitizar automaticamente logs emitidos por terceiros.

### Secrets, PII e correlação

Nunca registre senha/hash, cookies de sessão, tokens, Authorization/CSRF, `DATABASE_URL`, secrets/connection strings, cartão ou informação sensível de pagamento. Não serialize `Request`, todos os headers, `process.env`, payload de autenticação ou entidade completa de usuário. Não registre URL completa, query string ou input do usuário como nome de operação. Allowlist é o padrão; uma blacklist de palavras não garante sanitização.

Nome, email, endereço e telefone ficam fora dos logs por padrão. Identificadores como `userId`/`orderId` também podem identificar pessoas: registre-os apenas com necessidade operacional concreta, valor validado e mínimo. A futura configuração de armazenamento deve definir acesso e retenção; não crie infraestrutura externa agora.

Quando houver contexto útil, `requestId`/`operationId` pode ser gerado no servidor ou validado na entrada (formato e comprimento delimitados). Nunca reflita header arbitrário, use identificador como autorização ou trate correlação como prova de identidade. A boundary pode enviar uma referência opaca de suporte se o mesmo identificador estiver associado ao evento server. O `digest` nativo do Next.js é correlação de erro, não autorização, dado de negócio, request ID ou garantia de unicidade por operação. Sem workflows atuais, não implemente IDs globais, middleware, AsyncLocalStorage ou tracing distribuído.

### Boundaries de UI e instrumentação do Next.js 16.3.8

| Recurso | Quando usar e limite |
| --- | --- |
| `error.tsx` | Quando um segmento precisar de fallback/recuperação de render. É Client, recebe `error` e `retry`; não captura o layout/template do mesmo segmento, nem substitui tratamento de Actions/handlers |
| `global-error.tsx` | Quando houver UX definida para falha do root layout/template. É Client e fornece seu próprio `html`/`body`; não depende do layout quebrado |
| `not-found.tsx` / `notFound()` | UI de ausência legítima. Falha de DB não é ausência. Streaming pode resultar em status 200 com UI de not-found; não use essa UI para definir status de uma API |
| `instrumentation.ts` | `register` roda na inicialização; `onRequestError` observa erros server capturados pelo Next.js. Introduzir somente com necessidade real e seleção explícita de campos, sem copiar request/headers/error bruto dos exemplos genéricos |

Na documentação instalada, erros server encaminhados às boundaries client têm mensagem genérica/digest em produção; desenvolvimento expõe mais detalhes para debugging. Não use isso como garantia para retornos explícitos de Actions/handlers nem renderize `error.message` como política de UX. Ambiente de desenvolvimento não deve receber dados/credenciais de produção nem ficar exposto publicamente. Erros originados no Client podem manter sua mensagem original. Boundaries de render não capturam normalmente event handlers ou async fora do render; os consumidores tratam esses resultados explicitamente.

O guia desta versão usa `retry()` para recuperar e buscar novamente o segmento; `reset()` permanece para limpar estado sem refetch quando houver razão concreta. Arquivos de erro de UI exigem design ou operação que os justifique. Não copie exemplos locais com logging bruto de Error para o projeto.

Não adicione OpenTelemetry, Sentry, Datadog, collectors, métricas de negócio ou SaaS nesta Task. Avalie coleta externa quando houver deployment e requisitos reais, revisando campos, acesso, retenção e duplicação de eventos antes da integração.

### Critérios para a primeira operação real

Verifique resultado esperado com mensagem/campos públicos controlados; falha inesperada de DB/integração em Action propagada ao Next.js, preservando boundary/digest e observabilidade quando aplicável; falha inesperada em handler com HTTP 500 genérico e evento server contextualizado; ausência de secrets/PII mesmo em objetos de erro com `cause`/propriedades extras; sem conversão de falha interna em 404; exceções de navegação preservadas. Quando houver correlação, teste validação e associação entre log/resposta. Esses testes pertencem ao consumidor que tornar o fluxo concreto, sem endpoints fictícios para demonstrá-lo.

Referências locais consultadas: `01-app/01-getting-started/10-error-handling.md`, `05-server-and-client-components.md`, `15-route-handlers.md`, `01-app/02-guides/server-actions.md` e `01-app/03-api-reference/03-file-conventions/{error,not-found,instrumentation}.md`, sob `node_modules/next/dist/docs/`.

## Baseline de segurança HTTP (ECMSG-18)

Headers estáticos são definidos uma única vez em `next.config.ts`, por `headers()` com `/:path*`, sem Proxy/Middleware. A baseline é igual em development e production; não há permissões relaxadas para desenvolvimento. Não há handlers ou integrações browser externas; as propriedades do cookie de sessão estão na [decisão de autenticação](#autenticação-e-sessões-ecmsg-24). Deployments/CDNs devem preservar esses headers e evitar políticas conflitantes; static export precisaria de configuração equivalente na plataforma, pois não executa `headers()` no servidor Next.js.

| Header / configuração | Valor / decisão | Motivo e limite |
| --- | --- | --- |
| `Content-Security-Policy` | `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self'; font-src 'self'; media-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'self'` | Bloqueia plugins/objects, base externa, submissão de formulário cross-origin e qualquer framing, inclusive same-origin; restringe imagens, fontes e manifests à própria origem e bloqueia mídia, frames e workers |
| `X-Content-Type-Options` | `nosniff` | Respeita Content-Type e impede execução de script/style com MIME incompatível; assets devem continuar com MIME correto |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Mesmo site conserva URL; HTTPS externo recebe somente origin, e downgrade HTTPS→HTTP não envia referrer. Dados sensíveis não devem aparecer em URLs, inclusive internas |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=()` | Nega capacidades sem consumidor: captura de mídia, localização, Payment Request API, WebUSB e fullscreen. Pagamento simulado não requer Payment Request; revisar antes de introduzir consumidor legítimo |
| `poweredByHeader` | `false` | Remove `X-Powered-By: Next.js`; reduz identificação desnecessária sem prometer ocultar tecnologia ou substituir controles reais |

Permissions Policy tem suporte variável por navegador/directive: browsers sem suporte não recebem garantia equivalente. A lista é curta e baseada nas capacidades avaliadas, sem directives antigas indiscriminadas.

### CSP parcial e framing

`frame-ancestors 'none'` é o mecanismo moderno de clickjacking; não há requisito de embutir Guardian Bay em iframes. `X-Frame-Options` não é duplicado: a baseline assume navegadores modernos com CSP, sem requisito atual de compatibilidade legada. Avalie `DENY` adicional somente se suporte a browsers antigos se tornar requisito. `frame-ancestors` controla quem embute a aplicação, não quais iframes ela pode carregar.

Não há `default-src`, `script-src`, `style-src` ou `connect-src` nesta CSP parcial: scripts, estilos e conexões continuam sem restrição CSP explícita. `img-src`, `font-src` e `manifest-src` permitem somente `'self'`; `media-src`, `frame-src` e `worker-src` usam `'none'`. A CSP continua parcial e não representa proteção completa contra XSS. A aplicação usa scripts inline de React/Next para hidratação/RSC e CSS Tailwind; assets SVG estão em `public`. Geist via `next/font/google` é baixada no build e servida localmente pelo Next.js, sem exigir Google Fonts no navegador.

Uma CSP rígida para scripts precisa avaliar nonce/hash com as páginas reais. O guia instalado informa que nonce por request exige Proxy e rendering dinâmico, com impactos em cache/ISR/PPR. Hash/SRI requer avaliar suporte e os scripts inline, não apenas os arquivos externos; suporte experimental não justifica trocar o bundler nesta Task. Não introduza `script-src 'unsafe-inline'`, `'unsafe-eval'`, `*`, origens amplas ou nonce fixo para contornar isso. Não inclua automaticamente `data:`, `blob:` ou `https:` em categorias sem consumidor.

A baseline não restringe HMR/WebSocket nem scripts/styles, portanto não precisa adicionar exceções de desenvolvimento que enfraqueçam produção. CSP rígida deve ser reavaliada ao introduzir conteúdo não confiável, com testes de hidratação, fontes, imagens, estilos, scripts e HMR. Não há Report-Only nem endpoint de reports sem objetivo/consumidor. A CSP atual reduz superfícies específicas; escaping e tratamento seguro de conteúdo continuam obrigatórios.

### HTTPS e HSTS

Não se emite `Strict-Transport-Security` na configuração atual: `NODE_ENV=production` não prova que o deployment atende HTTPS. O ambiente local é HTTP e não há domínio/terminação TLS definidos. Quando deployment HTTPS existir, aplique HSTS no ponto que conhece a conexão TLS (plataforma/reverse proxy), verifique ausência de duplicação e aumente `max-age` conforme validação operacional. Não confie indiscriminadamente em `X-Forwarded-Proto` enviado por qualquer origem. `includeSubDomains` exige controle de todos os subdomínios e `preload` exige compromisso operacional explícito; nenhum é habilitado agora. Também não aplique `upgrade-insecure-requests` em HTTP local sem contexto HTTPS.

### CORS, mutations, cookies e cache

O projeto é full stack same-origin. Não há headers CORS globais nem `Access-Control-Allow-Origin: *`; a ausência de CORS evita autorização de leitura cross-origin pelo browser, mas não é autenticação nem impede requests/CSRF. Um futuro handler consumido externamente deve definir origens, métodos, headers, credenciais e `Vary: Origin` quando necessário ao seu caso, sem permitir origins arbitrárias ou usar wildcard em operações sensíveis. As proteções próprias de Origin/Host das Server Actions continuam válidas; não crie middleware CORS para elas.

Headers não resolvem sozinhos CSRF em mutations com cookies. As Actions usam a [política de Origin e cookie](#autenticação-e-sessões-ecmsg-24); novas Actions/handlers devem avaliar os controles conforme sua surface.

Não há `Cache-Control: no-store` global. Preserve cache e otimizações do Next.js para conteúdo público; dados sensíveis futuros definem caching no responsável pela leitura/resposta, incluindo caches de servidor/CDN. Headers não substituem autorização.

### Headers deliberadamente ausentes e validação

Não adicione `X-XSS-Protection` (filtro obsoleto que pode ser contraproducente), `Public-Key-Pins` (HPKP removido dos browsers modernos, com risco de indisponibilidade) ou `Expect-CT` (obsoleto com enforcement de CT nos navegadores). Não configure headers de isolamento como COOP/COEP sem consumidor real, pois podem alterar integrações e navegação. A plataforma pode emitir `Server`/outros identificadores fora do controle de `poweredByHeader`; reavalie no deployment.

Valide respostas reais da página, assets e 404 após iniciar dev/produção: confirme CSP, nosniff, Referrer-Policy, Permissions-Policy, ausência de HSTS no HTTP local, de CORS global e de X-Powered-By. No navegador, confira ausência de violações inesperadas, recursos carregados e HMR; uma tentativa deliberada de framing deve falhar. Logs de teste dessa tentativa podem conter a violação esperada, sem relaxar a política.

Referências: guias instalados `headers`, `poweredByHeader`, `content-security-policy`, Server/Client Components, Route Handlers e deploying sob `node_modules/next/dist/docs/`; MDN [CSP/frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), [nosniff](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options), [Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy), [Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy) e [HSTS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security), consultados no conteúdo oficial atual.

## Testes (ECMSG-19)

Vitest 4.1.11 é o runner único: executa TypeScript/ES modules rapidamente em Node e pode evoluir para testes de componentes sem outro runner. `vitest.config.mts` mantém ambiente `node`, imports explícitos de APIs de teste e o alias existente `@/ → src/`. Não altera `strict`/`noEmit` do TypeScript nem configura DOM, cobertura ou snapshots. Para executar testes e `check`, use Node 20.19+ da linha 20, 22.12+ da linha 22 ou 24+; o mínimo do runtime Next.js permanece 20.9. Dependências e lockfile fixam a versão utilizada.

| Tipo | Onde / quando | Garantia e dependências |
| --- | --- | --- |
| Unitário | `*.test.ts` / `*.test.tsx` junto do módulo/feature | Regras puras, validação, cálculos/dinheiro e projeção de DTO; sem rede, DB, credenciais ou estado externo |
| Integração | `*.integration.test.ts` junto da operação quando existir | PostgreSQL real compatível para Drizzle, constraints, transactions e concorrência; não simular SQL para afirmar integridade |
| Componente | `*.test.tsx` junto do primeiro Client Component relevante | Comportamento observável: interação, formulário, estados, feedback e acessibilidade; adicionar Testing Library/ambiente DOM somente com consumidor |
| E2E | `*.e2e.test.ts` junto do fluxo quando existir | Playwright pode validar fluxos críticos completos e segurança; instalar runner/browsers/configuração somente com fluxo real |

Não misture `.spec` e `.test`, não crie diretórios vazios ou helpers/factories globais preventivos. Testes da feature seguem seu dono; promover helpers exige reutilização concreta. Testes de async Server Components e integrações reais do framework devem usar o ambiente adequado (integração/E2E), sem assumir que Vitest em Node reproduz o runtime Next.js ou verifica `server-only`.

`npm test` executa `vitest run` sem interação, e `npm run test:watch` acompanha alterações. `npm run check` inclui lint, typecheck e unitários rápidos/determinísticos. A configuração exclui explicitamente `*.integration.test.*` e `*.e2e.test.*`; integração tem comando/configuração próprios, sem tornar `check` dependente de PostgreSQL. Não aceite execução com zero testes como validação; não há opção para ignorar ausência de testes.

O primeiro arquivo é `src/lib/env/database-url.test.ts`: testa ausência/vazio/espaços, formato/protocolo/host/database/porta inválidos, URLs válidas e erros sem credenciais, host ou causa original. Usa somente fixtures fictícias passadas à função pura, sem ler ambiente nem importar DB. Casos de rejeição falham se a validação correspondente for removida; o teste de information disclosure falha se o valor bruto entrar no erro.

Mocks são permitidos em boundaries de integrações externas quando necessários, sem mockar a regra sob teste. Unitários puros não precisam de mocks. Não mocke Drizzle inteiro para afirmar que query/constraint/autorização funciona. `npm run test:integration`, com `vitest.integration.config.mts`, exige `TEST_DATABASE_URL` explícita, PostgreSQL local e banco `guardian_bay_test`; rejeita a mesma identificação de banco da configuração normal. Aplica migrations versionadas com o migrator Drizzle, cria fixtures com UUID e limpa somente essas fixtures, sem DROP/TRUNCATE. PostgreSQL e Argon2 são reais; headers/cookies de request são simulados para testar Actions. Isso não substitui validação HTTP real do Next.js para cookies/CSRF.

Segurança entra nos testes normais junto da surface real: validação server-side; usuário A sem acesso/modificação ao recurso de B (IDOR/BOLA); preço/estoque/totais determinados pelo servidor; sessão ausente/inválida; estratégia CSRF; erros externos sem SQL, stack, secrets/connection string ou detalhes internos. Operações críticas devem testar concorrência quando houver risco, como duas compras do último item. Headers HTTP e recursos são testados contra o build real por `test:security`; o subteste Chromium configurável verifica enforcement e runtime.

Não use secrets, tokens/sessões ou PII reais nem produção nos testes; fixtures de autenticação são sintéticas e isoladas. Preserve `.env*` ignorado com única exceção `.env.example`; integração exige configuração explícita, sem reutilizar implicitamente a conexão normal. Evite rede, relógio real, ordem de execução e estado global em unitários; controle aleatoriedade/tempo somente quando necessário. Priorize casos relevantes, sem percentual arbitrário de cobertura ou dependências extras para números. React Testing Library, jsdom, Playwright, MSW, coverage e CI ficam para consumidores concretos.

Referência: [guia do Vitest](https://vitest.dev/guide/). Os requisitos npm das versões instaladas definem a compatibilidade de Node.js.

## Quality gates (ECMSG-20)

| Momento / risco | Gate obrigatório | Ambiente e finalidade |
| --- | --- | --- |
| Durante desenvolvimento | `npm run check` + `git diff --check` (não staged) + `git diff --cached --check` (staged) | Gate rápido: Biome sem autofix → typecheck → unitários. Com dependências já instaladas, não exige serviços externos |
| Antes de merge da branch da Epic | `npm run verify` + `git diff --check origin/main...HEAD` | Valida produção e o patch acumulado desde o merge-base com a base atualizada, com todas as mudanças commitadas |
| Mudanças relevantes de runtime, configuração ou dependências durante desenvolvimento | `npm run verify` + checks de diff de desenvolvimento | Build de produção e revisão do patch em elaboração |
| Limites de confiança / operação sensível | Revisão `security-review` | Validação server-side, autenticação/autorização, ownership/IDOR, preço/estoque/totais, DTOs, erros, logs e secrets conforme a surface afetada |
| Localização/dependências internas ou UI alterada | Revisão `architecture` / `frontend-patterns` pertinente | Respeita precedência do AGENTS.md; exemplos genéricos não autorizam mudanças incompatíveis |
| Dependência ou superfície Next.js de risco alterada; antes de deployment quando pertinente | Auditoria complementar `nextjs-security-scan` / `npm audit` | Findings exigem triagem contextual; acesso ao registry e dados de advisories podem variar, portanto não integram automaticamente check/verify |
| Persistência, fluxo crítico ou schema futuro | Integração/E2E/revisão de migration pertinentes quando existirem | Gates separados; autenticação já usa PostgreSQL dedicado e harness HTTP em `test:security` |

`check` executa `lint → typecheck → unitários` e para na primeira falha. `verify` só executa build se check passar e preserva o exit code de falha. Os checks de diff detectam erros de whitespace e marcadores de conflito introduzidos no patch; não validam semântica ou secrets. `git diff --check` isolado não verifica commits. Antes de merge, atualize a referência `origin/main` e use `git diff --check origin/main...HEAD`; o intervalo de três pontos compara o merge-base com `HEAD`.

Biome continua sendo o único linter/formatter. `npm run format` é ação explícita que modifica arquivos, nunca gate; não execute autofix para fabricar resultado verde. Typecheck mantém `strict`/`noEmit` e gera somente tipos/artefatos ignorados necessários (`next typegen`, tsbuildinfo), sem build de produção. Build não ignora erros via `ignoreBuildErrors` ou configuração equivalente.

### Limites do build e dos testes

O build detecta integração/compilação de produção que lint, tipos e unitários não cobrem. Os requisitos do ambiente de compilação estão no [README](../../README.md#comandos-e-quality-gates).

A separação de testes é a da ECMSG-19: unitários entram em check; componentes poderão entrar se rápidos/determinísticos e independentes de infraestrutura; integração e E2E permanecem em comandos/configurações próprios. Falhas, skipped e zero testes não são equivalentes a sucesso de cobertura da mudança. Gate atual não precisa de `DATABASE_URL`: a conexão é lazy e as rotas dependentes de sessão são renderizadas por request, sem executar consultas durante o build.

Mudanças de identidade, autenticação, sessão ou autorização persistida exigem `npm run test:integration` com PostgreSQL real isolado, além dos gates gerais. Mudanças de schema exigem migrations versionadas, geração/revisão consistente e análise explícita de alterações destrutivas; valide aplicação do zero em banco vazio dedicado. Fluxos críticos exigem E2E pertinente, e cookies/CSRF devem ser inspecionados com aplicação iniciada quando afetados. Não instalar banco ou browsers apenas para materializar gates vazios.

### Segurança e dependências

[`security-review`](../../.agents/skills/security-review/SKILL.md) é a revisão contextual do Guardian Bay. [`nextjs-security-scan`](../../.agents/skills/nextjs-security-scan/SKILL.md), já versionada, complementa a detecção; não comprova ausência de vulnerabilidades ou substitui análise de autorização/boundaries. Precedência: AGENTS.md → arquitetura → regras específicas de segurança → recomendações genéricas. Valide recomendações Next.js contra a documentação instalada 16.3.8, não exemplos de outras versões.

Não trate saída ou severidade sugerida pelo scanner como decisão automática de bloqueio. Analise evidência, severidade, pacote/arquivo afetado, produção vs tooling de desenvolvimento, reachability/exploitability, patch e impacto da correção. Ferramentas dev também podem ser exploráveis em build, workstation ou CI; devDependency não é dispensa automática. Um finding crítico explorável em código utilizado, exposição de secrets ou quebra comprovada de autorização bloqueia a mudança. Riscos relevantes sem mitigação aceitável também bloqueiam; ausência de análise não é justificativa de aprovação.

`npm audit` é diagnóstico dependente de registry/advisories, não hard gate automático para qualquer finding ou status não zero. Classifique falha de conectividade separadamente de finding e registre triagem: caminho afetado, impacto, decisão e ação. Finding transitivo comprovadamente sem caminho explorável pode originar Task de análise/correção com justificativa registrada; não atualizar dependências fora da Task para obter green gate. Não execute `npm audit fix`, upgrades ou correções do scanner automaticamente.

Qualquer secret versionado é grave e bloqueia: `.env` real, token/API key, connection string, cookie/sessão ou chave privada. Preserve `.env*` ignorado com única exceção `.env.example`, revise arquivos rastreados/staged e o diff, incluindo novos arquivos. Ignore não protege arquivos já rastreados nem substitui inspeção; scanner pode perder secrets e produzir falsos positivos. Não copie valores em relatórios/logs. Se houver exposição real, contenha/remova e revogue/rotacione pela via segura conforme o incidente, não apenas silencie o finding.

### Falhas, revisão e automação futura

Gate obrigatório falhou ou não foi executado → não mergear. Corrija somente problemas em escopo; problemas externos devem ser relatados como **Problema → impacto → bloqueia ou não**, com Task separada quando apropriado. Não desative assertions, testes ou proteção de runtime para passar. Skills/revisões não são automatizadas cegamente nem garantias de scanners; registre verificações aplicáveis, resultados e limitações no review.

Não há pipeline de CI ou hooks Git configurados. Quando introduzidos, devem executar os gates desta política, instalar dependências pelo lockfile e preservar exit codes.

### Enforcement arquitetural existente

Biome é o formatter, linter principal e mecanismo preferido para enforcement de boundaries quando possível. A configuração atual não impõe o mapa arquitetural; os imports e a fronteira Server × Client são verificados em revisão.

## Modelo de estoque (ECMSG-79–91)

Contrato implementado na Epic 7: `inventory` possui productId PK/FK RESTRICT, availableQuantity inteiro entre 0 e 2147483647 e revision inteira positiva. Produto existente recebe zero por migration; produto novo recebe zero na mesma transação. Linha ausente falha fechado. Publicação é editorial e independente de estoque: publicado sem estoque continua no catálogo.

Carrinho é intenção, não reserva. Redução de estoque não altera nem remove itens; publicação e suficiência têm indicadores distintos. Total informacional considera apenas itens publicados com quantidade suficiente; checkout recalcula. Qualquer item insuficiente rejeita o checkout inteiro com OUT_OF_STOCK, sem pedido/consumo/limpeza. PAYMENT_FAILED mantém pedido histórico, estoque e carrinho; somente PAID consome estoque, na mesma transação do snapshot/pagamento/limpeza seletiva. Retry da mesma intenção retorna pedido existente antes de tocar estoque. Pedido já guarda quantity comprada; não ganha snapshot adicional de estoque.

Locks seguem usuário → sessão → itens → produtos ordenados por UUID → inventory ordenado por productId. Checkout usa UPDATE lock e decremento condicionado à quantidade disponível; sessão é revalidada após esperas. Administração define quantidade absoluta com role atual, mesma origem, contrato estrito e revisão otimista; consumo pago também incrementa revision. Revisão saturada deve falhar de modo controlado, nunca sofrer overflow. Não há reserva, ledger, depósitos, logística ou reposição automática.

ECMSG-83: carrinho distingue publicação (`available`) de `stockSufficient`, mantém item insuficiente e não o soma ao total informacional; add valida quantidade resultante, update valida valor absoluto, sem reserva.

## Revisão da Epic 7 (ECMSG-91)

Base `epic-6-checkout-e-pedidos` em `0005d7a`; treze Tasks sequenciais ECMSG-79–91, sem squash. `inventory` separa quantidade de preço/publicação. Migration 0011 cria PK/FK RESTRICT/CHECKs e backfill zero; criação administrativa insere produto + inventory na mesma transação. Nenhuma dependência nova. Leitura pública projeta apenas inStock, carrinho projeta quantidade/suficiência, e quantidade/revisão administrativa ficam restritas ao admin atual. Ausência de linha é indisponibilidade, nunca estoque infinito; reads não usam cache persistente compartilhado.

Locks comerciais: usuário → sessão → itens → produtos ordenados → inventory ordenado. Checkout revalida sessão após espera, rejeita qualquer insuficiência sem pedido parcial, e PAID decrementa por UPDATE condicionado com revisão incrementada antes do commit de pedido/snapshot/limpeza. PAYMENT_FAILED mantém estoque/carrinho. Retry encontra pedido existente antes de tocar estoque. Administração absoluta usa produto → inventory e revisão otimista, impedindo sobrescrever consumo observado depois do render. Revisão no limite integer gera CONFLICT/rollback, não overflow. Revogação serializa com a autorização; não cancela efeitos já autorizados/commitados antes de uma revogação posterior.

Evidências: 106 unitários, 146 testes PostgreSQL 18 e 10 HTTP/Chromium sem skips. Cobrem última unidade entre dois usuários, 3 unidades com dois pedidos de 2, produtos em ordem invertida, pagamento recusado concorrente, retry, admin × admin e ambos os vencedores de admin × checkout, expiração durante inventory lock e rollback. Sete mutantes temporários foram detectados por assertions (check de estoque, decremento, condição defensiva, idempotência, revisão, admin e ownership), restaurados antes dos gates. O teste defensivo usa trigger temporário exclusivamente no banco isolado e o remove em finally; não há trigger/hook operacional no produto.

Migrations do zero e upgrade desde Epic 6 preservam produto existente com quantity zero; colunas, constraints e índices coincidem, journal/snapshots são consistentes e Drizzle não detecta drift. Gates check, integração, security e verify, junto dos checks de diff acumulado, são obrigatórios. PostgreSQL 18 reproduz a assertion RESTRICT herdada; PostgreSQL 17 mantém a restrição mas retorna SQLSTATE diferente, pendência já documentada.

Audit de produção sem findings; audit completo mantém quatro moderados de tooling Drizzle Kit/esm-loader/core-utils/esbuild 0.18.20, relativos a serve. Scripts usam transform/transformSync; triagem sem consumidor serve confirmado no caminho atual. Não há audit fix nem upgrades automáticos. Scan complementar foi triado manualmente: 27 alertas de secrets são fixtures/atributos/exemplos sintéticos; 494 alertas SQL são templates parametrizados, e recomendação genérica de allowedOrigins não substitui same-origin. Security-review revisa contratos, guards, DTOs, locks e logs; scanner não comprova autorização.

Limites preservados: CSP parcial, bearer roubado, e-mail não verificado, proteção volumétrica/HTTPS/deployment, logs best effort e limpeza de sessões. Reservas, ledger, logística, gateway/pagamento real e guest checkout permanecem ausentes. Chromium usa wrapper local em perfil isolado de teste conforme a nota operacional anterior, sem alteração de política da aplicação.

## Backoffice: escopo aprovado (ECMSG-92)

A Epic 8 consolidará `/admin` (visão geral), `/admin/catalog` (catálogo e estoque) e `/admin/orders` (listagem e detalhe). O shell será Server-first; `/admin → feature/server → db` compõe capacidades existentes, sem regras comerciais paralelas. Auth decide sessão/role atual, Catalog preço/publicação, Inventory quantidade/revisão e Orders snapshot/status. Layout pode negar acesso cedo para UX, mas cada leitura/mutation privilegiada exige admin atual no servidor, sem cache compartilhado de autorização.

Pedidos administrativos serão inicialmente read-only, com DTO mínimo de identificação do pedido, data, estado, total e itens snapshot no detalhe; não há necessidade de identidade do comprador. A ECMSG-99 revisará explicitamente a necessidade de mutations. Catálogo/estoque reutilizam Actions existentes, contratos estritos, mesma origem e revisão esperada. UI prevê loading, vazio, erro controlado, acesso negado/not found, pending, sucesso e conflito que exige recarregar, nunca retry cego. Confirmação de operação sensível é somente UX. Gestão de usuários, recuperação de terceiros, refund, logística, analytics e RBAC granular permanecem fora do escopo. Estes são requisitos da Epic, não controles já implementados.

### Política administrativa de pedidos (ECMSG-99)

Pedidos no backoffice são read-only. O pagamento acadêmico é síncrono e resolve PENDING_PAYMENT para PAID/PAYMENT_FAILED dentro da transação; não há estado operacional que justifique intervenção administrativa. Não existem Actions para mark-paid, cancel, refund, reprocessamento, delete ou edição de snapshot/itens/totais. A única Action de Orders continua sendo a confirmação de checkout do próprio usuário. Admin consulta snapshot persistido, sem reconstruí-lo pelo catálogo atual; DTO não inclui comprador ou checkoutKey. Mudança futura exige requisito de domínio e revisão específica, não status arbitrário vindo do browser.
