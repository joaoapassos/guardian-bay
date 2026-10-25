# Curtain Page Transition

[Skill](../SKILL.md) · [Compatibilidade](compatibility.md) · [Tokens](motion-tokens.md)

Usar entre áreas independentes, por exemplo Home → Perfil ou Loja → Admin, quando a navegação é client-side sob ancestral persistente e há saída segura da espera. Não usar para filtros, confirmação de compra, toda chamada `refresh`, acesso inicial ou detalhe da mesma entidade. O padrão completo é condicionado à orquestração; não deve virar bloqueio obrigatório do roteador.

## Sequência e visual

Curtain sólida da marca entra pelo topo, desloca-se para baixo, cobre a viewport com wordmark centralizado e sai continuando para baixo. Não inverter saída como se estivesse recolhendo. Logo não recebe zoom ou efeito adicional. Aplicar cores/tipografia/tempos de Tokens; indicador minimalista só quando a navegação permanece pendente depois da entrada. Nunca mostrar porcentagem fictícia ou tempo mínimo de logo.

| Estado visual | Evento e conduta |
| --- | --- |
| idle | Navegação elegível cria intenção local e inicia entrada; pedido/roteamento começam imediatamente pelo Link/roteador |
| entering | CSS movimenta a cortina. Destino pronto é registrado sem iniciar segunda animação; ao terminar entrada, sair diretamente se já pronto |
| covered | Wordmark visível. Havendo trabalho crítico pendente real, mostrar indicador/texto; sinal de prontidão ou resultado terminal inicia saída |
| exiting | Cortina continua para baixo; liberar conteúdo/foco quando revelado e limpar estado ao terminar |
| qualquer estado interrompido | Invalidar callbacks antigos, cancelar efeitos visuais e remover interdição; continuar navegação nativa ou assumir última intenção elegível |

Navegação rápida executa entrada/saída contínuas, sem dwell. Navegação lenta espera somente o conteúdo crítico declarado; ao exceder limite de oclusão em Tokens, revelar loading/erro da rota e devolver controle. A ausência de imagem opcional, recomendação ou boundary secundária não prolonga cortina.

## Orquestração recomendada

Usar overlay DOM/CSS e controlador Client pequeno montado em **layout comum persistente**, composto por layout Server; não em `template`, `page` substituída ou abaixo do loading que vai desmontar. O estado se limita à intenção ativa e à apresentação, sem Zustand obrigatório ou store comercial. Não congelar `children` Server, clonar/persistir DOM anterior ou guardar sessão/dados privados para manter a cena.

Iniciar aquisição de destino sem aguardar `animationend`. Aproveitar prefetch existente; não interceptar todo clique, modifier/new-tab, download, URL externa ou hash apenas para garantir cortina. `onNavigate` pode sinalizar navegação client-side; API não fornece callback de todos os recursos prontos. Tipos de transição podem classificar intenção, mas não são medição de carregamento.

**Limite da sequência perfeita:** o destino pode fazer commit antes de a entrada cobrir toda a tela. Para manter a cena estável é necessário demonstrar sincronização visual compatível com o roteador, sem segurar navegação, streaming ou conteúdo. Se isso não for viável, simplificar para reveal/feedback local ou navegação direta; não atrasar `router.push`, renderizar novamente a página antiga ou encobrir um flash com espera artificial. Não prometer sete fases perfeitas em qualquer rota.

React ViewTransition pode delimitar conteúdo participante, mas **não é o motor de uma cortina que aguarda rede**. Não esperar no update callback nativo por toda a aplicação nem disparar snapshot global em paralelo. No modo Curtain, desabilitar share/enter/exit/update de página que concorram visualmente; os callbacks de ViewTransition não são a fonte de prontidão. Overlay CSS permanece independente de um capture `ready` ou `finished`.

## Contrato limitado de prontidão

Antes de implementar, declarar qual destino e qual região crítica significam “apresentável”: por exemplo, resultado autenticado ou estado terminal, título, conteúdo essencial e fallback legível para mídia que falhou. Não exigir que toda a árvore React ou todas as imagens tenham terminado. Pagamento pendente é conteúdo válido, não razão para cobrir tela até aprovação.

Conceito de sinal, sem criar endpoint: um marcador Client mínimo **dentro do conteúdo crítico resolvido**, composto pelo Server, registra que aquele destino se comprometeu. Fallback de Suspense não emite prontidão do conteúdo; pode registrar apenas que há uma alternativa acessível para desbloqueio. Error/not-found/redirect concluído emitem resultado terminal ou provocam liberação segura. O marcador não busca dados nem altera domínio.

Associar sinal ao destino efetivo e à intenção ativa, incluindo query quando distingue o conteúdo, para evitar que conteúdo antigo ou redirect ainda em andamento o satisfaça. Mesmo pathname pode receber outra query; mesmo URL pode ter intenção substituída. Se não houver forma pública/confiável de correlacionar a montagem com a intenção atual, omitir Curtain nessa navegação. Não promover `pathname`, desmontagem do loading, `useLinkStatus().pending=false` ou `isPending=false` a sinal universal.

Não esperar efeito de prontidão que só roda após uma ViewTransition cuja conclusão depende dele: esse ciclo prende o overlay. Preferir CSS sem capture no modo Curtain e validar ordem real de commit/efeitos. Distinguir “conteúdo apresentado” de sucesso comercial/permissionamento.

## Corridas, falhas e limpeza

Intenção local de navegação recebe identificador de sequência. Timers, conclusão de CSS e sinal de prontidão só atuam sobre a sequência atual. Nova navegação invalida callbacks da anterior; se ainda coberta, pode manter a máscara e reassociar destino, sem flash de duas cortinas; o limite de oclusão não reinicia indefinidamente em cliques sucessivos. Se não houver correlação segura, remover máscara e deixar navegação seguir.

| Caso | Recuperação |
| --- | --- |
| Erro de rede ou erro da rota | Revelar fallback/erro e ação segura; não repetir navegação nem operação sensível automaticamente |
| Destino ausente ou acesso negado | Revelar o resultado seguro produzido pelo servidor, inclusive 404 usado pelo guard atual; não mostrar snapshot administrativo anterior |
| Redirect para login | Tratar login real como destino, limpar intenção não resolvida e restaurar navegação; não continuar esperando Admin |
| Animação cancelada, desmontagem ou exceção | Remover overlay, inert/bloqueio/scroll lock e cancelar listeners/timers da sequência |
| Preferência reduzida, CSS/API ausente | Não executar deslocamento nem aguardar seu evento; ir diretamente à navegação com feedback textual |
| Back/forward, nova aba ou root layout diferente | Preservar mecanismo nativo; não reconstruir transição ou histórico para obter Curtain |
| Aba volta de background ou bfcache | Reconciliar com destino atual; não restaurar máscara antiga, mesmo se timer/evento foi suspenso |

Escutar conclusão e cancelamento com escopo à animação certa; não concluir porque um spinner filho emitiu `animationend`. Ter saída independente de evento: watchdog limitado, unmount, redução de movimento e retorno da aba. Liberar interação em todos os terminais, inclusive rejeição inesperada. Cancelar overlay não cancela por si só uma navegação ou compra já iniciada; comunicar apenas o resultado conhecido.

## Foco, interação e roots

Enquanto coberto, conteúdo oculto não pode receber ponteiro/Tab; tornar inerte apenas região coberta, não o status e a ação de recuperação. Não tornar todo `body` inerte junto com a saída. Anunciar carregamento uma vez, sem capturar foco só para o logo. Ao revelar, conservar política de foco/scroll do roteador e orientar ao título quando necessário; se usuário já focou algo válido, não roubar foco de novo.

Entre **root layouts distintos**, controlador anterior é descartado por navegação de documento. Neste projeto Admin é layout aninhado sob a mesma root, mas isso deve ser reavaliado se topologia mudar. Sem prova de suporte cross-document, a solução é navegação normal; Curtain CSS de uma root não atravessa o reload. Não persistir overlay em storage para fingir continuidade.

## Critérios específicos

- Rápida: sem indicador fictício/espera mínima, sem animação duplicada ou flash perceptível.
- Lenta: estado pendente real, prontidão limitada e saída no limite sem prender usuário.
- Sucessiva: apenas a intenção atual conclui; callbacks anteriores nunca cobrem novamente a página nova.
- Falha/redirect/403/404/reduced motion/unmount: conteúdo seguro e recuperação acessíveis, zero máscara/interdição residual.

[Vídeo conceitual fornecido](https://www.youtube.com/watch?v=WmvpJ4KX30s): não foi possível acessar nesta consulta. A sequência textual da tarefa foi a referência visual; nenhum detalhe do vídeo é apresentado como observado.
