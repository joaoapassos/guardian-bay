# Navegação sustentada — meta de 1.000 usuários

A meta atual é sustentar 1.000 usuários virtuais ativos, com pausas entre ações. Isso não equivale a 1.000 requisições HTTP em voo nem a 1.000 navegadores Chrome reais. O patamar final exige 20 minutos de medição, além de 60 segundos de rampa e 60 de aquecimento. Este documento descreve o procedimento; a capacidade depende do relatório e da verificação PostgreSQL da execução.

## Perfil e limites

Hipóteses, sem telemetria de usuários reais: 70% navegam por catálogo, detalhe e conta; 20% usam o carrinho; 8% fazem checkout a intervalos de pelo menos 240 segundos; 2% consultam histórico e conta. Pausas de 8–16 segundos. São 1.000 identidades distintas com sessões provisionadas antes da campanha. O teste não mede login em massa, renderização JavaScript, downloads de assets ou CPU do navegador.

Compras usam somente cartões de teste autorizados, Pix e boleto fictícios. Valores, estoque, idempotência e aprovações permanecem sob autoridade do servidor. Cada intenção recebe checkoutKey nova. Pix e boleto aguardam os intervalos naturais de 31 e 61 segundos; datas não são adulteradas. O teste registra os três métodos observados. A atividade de sessão usa a Action real a cada cinco minutos; o rate limiting permanece ativo.

## Reprodução local

Use apenas o cluster dedicado em 55442 e HTTPS em 127.0.0.1:3449. Comece com build de produção, LAB_APP_INSTANCES=1 e LAB_PROXY_PROTOCOL=h2; inicie `node scripts/validation/lab.mjs serve`. O padrão usa um pool de dez conexões. A variante anterior de oito processos usa cinco conexões por processo (40 no total) e exige evidência separada. A calibração inicial deste harness foi feita nessa variante; mudar a topologia exige nova calibração. Mantenha certificado válido e verifique a CA pelo smoke HTTP/2. Não execute outra carga, scanner ou gate intensivo em CPU durante a medição.

1. Execute o gate SCA antes de cada etapa: zero findings de produção e relatório recente. Configure LAB_BASE_URL e TEST_DATABASE_URL com os valores fixos de scope.mjs.
2. Configure SECURITY_BROWSER_PATH para o Chrome instalado e execute `node scripts/validation/capture.mjs`. O navegador captura oito Actions reais, incluindo atividade; run e build são verificados, e a captura anterior é preservada.
3. Antes de cada etapa, execute `node scripts/validation/refresh-load-sessions.mjs`. O runner prepara os cartões fictícios e o snapshot fora da medição. Tokens e e-mails ficam somente nos arquivos privados ignorados pelo Git.
4. Execute uma etapa por vez: `node scripts/validation/performance.mjs 10 120 navigation`; depois `100 600`, `250 600`, `500 900` e `1000 1200`, sempre com o argumento final `navigation`.
5. Inspecione o relatório e a integridade PostgreSQL. Em navigation-stages.json, somente o último registro aprovado no mesmo run, build, perfil, hash do harness e topologia pode receber reviewApproved=true pelo operador. Falha, interrupção ou pendência bloqueia o avanço. Não há progressão automática.

## Aprovação e evidências

Leituras: p95 < 500 ms e p99 < 1.500 ms. Escritas: p95 < 1.500 ms e p99 < 3.000 ms. Erros inesperados < 1%; checks 100%. Além dos VUs ativos, cada identidade precisa completar sua participação e comprovar leituras na janela medida. Métrica vazia não representa latência zero. Erros de aquecimento também reprovam. Até 120 segundos de drenagem permitem concluir a última compra sem retirar compras do fim da medição.

Interromper por RAM acima de 85%, conexões PostgreSQL atingindo 80% do teto, CPU acima de 90% por 60 segundos, processos ou observadores ausentes e falha do monitor. Os manifests registram ambiente, build, commit e hashes. RPS global inclui preparação; calcule throughput do plateau dividindo suas leituras e escritas pela duração medida.

No PostgreSQL: nenhum estoque negativo, total incorreto, pagamento inconsistente ou intenção duplicada. Sucessos HTTP devem corresponder aos pedidos persistidos, todos pagos; o estoque consumido deve corresponder aos itens; cada pedido deve possuir um evento de conclusão com o ator correto. Preserve relatórios após falhas. Encerre somente processos identificados do laboratório.

Referência: [k6/execution](https://grafana.com/docs/k6/latest/javascript-api/k6-execution/). A conclusão vale apenas para infraestrutura, build, perfil e duração efetivamente testados; não garante disponibilidade absoluta em outro servidor.

O preflight antigo (stage-preflight.mjs e stage-gate.mjs, com seu teste) foi aposentado: o contrato navigation-contract.mjs verifica a execução sustentada real e substitui esses três arquivos. Comandos nos relatórios antigos descrevem revisões históricas do Git.



## Calibração da Task 35

A primeira inicialização foi rejeitada antes de enviar tráfego: o k6 não aceita agregação min em Gauge. As métricas de distribuição passaram a usar Trend. Duas calibrações de desenvolvimento passaram, mas ficaram fora da aprovação do harness final após reforços dos gates. Na versão final, dez usuários completaram a participação, com pelo menos sete leituras medidas por usuário, p95 de leitura 9,15 ms, p99 10,58 ms e zero erros. Um pedido de cartão foi pago, com uma unidade consumida e um evento de conclusão correto. Smoke de dois minutos não demonstra capacidade sustentada de 1.000 usuários. As etapas a partir de 100 exigem também os três métodos de pagamento observados.

Revisão independente corrigiu o corte antecipado de compras e a possibilidade de reaproveitar um PASS antigo após FAIL ou interrupção. O marcador pendente é gravado antes da execução; hash do harness e configuração integram o escopo. Lint, TypeScript, 121 unitários, testes Node do contrato, Gitleaks e Semgrep passaram; SCA de produção sem findings. Os quatro alertas de tooling previamente triados permanecem documentados na política existente.
