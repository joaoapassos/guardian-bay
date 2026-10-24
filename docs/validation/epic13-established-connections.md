# Task25 — concorrência em conexões estabelecidas

Novo perfil established-http-burst-v2, LAB_CONNECTION_PROFILE=reuse, separado do padrão new. Aquecimento faz os mesmos GETs reais, verifica todos os status200 e retorna erro se qualquer um falhar. Depois de2s, medida uma rajada do mesmo tamanho. Medição continua p95<500ms/p99<1500ms, checks100%, erros inesperados<1%, contagem exata. Aquecimento lento aparece em warmHttpP95Ms; suas falhas não são ignoradas. Não há alteração de timeout de requisição, keep-alive ou produto.

Timestamp inicial/final exportado pelo k6 delimita janela. Observadores registram peakAt e o runner rejeita janela inválida, contagem incorreta ou PID sem amostra. Teste negativo garante que pico5000do aquecimento não seja usado como concorrência medida. Corpo descartado reduz memória do gerador, sem endpoint artificial; status302não passa como autenticação válida. Perfis não são intercambiáveis para aprovação.

[Resultados](epic13-http-established.json):100medidos, pico100no proxy, p95134,12ms.250medidos em três repetições, pico250em todas, p95296,03/357,51/335,33ms. Novos handshakes TLS na medição0; warm-up p95737,52/493,96/374,06/422,44ms preservados. Integridade PostgreSQL mantida. Recursos cobrem a campanha inteira, não apenas janela medida; RPS inclui pausas e warm-up, não throughput sustentado.

Tentativa500falhou ainda no aquecimento:217checks falharam de500, taxa43,4%; medição não executada. Amostra de warnings do k6 identifica recusa de conexão TCP3449; observer/proxy não registrou5xx, continuou vivo, e queries de integridade passaram. Sem breakdown de status dessa tentativa, não atribuir formalmente todas as217falhas à mesma causa. Os zeros de p95/pico na medição significam **ausência de medição**, não latência zero ou aprovação.

Próximo experimento: variar somente backlog do listener local e repetir nível500, preservando refusals/fases e sem alterar SLO/timeout. Node documenta backlog padrão511 e limite efetivo dependente do SO; a fila cheia é hipótese, não diagnóstico conclusivo sem comparação. [Referência oficial](https://nodejs.org/api/net.html).

Validação:11testes Node, Biome e revisão independente do perfil sem achados. Não há carga sustentada ou5000requests aprovadas;1250ou2500requests totais somadas entre tentativas não são concorrência simultânea.
