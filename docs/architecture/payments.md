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
