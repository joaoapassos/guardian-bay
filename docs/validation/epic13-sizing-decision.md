# Task 11 — decisão de dimensionamento

Estado: **nenhum ajuste de infraestrutura aprovado pela evidência**. Mantidos uma instância por padrão, pool existente, max_connections100 e shared_buffers128MB no cluster dedicado. Topologia opt-in de duas instâncias já testada na Task03 não passou o SLO250VU. Não ativar mais instâncias automaticamente nem tratar20 CPUs lógicas como20 processos utilizáveis sem medir contenção e gerador.

Conexões observadas:13 na calibração e29 no experimento com duas instâncias, abaixo do guard de80% do cluster; não é evidência de saturação do banco nem garantia para outra carga. src/db/index.ts usa postgres(url) com padrão da versão instalada, sem max explícito no produto. Verificar o padrão efetivo e reservar orçamento para observadores/admin antes de testar outra topologia: instâncias × máximo do pool + clientes auxiliares < orçamento seguro do cluster. Não abrir5000 conexões porque há5000 VUs.

Dimensionamento precisa de RPS/transações por coorte, tempo de serviço, concorrência efetiva em voo e consumo por processo no patamar estável. VUs com think time não equivalem a requests simultâneos. O objetivo deve ser definido pelo perfil sustentado, duração e SLO; nenhum número de vCPU/RAM pode ser vendido como garantia nesta execução.

Somente laboratório local autorizado: não há custo de nuvem contratado nem proposta paga aplicada. Separação física de gerador/banco/app continua uma condição futura para atribuição confiável; não foi provisionada. Nesta máquina, usar amostras de gerador, event loop e host para classificar medições inconclusivas quando houver interferência. Monitorar portas/sockets e fila do pool antes de ajustar limites do SO ou timeouts.

Critério para ajuste posterior: recurso identificado como limitante em experimento controlado, orçamento explícito, única variável alterada, comparação com baseline preservada, recuperação e integridade aprovadas. Correção de configuração ou sizing permanece pendente, não concluída por esta documentação.
