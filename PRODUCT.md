# Guardian Bay

E-commerce acadêmico com identidade, catálogo, carrinho autenticado e pedidos; regras comerciais e de acesso executadas no servidor. Este documento descreve implementação observada, sem definir novo roadmap.

## Públicos e fluxos implementados

- Visitante consulta catálogo/detalhe, cria conta e faz login.
- Customer mantém conta, nome opcional, senha, sessão e carrinho persistido. O carrinho abre em painel lateral; `/cart` é compatibilidade de navegação. Métodos de pagamento ficam em `/account/payment-methods`; histórico e detalhes em `/account/orders`, com redirecionamentos dos caminhos antigos.
- Admin com role persistida gerencia catálogo/estoque, consulta pedidos e auditoria selecionada; cada operação revalida acesso.
- Checkout recalcula valores/publicação/estoque no servidor, mantém snapshot e idempotência e consome estoque somente para PAID na transação. Carrinho não reserva estoque.
- Checkout exige nome e CPF matematicamente válido do comprador, além de endereço brasileiro salvo ou avulso. CPF é cifrado com AES-256-GCM e contexto por proprietário/recurso; DTOs retornam somente máscara. Salvar comprador, endereço e identificação de cartão na conta é opcional e atômico com a compra elegível; dados históricos do pedido permanecem independentes. Há até 20 endereços e três métodos salvos. Não há cálculo de frete nem endereço principal; histórico legado não recebe dados inventados.
- Home apresenta até oito produtos; catálogo mantém pesquisa, categoria, preço, disponibilidade, ordenação e paginação na URL. Novidades permanece adiada até existir um critério de data aprovado. O perfil exibe e-mail e permite alterar senha; não oferece edição de dados sem contrato existente.
- Cartão é validado por Luhn, faixa de bandeira suportada (Visa/Mastercard/Amex) e validade, sem consulta bancária ou garantia de titularidade. Número completo é transitório; somente bandeira, últimos quatro dígitos e validade são salvos. CVV é validado e descartado apenas no formulário, sem envio ao servidor ou persistência. Cartão, Pix e boleto continuam simulados. Os contratos antigos de fixtures permanecem somente para compatibilidade; não são oferecidos pela nova interface. Consulte o [contrato de pagamentos](docs/architecture/payments.md).
- Login forçado preserva destino interno validado. Adição ao carrinho interrompida por ausência de sessão usa intenção opaca de dez minutos consumida uma vez no servidor; compra/pagamento não são repetidos automaticamente. Curtain comunica mudança entre Loja/Conta e Admin com prontidão limitada e recuperação; categorias não aparecem em Minha Conta.

## Páginas institucionais

Sobre (`/sobre`) e Central de Ajuda (`/ajuda`) apresentam a marca fictícia e os fluxos disponíveis. Privacidade (`/privacidade`), Termos (`/termos`) e Trocas e Devoluções (`/trocas-e-devolucoes`) são minutas explicitamente em elaboração, com `noindex`, sem vigência ou aprovação jurídica. Footer global e checkout oferecem acesso aos documentos. Conteúdo estático Server, sem CMS ou dependências adicionais; canal de contato, políticas definitivas e operação de devolução/reembolso continuam pendentes.

## Garantias e limites

Ownership, autorização, preços, estoque, total e status nunca são autoridade do cliente. DTOs/erros evitam detalhes internos; validação frontend serve para UX e é repetida no servidor. [Invariantes](docs/agent-invariants.md) e [arquitetura](docs/architecture/README.md) são normativos.

Não há guest checkout, pagamento real, reserva de estoque, recuperação automática de senha ou verificação de e-mail. A base local não prova prontidão para exposição pública: origem confiável, proteção volumétrica, HTTPS e operação têm limites no threat model e SDLC. Não apresentar capacidades planejadas de identidade visual como implementadas.

## Critérios para preservar o produto

Mudanças mantêm isolamento de usuário/admin, valores determinados pelo servidor, atomicidade e retries sem duplicação. Unitários verificam regras puras; PostgreSQL dedicado, integridade/concorrência; HTTP/browser, boundaries/fluxos conforme risco. Comandos em [qualidade](docs/quality.md); setup não autoriza alterar esses contratos.

Fontes verificadas em 2026-10-25: README, rotas de src/app, arquitetura e pagamentos. Rever quando fluxos ou contratos comerciais mudarem.
