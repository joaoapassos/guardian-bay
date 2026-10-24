# Jornadas e calibração

`scripts/validation/representative-profile.json` registra hipóteses, não medições de tráfego real: 70% navegação, 20% carrinho, 8% checkout e 2% histórico; think time de 8–16s; ciclo comercial de 240s; cartão/Pix/boleto 60/30/10. Em 5000 VUs isso significaria 3500/1000/400/100 usuários por coorte, aproximadamente 1,67 checkouts/s se cada usuário da coorte comercial concluir um ciclo a cada 240s. Isso não equivale a 5000 requests concorrentes nem constitui previsão de capacidade.

Autenticação precisa de cenário de chegadas separado, inicialmente 12 logins/min globalmente, abaixo da política atual. Sessões provisionadas não medem Argon2 nem login. O perfil não autoriza desabilitar rate limiting. Atividade da sessão representa interação visível, no máximo uma solicitação a cada 300s; não usar heartbeat sem atividade ou estender expiração absoluta.

O script `representative.k6.js` implementa **somente calibração**, fixa em dois usuários e uma iteração por usuário. Cada usuário percorre produto, carrinho, alteração de quantidade, checkout, detalhe, confirmação e histórico nos três métodos. Pix/boleto aguardam 31/61s naturais; as esperas não entram nas tendências de latência HTTP. Os percentuais e think times acima ainda não estão implementados em um runner sustentado: não interpretar esta calibração como execução da distribuição representativa.

Preparação, com laboratório/build/lease válidos e variáveis definidas conforme environment.md:

1. `node scripts/validation/capture.mjs` com SECURITY_BROWSER_PATH explícito, para capturar Actions reais do build atual.
2. `node scripts/validation/prepare-representative.mjs`: duas sessões novas das fixtures A/B, sem alterar sessões antigas, datas de pagamento ou política de autenticação. Não repetir sobre o mesmo arquivo privado.
3. `node scripts/validation/performance.mjs 2 180 representative`: supervisor e guard de recursos existentes; timeout máximo do cenário 180s, sem progressão automática.
4. `node scripts/validation/verify-representative.mjs`: exige seis pedidos PAID, dois de cada método, consumo de seis unidades, seis eventos de conclusão e invariantes globais do banco. Executar mesmo quando k6 falhar; falha de qualquer etapa impede aprovação.

Thresholds preservados: leituras p95<500ms/p99<1500ms; mutations p95<1500ms/p99<3000ms; erros inesperados<1%; checks 100%; exatamente duas iterações concluídas. Um HTTP 200 sem sucesso comercial não passa. Rejeição de política durante um fluxo positivo também falha a calibração.

O dataset atual continua pequeno: dois usuários de calibração, catálogo de laboratório e histórico curto. Não representa cardinalidade de produção ou 5000 usuários únicos. Antes de qualquer patamar sustentado, implementar as coortes/think times, dados suficientes e atividade legítima, calibrar as proporções observadas e obter revisão manual do mesmo build/perfil. As sessões expiram normalmente. Não copiar fixtures privadas, PAN, CVV, cookies ou payloads para relatórios públicos.

Esta preparação não libera os gates de 100/250/500 nem demonstra estabilidade sustentada.
