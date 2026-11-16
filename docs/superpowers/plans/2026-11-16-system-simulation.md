# System simulation implementation plan

**Objetivo:** criar de 1 a 5 registros fictícios por tipo em cada ciclo de cinco minutos, com auditoria atribuída e execução controlada por systemd.

**Limites:** nenhuma execução no banco instalado, migration aplicada ou serviço ativado durante a implementação; preservar dados e credenciais existentes até decisão sobre identidade de banco. Limites finitos de crescimento impedem garantir criações indefinidas: ao atingi-los, informar bloqueio e não alterar registros reais.

1. Testar agendamento de operações, prioridade, repetição após falha e encerramento; implementar agendador independente de relógio e serviço.
2. Usar a credencial existente e o administrador padrão, conforme esclarecido pelo usuário; criar somente registros fictícios identificáveis, sem editar cadastros reais, e atribuir auditoria ao administrador e aos compradores simulados. Testar operações atômicas com PostgreSQL local dedicado.
3. Implementar unidade systemd, comando interativo e integração segura com init/update, preservando estado e rollback; testar com processos e chamadas simuladas.
4. Documentar operação, limites e recuperação; executar checks, testes de integração e validação em Ubuntu descartável quando disponíveis; registrar limitações.

## Evidência e pendências

- O banco local dedicado `guardian_bay_test` foi criado e recebeu migrations apenas para testes; a integração específica confirmou atores de auditoria, vínculos, isolamento dos alvos e rollback quando a auditoria falha. A suíte de integração da aplicação passou com chaves sintéticas de teste.
- A unidade systemd, o comando e a preservação de estado em update foram verificados por testes isolados. A execução real em Ubuntu/systemd, reinicialização do host e recuperação após falha ainda exigem validação em VM descartável.
- O serviço não foi instalado nem iniciado nesta sessão; a migration `0025` permanece necessária no ambiente da aplicação. Não foram alterados bancos da aplicação.
