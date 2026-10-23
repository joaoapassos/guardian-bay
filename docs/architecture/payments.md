# Epic 11 — pagamentos exclusivamente simulados

Contrato aprovado para implementação sequencial. Substitui o contrato síncrono da Epic 6 apenas para os novos métodos explícitos. Pedidos históricos não recebem método inventado.

## Fronteiras e dados

`features/orders` é responsável por cartões fictícios, checkout e pagamentos; `app` compõe páginas. Actions finas fazem same-origin; implementação server-only autentica e valida ownership novamente. DB guarda schemas físicos; lib mantém dinheiro, auditoria e budgets transversais. Não há gateway, banco externo, webhook, fila ou scheduler.

Cartões aceitam exclusivamente fixtures versionadas exibidas na UI. Número completo e CVV existem apenas transitoriamente no formulário e são convertidos localmente em fixtureId; servidor aceita fixtureId e validade fictícia, nunca PAN/CVV/titular. Titular é fictício, validado para UX e descartado. Nenhum PAN, CVV ou hash desses campos é persistido, logado ou retornado. Não é possível impedir um cliente malicioso de enviar bytes arbitrários; contratos estritos rejeitam esses campos sem ecoar o payload.

`saved_test_cards`: UUID, usuário, fixtureId, bandeira/last4 derivados, validade e criação; UNIQUE(userId, fixtureId), limite de três fixtures por usuário. Remoção real não apaga histórico. `order_payments`: um registro por pedido, método CARD/PIX/BOLETO, estado PENDING/APPROVED/DECLINED/EXPIRED, referência UUID fictícia, regra v1, horários de criação/elegibilidade/expiração/conclusão e máscara opcional. Não duplica total: usa snapshot orders.totalAmount/BRL. Novos pedidos explícitos têm um pagamento; histórico legado pode não ter registro.

## Ciclo de vida

Uma tentativa por pedido; nova tentativa usa nova intenção de checkout. UNIQUE(userId, checkoutKey) permanece; retry retorna o original antes de tocar carrinho, budget ou cartão, mesmo se a escolha tiver mudado. Não há exactly-once entre chaves diferentes.

Pagamento PENDING → APPROVED, DECLINED ou EXPIRED; finais imutáveis. Pedido PENDING_PAYMENT → PAID, PAYMENT_FAILED ou PAYMENT_EXPIRED. Atualizações condicionais, estado do pedido/pagamento, estoque e evento final são atômicos. Valor é relido do snapshot server-side; preços do catálogo só são utilizados na criação. Regra v1 aprova total < 1.000.000 centavos, recusa demais, para todos os métodos.

CARD confirma imediatamente e exige cartão próprio válido sob lock. Recusa mantém carrinho. PIX fica elegível após 30 segundos, expira em 10 minutos; BOLETO após 60 segundos, vence em 24 horas. Relógio PostgreSQL determina elegibilidade e expiração. Contador não autoriza. Botão solicita confirmação ao backend; não há aprovação automática com página fechada. Leitura não muda estado; Action de confirmação/reconciliação persiste expiração. Horário expirado sempre impede aprovação, mesmo antes de reconciliação persistida.

Sem reserva de estoque. Criação valida disponibilidade; PIX/BOLETO removem os itens convertidos do carrinho na criação persistida. Aprovação posterior relê produtos/estoque e falha se indisponíveis; não altera carrinho novamente. Falha/expiração não restaura automaticamente itens. Novas adições são preservadas. Snapshot de preço/nome permanece imutável. Não se permite venda de produto removido/despublicado na aprovação.

Ordem de locks: identidade → sessão → budget quando necessário → pedido/pagamento ou cartão → carrinho quando necessário → produtos ordenados → inventory ordenado. Operações existentes que não usam esses recursos preservam a ordem relativa. Revalidar sessão com clock_timestamp após esperas e antes do efeito final. Falha operacional faz rollback; reserva de budget pode sobreviver pelo savepoint já estabelecido. Confirmação final repetida não consome budget nem estoque; requisições prematuras consomem budget.

Auditoria order.completed somente ao concluir pedido, uma vez; falha no append reverte conclusão/estoque. Cadastro/remoção não introduzem payload livre em auditoria. Budget inicial: cartões 10 operações/minuto, confirmação 20/minuto por usuário; checkout preserva 5/minuto. Leituras baratas não recebem novo budget.

## Representações e UI

QR e copia e cola contêm somente `GUARDIAN-BAY-SIMULACAO:PIX:<uuid>`, nunca BR Code, chave/conta ou URL externa. Boleto é HTML com linha alfanumérica `SIMULACAO-BOLETO-<uuid>`, sem barcode bancário válido, CPF/CNPJ ou beneficiário real. Aviso permanente de simulação. QR gerado localmente, preferindo SVG inline compatível com CSP. Páginas Server e menores componentes Client para formulário, clipboard, contador e confirmação. Refresh controlado de leitura é permitido enquanto pendente; não cria endpoint interno nem mutation em render/GET.

## Validação e próxima Epic

Cada Task tem commit, revisão e checks proporcionais. Entrega final cobre BOLA, contratos strict, retry, concorrência, estoque, horários, rollback de auditoria e sessão expirada. Migrations são aditivas e preservam histórico. Gates SDLC existentes permanecem.

Epic 12 será validação ofensiva e de desempenho: ZAP/Burp, k6, cobertura SAST/SCA, autenticação/autorização/regras comerciais, concorrência de pedidos/estoque/pagamentos, evidências sanitizadas, correções e retestes. Não faz parte desta implementação.

## Entrega e revisão da Epic 11

Implementação em dez Tasks sequenciais, com um commit por Task. Tabelas aditivas saved_test_cards/order_payments, constraints e budgets PostgreSQL. Fixtures deliberadamente sintéticas iniciadas por zeros, sem PAN bancário válido. Formulário descarta número/CVV/titular localmente; servidor aceita somente fixture/validade. Cartões existentes são preservados no cadastro duplicado, inclusive validade; para alterá-la, remover e cadastrar novamente.

Checkout UI exige método explícito. O contrato sem payment permanece como compatibilidade do simulador acadêmico original (sem cartão/dados financeiros); não representa método CARD nem inventa método em histórico legado. Nenhuma rota de pagamento real, conexão bancária ou endpoint HTTP interno foi adicionado. Confirmação manual pela Action; nenhuma promessa de processamento em background. Expiração é efetiva pelo relógio do servidor e persistida na próxima reconciliação explícita, sem mutation em render.

Revisão independente de segurança encontrou e levou à correção de duas janelas: pagamento expirando durante espera de auditoria na confirmação e sessão expirando durante espera de auditoria no checkout. Ambos revalidam depois do append e desfazem os efeitos comerciais. Checkout CARD também revalida validade do cartão antes do retorno. Testes reais PostgreSQL exercitam esses bloqueios, concorrência pelo último estoque e falha de auditoria, além de BOLA, retry e contratos strict.

QR usa qrcode-generator 2.0.4 fixado, sem dependências transitivas ou scripts de instalação; apenas matriz → SVG React, sem HTML bruto ou rede. Next/@next/env atualizados para 16.4.3 e Vitest para 4.1.12 (Vite transitivo corrigido) após novos advisories e autorização de atualização; não se utilizou audit fix ou exceção nova. Gate SCA distingue zero de produção e quatro entradas moderadas herdadas aceitas na cadeia Drizzle/esbuild até revisão de 2026-11-06. SCA executado em Linux/Node 24 conforme referência do SDLC; wrapper npm.cmd do gate não funciona no Node Windows utilizado, sem alteração do gate para mascarar o problema.

Permanecem os limites operacionais da Epic 10, estoque sem reserva, uma tentativa por pedido e expiração persistida sob demanda. A Epic 12 permanece planejada, sem pentest ou carga executados nesta entrega.

Evidências locais: check (115 unitários), integração existente e 13 casos novos de pagamentos PostgreSQL 18, build Turbopack e transporte Action webpack/Chrome HTTPS. Casos incluem UI real para os três métodos, HTTP Origin/contratos/ownership, expiração durante lock e auditoria indisponível com rollback. db:check confirma zero/upgrade, preservação e ausência de drift; snapshots novos apenas normalizados pelo Biome. Gitleaks, Semgrep local (zero findings), actionlint e integridade de manifest/lockfile compõem os gates. Scan complementar restrito a src: 584 alertas de regex sobre templates SQL parametrizados e 20 alertas de secrets em fixtures/atributo de formulário; triagem contextual sem vulnerabilidade confirmada. Scanners não substituem revisão de autorização nem testes comerciais.
