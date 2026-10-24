# Task 08 — avaliação do laboratório autorizado

Decisão do usuário: somente laboratório local. Não foram provisionados hosts, staging remoto, serviços pagos ou novos destinos de tráfego. O requisito de gerador fisicamente separado **não foi atendido**; esta Task entrega avaliação local, não staging isolado.

Evidência atual: manifesto da calibração Task07 em artefatos privados, com resumo público em epic13-representative-calibration.json. Windows 10.0.26200, 20 CPUs lógicas e 34114641920 bytes de RAM; Node26.7.0; Next em `next start`, NODE_ENV=production, loopback3139; proxy TLS3449 e cluster dedicado55442. App, proxy, PostgreSQL e k6 compartilham a máquina. Gates Linux/Node24 são verificações SDLC, não o runtime medido da carga Windows.

Observabilidade disponível: amostras de CPU/RAM do host, CPU/RSS do gerador e aplicação, observer de event loop e contadores do proxy, conexões e lock waiters PostgreSQL. Calibração: pico amostrado CPU22,24%, RAM50,65%,13 conexões, zero lock waiters amostrados. Esses valores não dimensionam5000VUs e não excluem picos entre amostras. Não há fila de aquisição do pool, ocupação de portas ou rede por processo medidas.

Problema → impacto → bloqueio:

- Recursos compartilhados → interferência entre gerador e sistema testado → bloqueia conclusão de capacidade independente e escalada enquanto o gerador não for validado.
- PERF-01 sem correção aprovada e250VU mistos FAIL → SLO anterior não atendido → bloqueia500 e todos os patamares superiores.
- Perfil sustentado e dataset de alta cardinalidade pendentes → calibração não representa distribuição final → bloqueia conclusão de5000usuários ativos.
- Sem staging autorizado → impossibilidade de comparar máquinas separadas nesta execução → não bloqueia diagnóstico local de baixo tráfego, mas bloqueia declarar staging entregue.

Antes de nova carga: build/commit e configuração imutáveis; lease e certificado válidos; SCA atualizado; nenhum outro teste concorrente; identificação dos processos; snapshot de integridade e recursos; deadline e abort guards habilitados. Encerrar somente processos do laboratório cuja identidade foi verificada. Manter relatórios históricos e privados; não limpar dados de outros ambientes.

Uma configuração futura com gerador separado requer autorização concreta dos hosts e novo escopo de destino revisado; o harness atual continua recusando destinos externos. Não desabilitar essa proteção para contornar a limitação.
