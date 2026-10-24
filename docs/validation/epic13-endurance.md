# Task 16 — endurance, picos e recuperação

Estado: **execução bloqueada**, zero tráfego adicional. Falta patamar sustentado aprovado do perfil representativo; calibração de aproximadamente95s não é baseline de endurance. Não foram executados soak, pico ou estresse nesta Task. O runner histórico de stress não é substituto de uma campanha longa e não deve ser usado para contornar os preflights da Epic13.

Procedimento a implementar/revisar antes de executar:

1. Calibrar coortes e dados; validar gerador; aprovar100/250 por10min,500 por15min,1000 por20min,2000 por30min,3500 por45min e5000 por60min, cada patamar com decisão manual e evidência do mesmo build/perfil. Aquecimento separado de5min; excluí-lo das métricas sustentadas, mas preservar seus erros.
2. Endurance no maior patamar estável aprovado: inicialmente60min, depois4h com autorização operacional concreta e recursos demonstrados. Atividade somente por interação modelada; respeitar idle30min e absoluto8h. Validar login/renovação de sessão em cenário separado, sem falsificar relógio no soak.
3. Pico limitado ao próximo nível previamente autorizado:30s, seguido de parada do gerador e observação de recuperação por até120s. Não descobrir automaticamente um novo nível. Estresse progressivo somente após estabilidade e sem extrapolar loopback autorizado.
4. Recuperação exige dez leituras consecutivas HTTP200 e latência até120% do p95 da baseline aprovada; todas as amostras precisam atender status e latência. Validar estoque, totais, pagamentos, idempotência, isolamento e auditoria antes/depois. Comparar com snapshot e intenção comercial, não somente contagens globais.

Abortar por falha de integridade imediatamente; observador/monitor ausente, processo indisponível ou deadline atingido; memória host>85%, conexões>=80% do max ou CPU>90% sustentada60s. Thresholds de leitura500/1500ms e mutation1500/3000ms, erros inesperados<1% e checks100% permanecem. Não aumentar timeouts ou SLO para obter PASS. Instrumentação sem capacidade para observar o gerador classifica resultado como inconclusivo.

Rejeições legítimas de abuso são classificadas separadamente, mas não tornam o fluxo positivo aprovado. Workload deve respeitar budgets reais. Evitar polling de pagamento inexistente no produto; manter espera natural e confirmação autorizada pelo servidor. Incluir concorrência de última unidade, mesma checkoutKey, confirmações simultâneas, expiração e alteração de estoque, com verificação transacional posterior.

Conservar baseline, build/commit, hashes, configurações, recursos e séries de cada tentativa. Após abort não apagar vestígios nem continuar para o próximo patamar. Não confundir carga/estresse local com resistência a DDoS ou disponibilidade de produção.
