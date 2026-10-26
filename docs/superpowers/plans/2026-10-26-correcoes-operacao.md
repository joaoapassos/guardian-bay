<!-- Ajuste de execução aprovado: seeder padrão 200, máximo 1000; sem preparação de DNS/hosts/alias local. -->
# Correções e operação — plano de execução

> Para implementação: usar superpowers:executing-plans, uma Task por vez. Aplicar AGENTS/invariantes e preservar mudanças locais. Plano aprovado em 26/10/2026, com seeder padrão200/máximo1000 e sem DNS local. Não delegar por padrão; revisão especializada somente quando justificada.

**Objetivo:** executar as correções de interação, adicionar mídia real e seeder, e preparar bootstrap local Ubuntu.

**Arquitetura:** preservar app → feature/server → db, Client mínimo e operações privilegiadas revalidadas. A instalação é CLI operacional separada do servidor web; serviços e migrations exigem a invocação explícita de system:init.

**Stack:** versões atuais Next 16.4.3, React 19.2.8, Tailwind 4, Radix, RHF/Zod, Drizzle/Postgres.js; PostgreSQL 18, Node 24/npm. Sharp será dependência runtime explícita se não estiver no manifest; não depender somente da cópia transitiva.

**Spec:** [especificação para revisão](../specs/2026-10-26-correcoes-operacao.md).

## Ordem única

| Ordem | Task | Plano responsável | Dependência |
| --- | --- | --- | --- |
| 1 | T01 CEP completo | [UX](2026-10-26-correcoes-ux.md#t01--cep-completo) | Reproduzir perda do oitavo dígito |
| 2 | T02 Bloquear salvamentos sem mudança | [UX](2026-10-26-correcoes-ux.md#t02--operações-sem-mudança) | T01 |
| 3 | T03 Debounce, fila e budget do carrinho | [UX](2026-10-26-correcoes-ux.md#t03--debounce-e-proteção-do-carrinho) | T02 |
| 4 | T04 Cortina universal e scrollbar | [UX](2026-10-26-correcoes-ux.md#t04--cortina-universal-e-scrollbar) | T03 |
| 5 | T05 Deformação vertical da cortina | [UX](2026-10-26-correcoes-ux.md#t05--squash-and-stretch-da-cortina) | T04 |
| 6 | T06 Hover de 300ms | [UX](2026-10-26-correcoes-ux.md#t06--hover-de-300ms) | T05 |
| 7 | T07 Favicon GB | [UX](2026-10-26-correcoes-ux.md#t07--favicon-gb) | T06 |
| 8 | T08 Área ampliada de catálogo | [UX](2026-10-26-correcoes-ux.md#t08--catálogo-com-cards-mais-largos) | T07 |
| 9 | T09 Contrato persistente de mídia | [Mídia e seed](2026-10-26-midia-seeder.md#t09--contrato-persistente-de-mídia) | T08 |
| 10 | T10 Upload e exibição | [Mídia e seed](2026-10-26-midia-seeder.md#t10--upload-e-exibição) | T09 |
| 11 | T11 Factory/seeder sem imagem | [Mídia e seed](2026-10-26-midia-seeder.md#t11--factoryseeder-sem-imagem) | T10 |
| 12 | T12 Bootstrap PostgreSQL e ambiente | [Inicialização](2026-10-26-system-init.md#t12--bootstrap-postgresql-e-ambiente) | T09–T11 para schema final |
| 13 | T13 Admin, serviços e HTTPS localhost/IP | [Inicialização](2026-10-26-system-init.md#t13--admin-serviços-e-domínio-local) | T12 |
| 14 | T14 Validação consolidada e documentação | [Inicialização](2026-10-26-system-init.md#t14--validação-consolidada) | Todas |

## Restrições globais

- Implementar somente a Task atual; atualizar seus checkboxes e evidências antes da próxima. Gates fazem parte da Task, não da entrega inteira somente ao final.
- Não trocar paleta, fontes da interface, arquitetura, regras de preço/pagamento ou garantias de sessão por efeito colateral.
- Toda igualdade é normalizada por schema no cliente e confrontada com estado autorizado no servidor. Nunca confiar em dirty, userId, role, preço, caminho de mídia ou estoque enviados pelo browser.
- Mudanças em schemas/budgets/mídia exigem migration versionada e revisão de segurança; aplicar somente em DB dedicado validado durante desenvolvimento.
- Testes técnicos de desenvolvimento não entram no system:init. Integração usa TEST_DATABASE_URL dedicada, sem fallback; bootstrap/seed não usam esse destino por acidente.
- Atualizar a documentação que é dona do contrato na mesma Task. Commits por Task na execução somente se autorizados nessa fase; não commitar este planejamento automaticamente.

## Foco de revisão

1. Rajadas, respostas fora de ordem, navegação para checkout e logout não perdem intenção confirmada nem ressuscitam estado privado.
2. Nenhum caminho de transição deixa scroll/foco presos; redirect de autorização não mantém DOM admin como snapshot.
3. Upload malicioso, ID de mídia de outro draft, falha de disco/DB e troca concorrente não permitem acesso arbitrário ou arquivo órfão permanente.
4. Seed interrompido em queda e reiniciado não duplica registros nem afirma ter criado itens que não foram persistidos.
5. Init repetido/abortado preserva dados, credenciais e chave CPF; usuário web não ganha poderes de provisionamento e outros clusters ficam intactos.

## Situação

- [x] Repositório e contratos pertinentes inspecionados; working tree limpa antes do planejamento.
- [x] Preferências de mídia confirmadas; revisão posterior retira provedor externo e usa placeholder no seed.
- [x] Escopo, dependências, interfaces e critérios definidos nos três planos.
- [x] Usuário aprovou execução: máximo1000/padrão200 produtos e sem DNS local.
- [x] T01–T13 implementadas; T14 consolidada com evidências e limites registrados.
- [ ] Smoke operacional completo em Ubuntu descartável e gate zero-upgrade com harness apropriado.

Dependências externas identificadas: máquina Ubuntu suportada com sudo para smoke do instalador; confiança na CA nos clientes da rede. São pré-requisitos operacionais, não lacunas de arquitetura a resolver durante cada implementação.

## Execução

Branch: feat/correcoes-operacao. Task atual: T14 — implementação e validação disponível concluídas; evidências operacionais externas pendentes.

Decisão: preservar o checkout e os documentos locais, usando branch própria sem criar outra cópia do repositório. Não há commit/push automático nesta execução.

T01: implementada máscara compartilhada. Testes de CEP/schema: 5 aprovados; typecheck aprovado; Chromium fixture passou nas quatro larguras, digitando oito dígitos em Conta e Checkout. Limite: problema de sete dígitos não reproduzido no código inicial sem máscara; integração explícita agora cobre a entrada.

T02: no-op em seis features; 52 testes de integração direcionados aprovados. A suíte completa detectou contrato antigo no teste de DTO administrativo de pedidos (arquivo não modificado pela Task); revisar em T14. Decisão: manter formato de sucesso legado e acrescentar changed:false somente no no-op, preservando consumidores antigos.

T03: fila trailing500ms, serialização, cancelamento e flush checkout; 5 testes de fila e 27 integrações de budget/carrinho aprovados. Biome/tipos e207 unitários aprovados. Chrome confirmou no-op semPOST/GET. Migration0019 gerada e aplicada apenas ao banco dedicado de testes.

Decisão T04: retirar retenção artificial de900ms da marca; navegação começa junto da entrada e saída começa quando conteúdo crítico está pronto, conforme skill motion local. Watchdog5s e fases500ms mantidos. RouteReady acrescentado às páginas com main e estados/auth que não sinalizavam prontidão.

T04: controlador global, scroll lock por intenção e prontidão nas páginas resolvidas. Check passou com208 unitários; Chrome passou em62s incluindo rota lenta, watchdog, redirect e reduced-motion. Corrigida regressão de foco em âncoras; teste espera desbloqueio antes de interagir com menu após documento completo.

T05: superfície pseudo-elemento com scaleY0.96–1.08, overscan e base curva; conteúdo não escalado. Chrome passou em62s; captura curtain-stretch.png inspecionada: superfície cobre largura integral sem cantos laterais vazios.

T06: Button, admin-action e dois links CTA usam transition-colors300ms com reduced-motion imediato. Check208 passou; Chrome confirmou duração computada0.3s e suíte responsiva passou em66s.

T07: icon.svg com outlines reais Fraunces800 extraídos da fonte instalada; favicon padrão removido.16/32px inspecionados; Chrome confirmou descoberta e Content-Type SVG, suíte passou em64s. Ferramenta fontTools temporária ficou em.vitest, sem dependência de runtime.

T08: área comercial até1680px com filtro280px; cabeçalho mantém guia anterior. Chrome passou em71s em1920/1440/1024/768/390/320, com asserts de margens, largura mínima260px e3/4colunas. Screenshot1440 inspecionada; Home usa variante padrão inalterada. Check208 passou. Ruling: ampliar o main somente no catálogo e conter os dois cabeçalhos, em vez de breakout por100vw — largura útil desconta scrollbar — duas classes locais evitam overflow sem wrappers adicionais.

T09: schema/DTO/readers e migration0020 implementados.211 unitários e39 integrações aprovados; constraints rejeitam origem/dimensões/chave/size inválidos e FK quebrada, DTO sem metadados privados. Drizzle check e drift passaram fora do sandbox. Limite db:check: etapa zero-upgrade não executável com role TEST_DATABASE_URL atual sem CREATEDB (consulta confirmou false); não ampliar privilégios automaticamente. Reavaliar esse gate emT14 com credencial de teste apropriada se disponível; continuar upload independente.

T10: upload/campo/prévia/anexação/read/limpeza implementados, Sharp0.35.5 explícito, migration0021 para budget10/min.215 unitários,22 integrações catálogo, Chrome admin41s e11 HTTP reais em47s passaram. HTTP cobre multipart>16KiB, body sem Content-Length acima do limite, privacidade e Origin; corrige cenário legado de carrinho para respeitar500ms e testa rajada recusada. Browser admin usava navegação sem limpar documento e sem cookie sintático do Proxy; fixture corrigida para inspecionar páginas efetivamente carregadas. Gate zero-upgrade continua limitado pela role de testes sem CREATEDB.

T11 revisada por instrução posterior do usuário: removidos provedor externo, downloads, créditos e deduplicação de fotos. Seeder cria produtos sem imagem, padrão200/máximo1000, estoque0–1000, lotes100, lock e retomada idempotente. Schemas de preço/conteúdo compartilhados com a aplicação permanecem. Checkpoints do operador no checkout; mídia privada continua com conta de serviço.

T12: bootstrap nativo, pacotes oficiais/PGDG com fingerprint conferido, estado/segredos, release/npm ci e roles/HBA/grants implementados.5 testes determinísticos e215 unitários passaram; dry-run sem instalação passou. Windows recusado antes de provisionamento. Smoke Ubuntu ainda não realizado. Ruling: contas Linux distintas para build/migração/runtime e release selada antes de migração — evita expor credencial DDL ao UID web. Ruling: política de criação main temporária e máscara apenas de Caddy novo, com restauração/retomada; não reconfigurar clusters externos.

T13: admin CLI/TTY, políticas compartilhadas sem reduzir cadastro público, build/serviço não root, Caddy TLS interno com fragmento, health e restauração de release implementados.215 unitários,18 testes de scripts e integração admin em DB dedicado aprovados. Dry-run completo aprovado. Ubuntu WSL24.04/systemd existente consultado somente para leitura; não é alvo descartável autorizado para provisionamento e não foi modificado. Falta smoke operacional em instância descartável, reboot e clienteLAN.

T14: revisão independente final encontrou permissões de checkpoint e tracking externo. Checkpoint do operador movido ao checkout, mídia privada preservada e cleanup instalado documentado com sudo-u de serviço. Tracking/provedor removidos por nova instrução do usuário, incluindo DTO, CSP, UI e schema (migration0022). Segunda revisão sem novos achados Critical/Important. Schema legado de migrations preservado e nova migration remove campos externos; aplicada somente a guardian_bay_test.

Validação final após retirar o provedor: npm run verify aprovado (Biome/tipos,214 unitários e build);220 integrações aprovadas;17 testes de scripts e integração real do writer aprovados; Chrome loja aprovado em50s nas seis larguras. Gate de dependências aprovado: zero alertas produção, quatro de tooling cobertos pela política já existente. HTTP Actions passou11 cenários. Teste legado adminOrderDetail alinhado ao snapshot administrativo mínimo já aprovado, mantendo assert de ausência de secrets. Fixture de serialização isola budget por cenário; proteção real continua coberta pelo suite de budget/HTTP.

Pendências de evidência: instalação completa/rerun/reboot/clienteLAN em Ubuntu descartável não realizados. Zero-upgrade exige CREATEDB no harness, ausente na role dedicada atual; não se ampliaram privilégios. Isso limita validação operacional e não autoriza alegar deploy Ubuntu comprovado. Nenhuma migration aplicada à base da aplicação, nenhum seed comercial criado e nenhum serviço Ubuntu provisionado durante esta execução.

Fechamento T14: Chrome admin aprovado31s, loja50s e segurança HTTPS/identidade/compra23s. O fluxo real encontrou remoção após update dentro do cooldown: flush agora aguarda500ms após resposta antes da próxima operação; sexto teste de fila reproduz e cobre a correção. Novo verify aprovado com215 unitários/build. Fixture browser respeita intervalo entre adições independentes, mantendo teste de rajada no HTTP. Whitespace staged/unstaged e Biome aprovados. Gate migrations parou na etapa controlada zero-upgrade, conforme limitação de CREATEDB já diagnosticada.

Operação e recuperação: comandos completos em README/onboarding. Não houve instalação de serviços neste host Windows/WSL nem alteração da DB comercial. Para rollout, executar system:init explicitamente no Ubuntu suportado; guardar backup conjunto de banco, mídia e segredos. Uma falha de ativação tenta voltar a release anterior; isso não desfaz migrations.

Revisão posterior solicitada pelo usuário: T05 revertida somente no visual. Cortina sólida volta ao deslocamento vertical simples de -100% a100%, sem pseudo-superfície, squash/stretch ou base deformada. Preservados controlador universal, scroll lock, prontidão, fases500ms, recuperação e reduced-motion. Expectativa do browser atualizada; não executada nesta revisão pontual.
