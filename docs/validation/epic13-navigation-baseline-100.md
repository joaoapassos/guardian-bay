# Task36 — baseline sustentada de100usuários

Configuração mínima testada:umprocessoNext emprodução,poolpadrão10,proxyHTTPScomHTTP2 e PostgreSQLdedicadolocal. A calibração específica dessa topologia passou com10VUs,mínimo7leiturasporusuário,p958,20ms,zeroerros e1pedido consistente. Não reaproveitada a calibração de8processos para aprovar essa configuração.

Baseline100:60sderampa+60saquecimento+600smedidos.100usuários completaram participação;mínimo44leiturasmedidasporusuário.4996leituras e418escritas no plateau (~9,02requests/s);p95/p99leitura6,43/11,19ms,p95/p99escrita10,14/15,97ms;zeroerros. O RPSglobal8,71incluipreparação/drenagem e não substitui esse cálculo.

24pedidos pagos(19cartão,3Pix,2boleto),24unidades e24eventosdeconclusão com atorcorreto;invariantesglobaispreservados. Máximo15conexõesPG,sem lockwaiters amostrados. Hostcompartilhado:CPUmax13,90%,RAMmax48,33%. Não demonstra ausência de contenção subamostrada nem capacidade deoutroservidor. Não aprova1000;250éopróximopatamar,condicionadoàrevisãodeste resultado.

Evidências:relatórios epic13-navigation-10-1792892752*.json e epic13-navigation-100-1792893559*.json. AtualizadosREADMEe relatóriohistóricoTask17 para apontar ao procedimento vigente; histórico factual preservado. Nenhumcódigo deproduto,dependência,migrationouSLOalterado.
