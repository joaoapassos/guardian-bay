# Guardian Bay

E-commerce acadêmico com identidade, catálogo, carrinho autenticado e pedidos; regras comerciais e de acesso executadas no servidor. Este documento descreve implementação observada, sem definir novo roadmap.

## Públicos e fluxos implementados

- Visitante consulta catálogo/detalhe, cria conta e faz login.
- Customer mantém conta, senha, sessão e carrinho persistido; confirma checkout e consulta somente seus pedidos.
- Admin com role persistida gerencia catálogo/estoque, consulta pedidos e auditoria selecionada; cada operação revalida acesso.
- Checkout recalcula valores/publicação/estoque no servidor, mantém snapshot e idempotência e consome estoque somente para PAID na transação. Carrinho não reserva estoque.
- Cartão fictício, Pix e boleto são simulados e não movimentam dinheiro. Aprovação/recusa segue o [contrato de pagamentos](docs/architecture/payments.md).

## Garantias e limites

Ownership, autorização, preços, estoque, total e status nunca são autoridade do cliente. DTOs/erros evitam detalhes internos; validação frontend serve para UX e é repetida no servidor. [Invariantes](docs/agent-invariants.md) e [arquitetura](docs/architecture/README.md) são normativos.

Não há guest checkout, pagamento real, reserva de estoque, recuperação automática de senha ou verificação de e-mail. A base local não prova prontidão para exposição pública: origem confiável, proteção volumétrica, HTTPS e operação têm limites no threat model e SDLC. Não apresentar capacidades planejadas de identidade visual como implementadas.

## Critérios para preservar o produto

Mudanças mantêm isolamento de usuário/admin, valores determinados pelo servidor, atomicidade e retries sem duplicação. Unitários verificam regras puras; PostgreSQL dedicado, integridade/concorrência; HTTP/browser, boundaries/fluxos conforme risco. Comandos em [qualidade](docs/quality.md); setup não autoriza alterar esses contratos.

Fontes verificadas em 2026-10-25: README, rotas de src/app, arquitetura e pagamentos. Rever quando fluxos ou contratos comerciais mudarem.
