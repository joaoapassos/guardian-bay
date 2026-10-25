# Task31 — comparação de dezesseis processos locais

Hipótese: oito processos RSC acumulam processamento sob1000requests, com atraso de eventloop118–170ms em amostras do burst. Isso não prova causa única nem elimina aquisição de pool. Comparação opt-in16processos em portasfixas3139–3154 com2conexõesporprocesso (32total, menorque40anterior); default1processo inalterado. Sem nova infraestrutura ou mudança de produto.

500primeiraamostra:latênciap95292ms,maspico499,portantoFAILcorretamentepelooverlap. Segunda:pico500,p95354ms,zeroerros,PASS.1000:pico949,p95576,51ms,p99597,44ms,zeroerros,41conexõesPG,integridadepreservada. **FAIL** porSLO e pornãoobservartodas1000pendentes. Nãoatribuir automaticamente a diferença650→577msàréplica:amostrasvariáveis e cargascompartilhadas. Dobrarprocessosnãocomprovousolução;2000continua bloqueado. Nãoadotar16comopadrão.

Próximo:perfilCPUcomjanelaexplícita de proxy/aplicação antesdequalquernovaaumentoderecursos. RPSdoburstincluipreparação,semclaimsustentado. Osrelatóriosfiquempreservados. TestesNode6eBiomePASS.
