# Epic 13 — diagnóstico e capacidade

Base histórica: c071a9b; resultados da Epic 12 permanecem preservados. Objetivo: localizar PERF-01 antes de escalar, com produto e harness em alterações separadas. Nenhuma declaração de capacidade para 5000 VUs.

## Task 01 — instrumentação de PERF-01

Aplicação, migrations e limites comerciais preservados. `lab.mjs serve` importa um observador exclusivo do laboratório tanto no proxy quanto no processo Next. Séries JSONL privadas limitadas a 50 MiB por processo registram PID/runId, RSS/heap, utilização/atraso do event loop e contadores agregados. Erros de stderr são classificados por allowlist de códigos; mensagem, stack, SQL, headers e URL não são persistidos. UNCLASSIFIED é uma lacuna explícita, não ausência de erro.

O gerador registra manifesto de runtime/SO/CPU/RAM, commit, árvore rastreada suja e hashes do lock/config/workload, além de memória/CPU cumulativa do k6 e métricas existentes de app/banco. Observadores ausentes ou obsoletos interrompem carga. Essa coleta não mede diretamente a fila interna do pool nem explica sozinha backlog do SO: a Task 02 fará a correlação controlada.

Recuperação exige dez registros consecutivos com status 200 **e** latência dentro da referência; nove erros rápidos seguidos de um 200 não passam. O resultado histórico de 9,122s permanece registrado, mas seu guard anterior não comprovava dez status 200. Não reescrever o histórico como sucesso integral.

`capacity.mjs` exige um único nível explícito (`100`, `250`, `500`, `1000`) e não avança para outro. Cada invocação é uma decisão operacional, não uma autorização automática. Os thresholds anteriores continuam válidos. Ainda não há suporte operacional autorizado/configurado para 5000, execução distribuída ou soak longo.

Validação sem carga: `node --test scripts/validation/diagnostic-contract.test.mjs scripts/validation/scope.test.mjs scripts/validation/supervision.test.mjs`. Os testes verificam recuperação com erros, limites explícitos e exclusão de texto sensível. Campanhas continuam exigindo SCA limpo, build, fixtures e cluster dedicado.

## Sequência aprovada

01 instrumentação; 02 diagnóstico PERF-01; 03 correção de laboratório comprovada; 04 correção de produto comprovada; 05 revalidar 100/250/500; 06 atividade legítima de sessão; 07 jornadas/dados; 08 staging observável; 09 perfil representativo; 10 correção comercial comprovada; 11 dimensionamento comprovado; 12 validar 1000; 13 validar 2000; 14 validar 3500; 15 validar 5000; 16 endurance/picos/recuperação; 17 reprodução independente.

Tasks condicionais sem gargalo demonstrado não autorizam alterações artificiais. Ausência de ambiente separado pode bloquear validações; documentação entregue não equivale a teste executado. Não ampliar destinos, infraestrutura paga ou limites sem configurar e revisar o escopo concreto.

## Task 02 — reprodução controlada local

Nova execução e sessões provisionadas, SCA produção zero findings; histórico anterior preservado. Usuário confirmou somente laboratório local: não há comparação em máquinas físicas separadas. [Resultados sanitizados](epic13-diagnostic-results.json) preservam métricas e manifesto de cada variante; trackedDirty registra o harness em desenvolvimento antes do commit desta Task.

| Transporte / jornada / entrada | VUs | p95 ms | Erros por iteração | Resultado |
| --- | --- | --- | --- | --- |
| Proxy / mista / rajada | 100 | 483,82 | 0% | PASS |
| Proxy / mista / rajada | 250 | 872,68 | 0,17% | FAIL |
| Backend / mista / rajada | 250 | 918,26 | 1,06% | FAIL/abort |
| Proxy / mista / rampa | 250 | 760,93 | 0% | FAIL latência |
| Proxy / catálogo / rampa | 250 | 26,00 | 0% | PASS |
| Proxy / conta / rampa | 250 | 112,72 | 0% | PASS |

Não houve escalada para 500 após a reprovação de 250. A nova baseline é diferente da campanha histórica em runtime instrumentado, horário e carga concorrente do host. Não comparar seus números como regressão de produto sem controlar esses fatores.

Recusas ocorreram também em 3139, não apenas no proxy. A rampa eliminou erros de conexão na variante mista, mas não resolveu sua latência. Sob variante mista, observou-se utilização do event loop do Next próxima de 100%, proxy abaixo de 20%, aproximadamente 0,86 core de CPU do app e zero lock waiters amostrados. Catálogo e conta separados passam, mas geram menos requests por ciclo e não demonstram que a conta sozinha explica a falha. O efeito da composição/volume precisa ser preservado na comparação.

Conclusão: há evidência de saturação do processo de aplicação no workload misto e um efeito da entrada em rajada. Não há prova de esgotamento de portas, PostgreSQL saturado ou falha exclusivamente no proxy; o intervalo dinâmico do Windows lido foi 49152–65535, sem captura de ocupação que comprove exaustão. Isso autoriza experimento local de capacidade por processo, não alteração de autorização, estoque, timers ou limites comerciais. Causa completa das recusas permanece não isolada.

## Task 03 — experimento de capacidade por processo

`LAB_APP_INSTANCES=2 node scripts/validation/lab.mjs serve` usa exclusivamente 3139/3140 em loopback, mesmo build e PostgreSQL, balanceamento round-robin e prontidão de ambos. Padrão continua uma instância. Encerramento/falha de um processo encerra a topologia; observadores e recursos incluem ambos. Nenhum ajuste de pool, cache, autorização ou orçamento comercial. O banco pode abrir até dois pools padrão; contador observado subiu de 19 para 29 processos/conexões de cluster.

[Resultados](epic13-diagnostic-results-task03.json): duas tentativas com 250 VUs/misto/rampa reprovaram por latência, p95 695,95ms e 754,44ms, ambas sem erros inesperados. O segundo ensaio teve pico de CPU host de 91,21%; o guard sustentado não foi atingido, mas esse ruído impede uma conclusão limpa de ganho entre topologias. Não há correção de PERF-01 aprovada, e não se avançou para 500.

Vinte leituras alternadas autenticadas A/B preservaram propriedade da conta e não expuseram token. Testes Node de contratos/supervisão: sete PASS. Revisão identificou risco de sobrescrita de repetições; evidências novas passaram a incluir quantidade de instâncias e identificador único de tentativa, também no manifesto. Relatórios anteriores permanecem preservados. O código de produto não mudou.

## Task 04 — decisão sobre correção de produto

Correção de produto não aplicada: nenhum trecho comercial foi isolado como causa de PERF-01. Foi coletado perfil CPU opt-in (`LAB_CPU_PROFILE=1`) dentro da instância local, por45s, sem porta inspector. [Sumário sanitizado](epic13-cpu-profile.json): 31070 amostras, 54,80% idle, 25,67% com runtime render Next na pilha, 2,05%GC e 0,56% incluindo formatação monetária. Categorias inclusivas sobrepõem; perfil inclui períodos fora da carga. Nomes de módulos ausentes não provam ausência de custo SQL em bundles.

A carga de250VUs/rampa com profiler também reprovou (p95717,15ms), sem erro inesperado. Esse run é diagnóstico com overhead, não baseline comparável. Não remover Zod, precisão monetária, consultas de autorização, auditoria ou locks para obter ganho especulativo. Perfil bruto com caminhos locais permanece ignorado. Task04 tem decisão/diagnóstico entregue, mas **não há correção comercial concluída/aprovada**.
