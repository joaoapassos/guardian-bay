<!-- Ajuste de execução aprovado: seeder padrão 200, máximo 1000; sem preparação de DNS/hosts/alias local. -->
# Correções de interface e requisições — Implementation Plan

> Para implementação: superpowers:executing-plans, seguindo a ordem do [plano principal](2026-10-26-correcoes-operacao.md). Não executar antes da aprovação.

**Goal:** corrigir CEP, impedir trabalho redundante, tornar transições consistentes e ajustar apresentação sem reconstrução.

**Architecture:** UI compartilha somente apresentação/intenção; operações continuam nas features com autenticação, autorização e dados confiáveis. Controlador persistente atual continua dono do motion de contexto.

**Tech Stack:** Next/React instalados, RHF/Zod, Radix, Tailwind, PostgreSQL/Drizzle para budget.

**Spec:** [contratos completos](../specs/2026-10-26-correcoes-operacao.md). Os valores e limites da spec são restrições globais deste plano.

## Review Focus

CEP colado/editado no meio; revisão obsoleta em submit igual; rajada com resposta atrasada/logout; redirect de autorização durante cortina; scroll/zoom/teclado mobile. Os checks correspondentes estão nas Tasks.

## T01 — CEP completo

**Arquivos:** `src/features/addresses/components/address-form.tsx`, `src/features/orders/components/checkout-address-fields.tsx`, `src/features/addresses/schemas/address.ts`; criar `src/features/addresses/postal-code.ts` e `postal-code.test.ts`; estender cenários em `scripts/store-ui.test.mjs`.

**Interface:** `formatPostalCode(value: string): string`, exibindo `12345-678`; normalização persistida continua sendo oito dígitos pelo schema. Reutilizar nas duas superfícies, sem nova consulta de CEP.

- [ ] Reproduzir em checkout e Minha Conta: digitar oito dígitos, colar com/sem hífen, autofill, apagar, inserir no meio e substituir seleção. Registrar DOM/value antes de alterar; verificar build/runtime servido se o problema não aparecer no checkout atual.
- [ ] Fixar os casos: `12345678 → 12345-678`, último dígito preservado, incompleto não validado, valor com nono dígito rejeitado pelo contrato sem salvamento silenciosamente truncado. Verificar cursor e erros associados.
- [ ] Implementar máscara compartilhada e integração RHF sem competir entre register/value/onChange. Limite visual nove caracteres, persistência oito; servidor continua validando independentemente do browser.
- [ ] Executar unitários de CEP/schema e browser dos dois formulários. Aceite: oitavo dígito digitável/colável, não há consulta externa, dados enviados contêm o CEP completo.
- [ ] Atualizar documentação de formulários e registrar resultado da reprodução e da correção.

## T02 — Operações sem mudança

**Arquivos UI:** `cart-item-controls.tsx`, `inventory-form.tsx`, `product-form.tsx`, `category-form.tsx`, `address-form.tsx`, `profile-form.tsx`, em suas features atuais. **Servidor:** `cart/server/mutate-cart.ts`, `inventory/server/set-inventory.ts`, `catalog/server/manage-catalog.ts`, `addresses/server/mutate-address.ts`, `buyers/server/save-profile.ts`, Actions correspondentes. Testes existentes por feature e `scripts/store-ui.test.mjs`/`admin-ui.test.mjs`.

**Interface:** operações de edição passam a retornar, por inferência na própria feature, `{ success: true, changed: boolean }`. Criação/remoção e operações críticas não ganham uma semântica artificial de igualdade. Não criar tipo global genérico de mutations.

- [ ] Inventariar submits de edição e refreshes dependentes; classificar cada um como edição comparável, criação, consulta explícita ou operação crítica. Limitar correções aos comparáveis observados; registrar descartes, especialmente senha/pagamento/checkout/logout.
- [ ] Fixar testes de submit igual: zero Action/POST, invalidateQueries ou router.refresh; mensagem “Já está atualizado.”. Testar quantidade `01` igual a 1 e textos normalizados conforme schema, sem normalizar indevidamente senha/descrição.
- [ ] Comparar payload normalizado com baseline confirmada no cliente. Voltar ao valor inicial remove dirty efetivo; mudanças em uma imagem futura também contarão em T10. Criação segue explícita, sem supor que dois cadastros iguais são a mesma intenção.
- [ ] Servidor: validar entrada, autenticar/autorizar, resolver ownership e revisão, então comparar estado atual. Se igual: `changed:false`, sem UPDATE de negócio, revisão ou audit de alteração. Não comparar CPF pelo sufixo mascarado nem por ciphertext aleatório; CPF ausente preserva o atual, valor fornecido só é comparável no servidor autorizado.
- [ ] Actions/clientes revalidam somente se changed não for false. Preservar budgets de segurança e checks de revisão; revisão velha retorna CONFLICT mesmo em edição aparentemente igual.
- [ ] Executar testes direcionados e integração dedicada: alteração real continua persistindo/auditando uma vez; no-op direto não escreve negócio; usuário não autorizado não obtém sucesso por igualdade. Medir contagem de requests no browser, sem alegar zero SQL para chamadas maliciosas diretas.

## T03 — Debounce e proteção do carrinho

**Arquivos:** criar `src/features/cart/cart-update-queue.ts`/`.test.ts` e `server/cart-budget.ts`; alterar `cart-item-controls.tsx`, `cart-provider.tsx`, `cart-drawer-context.ts`, `add-to-cart-button.tsx`, `cart-drawer.tsx`, `actions/cart-item.action.ts`, `actions/add-to-cart.action.ts`, `server/mutate-cart.ts`; `src/lib/abuse/policy.ts`, `src/db/schema/abuse-budgets.ts` e migration Drizzle gerada pelo fluxo existente.

**Interfaces:** contexto do carrinho expõe `requestQuantityUpdate(productId: string, quantity: number)`, `flushQuantityUpdates(): Promise<boolean>` e cancelamento por item. Fila guarda intenção, não preço/estoque. Servidor retorna RATE_LIMITED com retryAfterMs quando necessário. Reutilizar `changed` de T02.

- [ ] Testes com relógio controlado: dez submits/edições dentro de 500ms geram um envio do último valor; antes de 500ms não há envio. Editar sem submit não agenda mutation. Draft que retorna ao confirmado não gera request.
- [ ] Implementar fila serial: um envio em voo no carrinho, último valor pendente por produto; prazo é o maior entre silêncio de 500ms e intervalo desde o último despacho. Preservar draft mais novo quando resposta anterior chega. Remoção cancela update não enviado e não deixa uma resposta tardia recriar item.
- [ ] Reconciliar estado confirmado; consolidar leitura do carrinho após a sequência, retirando `router.refresh()` apenas quando demonstradamente redundante. Fechar/desmontar/logout cancela pendências ainda não enviadas e descarta respostas de identidade antiga.
- [ ] Link de checkout aguarda flush das intenções já solicitadas e leitura confirmada. Falha/estado incerto impede avançar com falso sucesso; não repetir automaticamente uma adição. Adicionar mantém semântica de incremento e proteção em voo/cooldown, sem fundir adições legítimas em set absoluto.
- [ ] Estender budget existente com operação cart.write (60/60s) e lastAcceptedAt para intervalo mínimo 500ms. Criar helper de carrinho sem quebrar assinatura dos consumidores atuais de reserveAbuseBudget. Reserva/rejeição concorrente é atômica; rejeição não renova a janela. Preservar ordem de locks e reserva quando savepoint comercial falha.
- [ ] Testar rajada de chamadas diretas, concorrência e reset do cooldown em DB dedicado; nenhuma tentativa acima do budget altera quantidade. Browser mede uma mutation por sequência estabilizada e GET consolidado, sem polling extra; repetir com rede lenta, dois itens, duas abas, logout e retry manual.
- [ ] Documentar os limites e mensagens de espera; revisar segurança do novo budget/migration antes de avançar.

## T04 — Cortina universal e scrollbar

**Arquivos:** `src/components/shared/curtain-controller.tsx`, `curtain-context.ts`, `context-link.tsx`, `route-ready.tsx`, `page-transition.tsx`, `navigation-motion.css`; `src/features/auth/components/use-logout.ts`, `login-form.tsx`, `register-form.tsx`, `session-activity.tsx` e consumidores de navegação identificados. Criar `src/components/shared/navigation-context.ts`/`.test.ts`; usar `scripts/store-ui.test.mjs`, `auth-ui.test.mjs` e `admin-ui.test.mjs`.

**Interface:** `navigationContext(pathname): 'admin' | 'store'`; controlador expõe observação de intenção e commit, com sequence única. `ContextLink` é conveniência, não requisito para cobertura global.

- [ ] Fixar matriz: Link comum admin→loja e inverso; push/replace; login com retorno admin; logout; expiração/revogação; redirect servidor; back/forward; navegação cancelada; caminho /administrator; modifiers/new tab/download/external excluídos.
- [ ] Evoluir controlador raiz para observar intenção interna elegível sem substituir primitivas Next nem patch de router interno. Toda troca efetiva de contexto é detectada no commit; fallback de redirect entra coberto antes da pintura e libera no destino real. Não esperar pelo destino privado original quando ele virou login/403/erro.
- [ ] Fazer navegação/ação começar imediatamente; preservar prefetch e comportamentos nativos. ContextLink e observador global deduplicam a mesma intenção. Logout revoga sessão imediatamente; cortina não guarda DOM admin nem adia autorização. Histórico não apenas abandona uma troca de contexto válida.
- [ ] Contratar fallback de documento completo com marcador mínimo de contexto/tempo, nunca conteúdo privado; degradar com segurança se storage indisponível. Não prometer animar aba fechada ou saída para site externo. Revisar guias Next instalados antes de escrever o hook de commit.
- [ ] Centralizar acquire/release do scroll lock: salvar estilos e compensação de scrollbar; esconder antes da entrada, restaurar depois da saída/recuperação. Cleanup de fase não libera o lock de outra fase/intenção. Preservar posição no cancelamento e respeitar scroll do destino na navegação concluída.
- [ ] Executar browser para toda a matriz e medir scrollbar invisível enquanto active e restaurada ao fim. Watchdog 5s, Escape, reduced-motion, erro, redirect e unmount restauram foco/scroll/inert. Touch e teclado continuam funcionais; qualquer falha mantém navegação segura sem overlay preso.

## T05 — Squash and stretch da cortina

**Arquivos:** `navigation-motion.css`, somente o markup estritamente necessário em `curtain-controller.tsx`, e documentação motion local.

**Consome:** estado e duração de fase de T04. **Produz:** superfície deformável independente do conteúdo textual.

- [ ] Criar superfície visual em pseudo-elemento ou filho separado; texto/controle não recebem scale. Somente translateY/scaleY, escala X=1, largura integral e overscan vertical.
- [ ] Autorar keyframes com scaleY 0.96–1.08 e base curva durante o deslocamento; coberto é totalmente opaco/retangular ou excede viewport para não abrir cantos. Usar uma fonte de duração (500ms por fase), sem conflito CSS/JS.
- [ ] Conferir capturas e playback em 390/768/1440px: largura sempre cobre ambos os lados, sem scroll horizontal, texto estável, efeito de alongamento descendente e base arredondada perceptíveis. Corrigir a curva por observação, sem introduzir biblioteca.
- [ ] Reduced-motion omite deformação/espera e conserva conclusão de navegação; validar interrupção no meio e watchdog de T04.

## T06 — Hover de 300ms

**Arquivos:** `src/components/ui/button.tsx`, `src/app/globals.css`, links que usam aparência de botão em Sobre e checkout/carrinho.

- [ ] Inventariar hover de ações principais e variantes destrutivas/secundárias; ajustar transição de cores para duration-300 ou token específico 300ms. Não mudar o token global de motion de página de 180ms por consequência.
- [ ] Manter contraste preto/âmbar, estados de disabled/foco e reversão suave ao sair do hover. Sem transition:all; reduced-motion mantém alternativa imediata.
- [ ] Conferir Button e admin-action no navegador, incluindo link com aparência de botão e variante de erro. Não criar teste unitário que apenas copie classe CSS.

## T07 — Favicon GB

**Arquivos:** criar `src/app/icon.svg`; conferir favicon/metadata existentes em `src/app` e remover apenas ativo padrão conflitante se necessário.

- [ ] Gerar GB vetorial a partir dos glifos da Fraunces usada no wordmark; respeitar licença da fonte e converter letras para paths, sem dependência de fonte externa no SVG.
- [ ] Aplicar preto/âmbar e viewBox quadrado; confirmar nitidez em 16 e 32px e funcionamento como recurso de imagem, sem texto cortado.
- [ ] Verificar descoberta automática pelo App Router instalado, Content-Type e ícone na aba com cache renovado. Preservar metadata de página existente.

## T08 — Catálogo com cards mais largos

**Arquivos:** `src/app/(store)/products/page.tsx`, `src/features/catalog/components/product-grid.tsx`, `product-card.tsx`, `product-image.tsx` quando limitar largura, `catalog-filters.tsx`, CSS local necessário. Home é consumidor a preservar.

**Interface:** se necessário, `ProductGrid` ganha variante explícita `layout: 'home' | 'catalog'`, padrão home; catálogo usa layout próprio sem mudar os demais consumidores.

- [ ] Capturar baseline em 390/768/1024/1440/1920px e guia de breadcrumb/título/descrição.
- [ ] Expandir apenas área filtro/resultados até 1680px, margem mínima 24px desktop e filtro esquerdo 280px quando couber. Usar CSS responsivo/container, sem medição JS de viewport.
- [ ] Distribuir cards com mínimo desejado 260px; três colunas a 1440px e quatro quando espaço comportar. Remover max-width interno que impedir a imagem de acompanhar a largura do card, preservando aspect ratio e limites de thumbnail/detalhe.
- [ ] Preservar Drawer mobile, URL de filtros, paginação, conteúdo e Shared Element. Conferir reflow 320px, zoom 200%, nomes longos e foco; não haver scroll horizontal global.
- [ ] Comparar Home antes/depois para comprovar que sua grade não foi expandida. Atualizar documentação de catálogo e validar no browser e gates proporcionais.

## Fechamento de cada Task

Atualizar o checkbox no plano principal com evidência real. Usar `npm run check`, whitespace e gate por risco; mudanças de servidor/DB acrescentam integração dedicada e revisão de segurança. Motion/layout exige inspeção em navegador, não apenas build. Não executar migrations fora do ambiente explicitamente preparado.
