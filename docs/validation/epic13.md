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
