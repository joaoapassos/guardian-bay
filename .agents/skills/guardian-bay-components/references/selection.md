# Seleção de bibliotecas e estado

[Skill](../SKILL.md). Consultar somente as seções pertinentes; `package.json`/lockfile são a fonte das versões atuais. Inventário aprovado em 25/10/2026, sem obrigação de atualizar pacotes ao usar esta referência.

## Base disponível

| Dependência | Versão verificada | Uso e limite |
| --- | --- | --- |
| React / react-dom; Next | 19.2.8; 16.4.3 | React/TSX e App Router Server-first; APIs pelo guia instalado |
| Tailwind | 4.3.3 | Estilos e tokens próprios; não introduzir kit visual |
| Radix Alert Dialog | 1.1.24 | Confirmação relevante de consequência, já existente |
| Radix Dialog | 1.2.0 | Edição breve e Drawer modal; mesma mecânica, aparência lateral |
| Radix Dropdown Menu | 2.1.25 | Menu da conta desktop; mobile integra links ao Drawer |
| Radix Toast | 1.2.24 | Notificação não crítica após ação confirmada |
| React Hook Form; Zod | 7.89.0; 4.6.7 | Formulário/validação; regras críticas também no servidor |
| tailwind-merge | 3.7.0 | Composição de classes com suporte a Tailwind 4.3 |
| Zustand | 5.0.16 | UI compartilhada com consumidores concretos |
| TanStack React Query | 5.104.5 | Cache/sincronização de consultas Client justificadas |

Novas dependências desta seleção têm licença MIT. Os Radix escolhidos compartilham versões de primitivas com Alert Dialog; não trocar isoladamente por `latest` sem rever deduplicação e correções. Query depende de query-core da mesma versão; Zustand e tailwind-merge não têm dependências runtime obrigatórias adicionais nas versões verificadas. Conferir peers/transitivas/audit no lock efetivo; não instalar peers opcionais, devtools ou adaptadores automaticamente.

## Matriz dos componentes documentados

Nativo significa elemento semântico em componente React. “Próprio” mantém a responsabilidade de domínio e compõe nativo/Radix, sem reinventar mecanismos complexos.

| Abordagem | Componentes |
| --- | --- |
| Nativo + Tailwind | Breadcrumb, Button, Form Field (input/label/select/checkbox/radio/textarea), Feedback/Alert/Badge, Loading/Skeleton, Empty State, Pagination, Data List/tabela |
| Radix | Dialog/Alert Dialog; Drawer usando Dialog |
| Próprio + nativo/Radix | Header, Footer, Navegação mobile, Menu de usuário, Navegação de conta, Sidebar administrativa |
| Próprio + nativo | Quantity Control, Price Display, Product Card, Product Grid, Product Gallery, Product Sort, Order Summary, Cart Item, Payment Simulation |
| Próprio + nativo/Drawer | Product Filters |

Galeria atual tem uma imagem; Home tem banner estático, sem carrossel. Ajuda usa tópicos e âncoras, sem Accordion obrigatório. Tabelas atuais não exigem seleção em massa, agrupamento ou exportação. Sem requisito atual para Recharts, TanStack Table, Embla, calendário, DnD, upload ou virtualização; não instalar antecipadamente. Select customizado, Tooltip, Tabs e outras primitivas Radix também dependem de necessidade concreta.

Dinero e `lib/money`, Lucide e geração de QR já resolvem suas responsabilidades. Inspecionar utilitários/contratos antes de duplicar; UI de protótipo não é referência estética. Não adicionar clsx, CVA, resolvers ou outra família de UI como efeito colateral.

## Formulários e composição Radix

Form Field apresenta label/controle/ajuda/erro; formulário da feature conhece schema, submissão e resultado. IDs devem ser únicos quando campos se repetem. Usar `register` nos nativos; `Controller`/`useController` quando a API externa exige valor/eventos controlados, preservando `ref`, `onBlur` e foco de erro. Não registrar o mesmo campo duas vezes.

Validar com Zod sem importar módulos privilegiados no Client. A integração atual por `safeParse` não exige `@hookform/resolvers`; avaliar adaptador somente com benefício demonstrado e autorização. Distinguir `z.input`/`z.output` em transformações. Não converter todo formulário simples para controlado nem duplicar campos no Zustand.

Dialog de edição breve fecha após sucesso confirmado; erro mantém contexto. Formulário longo fica no fluxo. Não aninhar confirmação sobre modal: apresentar escolha no mesmo painel ou sequenciar fechamento com foco correto. Alert Dialog destrutivo começa na opção segura. Drawer de filtros distingue seleção aplicada e rascunho cancelável.

## Toast

Radix Toast fornece comportamento headless; o Guardian Bay fornece conteúdo e estilo. Montar Provider/Viewport somente na futura Task com consumidor, no ancestral necessário, sem transformar layout inteiro em Client. Não criar agora infraestrutura preventiva.

Exemplo de intenção: “Produto adicionado ao carrinho” somente após resposta de sucesso; link para carrinho conserva semântica de navegação. Operação pendente não é sucesso. Erro de compra/resultado incerto, validação de campo e instruções críticas permanecem junto da operação; Toast pode complementar, nunca ser a única recuperação.

Não roubar foco nem repetir anúncios em Toast e live region. Escolher anúncio conforme urgência; permitir tempo de leitura, pausa/fechamento, acesso por teclado e preferência reduzida. Não oferecer “Desfazer” sem operação real. Toast não dispara nem repete mutation e não recebe payload/erro interno sensível.

## Escolha do estado e consultas

| Fonte | Responsabilidade |
| --- | --- |
| Server Component + feature/server | Leitura inicial, autoridade comercial e autorização |
| URL | Filtros aplicados, ordenação e paginação reproduzíveis |
| React local / RHF | Abertura, rascunho, campos e feedback transitório |
| Zustand | UI entre consumidores distantes quando elevar estado/compor não basta |
| TanStack Query | Consulta Client que exige sincronização/refetch/cache próprios |

Zustand: store no domínio consumidor, seletores pequenos; não ler/escrever store em RSC nem compartilhar estado de request em singleton de servidor. Se houver SSR/hidratação, instanciar por request/árvore com snapshot coerente. Não persistir credenciais, sessão, permissões, preço/estoque/total autoritativos ou dados privados por padrão. Limpar estado vinculado à conta na saída/troca.

TanStack Query: justificar consulta Client (ex.: atualização de leitura local), sem migrar catálogo Server por conveniência. Usar interface HTTP real autorizada que delega a feature/server quando necessária; não criar endpoint para o Server Component chamar nem usar Action de escrita como query. Não instalar roteador alternativo.

Provider na menor subtree consumidora; QueryClient estável no browser e isolado por request no servidor. Definir dono do dado entre render Server e cache Client, `staleTime`, invalidação e refetch, evitando duas cópias que divergem. Hidratar somente DTO público ao usuário autorizado, sem secrets. Query keys incluem parâmetros e escopo de identidade não secreto quando privado; a chave não concede acesso.

Na saída/troca de conta: cancelar consultas privadas, impedir resposta antiga de repovoar UI/cache e remover cache anterior antes de exibir nova identidade. Não persistir/broadcastar cache privado por padrão. Tratar 401/403 como fim de acesso; não manter dado privado como fallback. Retry não contorna autenticação, rate limit ou erro de negócio.

Queries apenas leem. Writes preservam Actions e suas garantias; `useMutation` só coordena UI se houver benefício, sem substituir autorização. Declarar retry de mutation desabilitado, sem replay automático de add/checkout/confirmação por foco, reconexão ou efeito. Resultado incerto consulta estado confirmado; invalidate/refetch não recria compra. Polling só com necessidade e limites, sem confirmação automática de pagamento.

## Documentação oficial sob demanda

- Radix: [Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), [Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu), [Toast](https://www.radix-ui.com/primitives/docs/components/toast), [composição](https://www.radix-ui.com/primitives/docs/guides/composition), [releases](https://www.radix-ui.com/primitives/docs/overview/releases).
- [RHF Controller](https://react-hook-form.com/docs/usecontroller/controller), [Zod](https://zod.dev/), [tailwind-merge](https://github.com/dcastil/tailwind-merge).
- [Zustand no Next](https://github.com/pmndrs/zustand/blob/main/docs/guides/nextjs.md).
- TanStack Query: [SSR/App Router](https://tanstack.com/query/v5/docs/framework/react/guides/advanced-ssr), [defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults), [invalidação](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation).

Documentação remota pode avançar além da versão instalada. Conferir tipos/exports locais, peers e changelog antes de aplicar API nova. Nova dependência exige requisito documentado, avaliação de nativo/Radix/base instalada, licença, manutenção, transitivas, segurança e benefício; autorização desta seleção não cobre pacotes futuros.
