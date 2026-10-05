---
name: security-review
description: Revisar operações sensíveis e alterações que cruzem limites de confiança no Guardian Bay, verificando os invariantes de segurança aprovados.
---

# Revisar limites de confiança

Use os invariantes do [AGENTS.md](../../../AGENTS.md) e o contexto de [arquitetura e segurança](../../../docs/architecture/README.md). Revise somente a operação/alteração em escopo; não implemente recursos ausentes para tornar a revisão completa.

1. Trace `Client → Action/Route Handler → feature/server → DB → DTO/response`. Trate Server Actions como endpoints públicos, mesmo sem botão visível ou com rota/página protegida. Identifique quais validações ocorrem no servidor e quais existem apenas para UX.
2. Localize autenticação, autorização e verificação de ownership/permissões. Para cada operação sensível, confirme checks na própria execução, sem confiar em Proxy ou autorização prévia da página. Para cada mutation, confirme que mudar um identificador enviado pelo cliente não permite operar sobre recursos de outro usuário (IDOR/BOLA).
3. Identifique a origem de preço, desconto, estoque, total e permissões. Confirme que IDs, valores de props, hidden inputs, `.bind()`, formulário, argumentos de Action ou Zustand não são aceitos como autoridade pelo servidor, inclusive sobre role, ownership e status de pagamento. Verifique que intenção (ID + mudança) é validada e confrontada com fontes confiáveis.
4. Siga imports e reexports dos módulos client para verificar exposição de secrets, sessão interna, DB e infraestrutura privilegiada. Diferencie a referência remota de Action apropriada da importação proibida de `feature/server`/DB. Confira proteção `server-only` onde apropriado; para detalhes do framework, consulte o guia local de Next.js pertinente.
5. Confira DTO mínimo/serializável, retornos de Actions e erros sem stack traces, SQL, secrets ou detalhes internos, além dos campos devolvidos por queries/mutations, parametrização de Drizzle/SQL e o efeito de operações concorrentes sobre integridade. Avalie esses pontos quando houver código concreto correspondente.
6. Relate achados com arquivo/local, caminho de entrada, impacto e menor correção. Diferencie evidência de hipótese e registre o que não pôde ser verificado. Execute apenas checks pertinentes já disponíveis.

Ausência de UI não prova autorização. Ausência de implementação não comprova segurança: registre como não verificável, sem criar funcionalidades, bibliotecas ou novos contratos além da boundary aprovada fora da Task.
