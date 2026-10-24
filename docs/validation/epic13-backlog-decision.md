# Task26 — backlog e admissão de transporte

Opção de diagnóstico LAB_PROXY_BACKLOG restrita a511(default) ou2048, ligada somente ao listener local3449. Sem alteração de registry/firewall/SO, timeout, pool ou limites de segurança. Status de warm-up/medição e recusas agora têm contadores separados; classificação de recusa usa erro de transporte allowlisted, sem registrar mensagem/URL/cookie.

[Comparação](epic13-backlog-comparison.json): com511,204falhas de transporte e204recusas no warm-up500; com2048,221falhas e221recusas. Ambas interromperam antes da medição. Alteração **não resolveu** a admissão e não se tornou padrão. max_connections e invariantes PostgreSQL preservados; nenhum teste acima de500enviado. A tentativa anterior217falhas tinha apenas amostra de warning, não breakdown completo; não reclassificar esse histórico retroativamente.

Controle tcp-admission.mjs: mesmo listener3449, outro gerador Node,500TCP seguidos de500TLS sem HTTP, sockets fechados imediatamente, timeout5s por socket e guard de memória. Todos500TCP e500TLS conectaram,95,00/683,86ms totais. Isso exclui um limite absoluto simples de500conexões naquele controle, mas não distingue completamente rajada do gerador, TLS/encaminhamento HTTP e fila efetiva do SO sob tráfego. Não é benchmark da aplicação e não prova500requisições HTTP.

Não atribuir falhas ao PostgreSQL, Next ou Go sem comparação adicional. Não elevar backlog indefinidamente para obterPASS. Próxima hipótese justificável é isolar o encaminhamento HTTP/TLS do proxy de laboratório, por controle equivalente ou proxy dedicado, mantendo host/origin, segurança, observabilidade, dados e limites de medição. Somente laboratório local autorizado.
