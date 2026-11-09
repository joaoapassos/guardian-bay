# Plano de reformulação da gestão de usuários

**Objetivo:** permitir que administradores consultem contas e pedidos e administrem cargos, acesso e sessões com auditoria transacional.

**Arquitetura:** páginas Server compõem leituras em `features/*/server`; Actions validam intenção e delegam operações autorizadas. A listagem usa React Table com dados paginados no servidor. Não armazenar autorização em cache. O texto de requisitos está na solicitação anexada à conversa.

**Restrições:** preservar alterações locais; uma Task por vez, sem avanço automático; sem exclusão de usuários; dados mínimos; mesma origem e autorização na operação; Biome e npm; migrations apenas quando necessárias e testes PostgreSQL somente em destino dedicado validado.

## Dependências e pontos de revisão

- Estado de suspensão não existe: sua Task deve cobrir login, criação de sessão e todas as leituras/mutations autenticadas, inclusive acessos concorrentes e revogação; um campo isolado não cumpre o requisito.
- As alterações administrativas críticas e eventos devem ser atômicos desde sua primeira disponibilização. Evoluir contratos fechados de auditoria junto à primeira mutation pertinente, sem esperar a última Task para gravar eventos.
- O modelo atual de auditoria não possui payload para valores anteriores e novos. Definir campos ou eventos fechados mínimos e suas constraints, sem introduzir payload livre ou dados sensíveis.
- Pedidos administrativos não expõem identidade de comprador: consulta por usuário exige uma nova boundary server autorizada, não enfraquecimento da leitura existente.
- O cache atual de listagem é local por processo, com 30 segundos e chave de cargo/página. Alterar chaves para busca/ordem/status e definir invalidação e consistência entre instâncias; nunca usá-lo para autorização ou decisões sobre último admin.
- Busca por substring e paginação profunda precisam de limites e medição com `EXPLAIN` em dados representativos antes de adicionar índices ou extensões. Empatar ordenação por data com UUID para resultados determinísticos.

## Ordem proposta

### Task 1 — Listagem

**Arquivos:** `src/app/admin/users/`, `src/features/auth/schemas/admin-users.schema.ts`, `src/features/auth/server/admin-users.ts`, testes correspondentes e, se evidenciados, schema/migration de índices.

- [ ] Adicionar busca literal limitada por nome/e-mail, filtros e ordenação por data com paginação limitada e parâmetros validados na URL; tratar caracteres especiais como texto.
- [ ] Exibir nome/e-mail, placeholder, cargo e data com tabela acessível e menu Radix. Adiar status até existir suporte; manter alteração de cargo existente acessível até o diálogo substituto estar pronto. Não criar links de ações indisponíveis.
- [ ] Atualizar chave do cache e verificar expiração, invalidação e dados mínimos. Testar filtros, limites, paginação, acesso negado, teclado e responsividade.

### Task 2 — Detalhes e pedidos

**Arquivos:** `src/app/admin/users/[id]/`, `src/features/auth/server/`, `src/features/orders/server/` e respectivos schemas/testes.

- [ ] Criar leitura de usuário por UUID com autorização independente e DTO mínimo; retornar estado controlado para ausente/inválido.
- [ ] Criar leitura administrativa paginada por usuário em Orders, restringindo a consulta pelo UUID validado e evitando dados de pagamento, CPF, endereço ou checkoutKey; reutilizar formatação de valores e detalhe administrativo.
- [ ] Testar visitante/customer, ID adulterado, inexistente, associação correta dos pedidos e paginação; disponibilizar o link na listagem.

### Task 3 — Cargos e auditoria de cargos

**Arquivos:** `src/features/auth/actions/`, `src/features/auth/server/admin-users.ts`, `src/lib/audit/`, `src/db/schema/audit-events.ts`, migrations e componentes da rota.

- [ ] Estender contrato/constraints da auditoria para promoção e rebaixamento com ator e alvo; registrar evento e alteração na mesma transação. Definir representação fechada dos valores relevantes.
- [ ] Substituir formulário por diálogo Radix de confirmação; preservar bloqueio de própria conta, validação server, serialização de administradores, revogação de sessões e feedback controlado.
- [ ] Testar autorização direta, concorrência, última conta admin, falha do writer/rollback, revogação e acessibilidade; não presumir que testes unitários comprovam locks.

### Task 4 — Suspensão e reativação

**Arquivos:** `src/db/schema/users.ts`, migrations, autenticação/sessões e todas as boundaries autenticadas afetadas, UI e testes.

- [ ] Acrescentar estado persistido com padrão ativo para contas existentes. Bloquear própria suspensão e garantir que resta admin ativo sob serialização compartilhada com alterações de cargo.
- [ ] Bloquear login e criação de sessão após suspensão; revogar sessões na mesma transação; revisar cada boundary de autorização e caminhos concorrentes, inclusive credencial verificada antes da suspensão.
- [ ] Registrar evento transacional e adicionar status/filtro somente após suporte real. Testar locks, expiração, corridas, reativação e regressões de auth.

### Task 5 — Revogação administrativa

**Arquivos:** `src/features/auth/actions/`, `src/features/auth/server/`, auditoria, UI e testes.

- [ ] Criar operação autorizada com UUID validado, confirmação e exclusão transacional das sessões do alvo; definir bloqueio de operação sobre própria conta.
- [ ] Registrar evento na mesma transação e testar sessão real revogada, login concorrente, usuário não autorizado e rollback de auditoria.

### Task 6 — Consulta de auditoria por usuário

**Arquivos:** `src/features/audit/`, `src/app/admin/users/[id]/` e testes.

- [ ] Reutilizar consulta paginada com target e tipos restritos aos eventos administrativos de usuário; mostrar data, ator, resultado e alteração permitida, sem segredos.
- [ ] Testar filtro por alvo, paginação, autorização, DTO e dados históricos anteriores à feature.

### Task 7 — Validação integral

- [ ] Executar `npm run check`, `npm run verify`, integração e segurança proporcionais ao risco, com preflight e PostgreSQL local dedicado; confirmar que migrations atingem apenas o banco de teste.
- [ ] Validar fluxo real em browser, teclado, foco, contraste, mobile e movimento reduzido; registrar evidências e limites. Atualizar arquitetura, threat model e produto conforme contratos efetivamente implementados.

## Critério de passagem

Cada Task entrega comportamento utilizável e testes pertinentes antes da próxima. Atualizar este plano se a análise de uma Task revelar dependências ou custos novos; informar conflitos e não avançar automaticamente.
