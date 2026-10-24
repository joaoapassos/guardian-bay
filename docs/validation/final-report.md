# Epic 12 — resultado atualizado após correção do Zod

**Resultado: correção aprovada nos gates; validação integral da Epic permanece pendente.** Os cenários exploratórios de 10, 50 e 100 usuários passaram nos dois workloads. O cenário de 500 usuários reprovou; 1000 não foi executado. Burp humano continua pendente.

Correção autorizada em `4883e34`: Zod 4.6.7, sem mudanças de regras comerciais, migrations, outras dependências ou política de exceções. [Correção e reteste](zod-retest.md) detalha evidências, tentativas preservadas e limitações. [Resultados atuais](results.json) registram runId, build, SHA do harness, árvore de produto e esperado/observado. [Resultados anteriores](results-zod465.json) preservam o bloqueio SCA original.

| Grupo | Resultado observado | Limite |
| --- | --- | --- |
| SCA | Produção zero findings; quatro Moderate de ferramentas aceitos pela política existente | Não demonstra ausência de vulnerabilidades desconhecidas |
| Gates | Lint, TypeScript, build, 115 unitários, 185 PostgreSQL e 13 HTTP/browser PASS | Testes automatizados não substituem pentest humano |
| Gitleaks / Semgrep / actionlint | PASS após atualização | Cobertura delimitada pelas regras existentes |
| Identidade, entradas, negócio e concorrência | Retestes aprovados: 14 + 10 + 16 + 5 verificações | Burp, canal temporal e expiração natural de boleto de 24h pendentes |
| Carga exploratória | 10, 50 e 100 VUs: leitura e comércio PASS, zero erro inesperado | Aquecimento 15s e medição 60s; sessões provisionadas; não mede login/confirmação sob carga |
| 500 VUs | Aquecimento e pico reprovados; p95 acima de 1s e falhas | Recusas transitórias de conexão com proxy local; causa-raiz não isolada |
| Recuperação | Dez leituras consecutivas dentro do critério em 9,122s; integridade preservada | Medida após encerramento do runner; não é recuperação de todas as rotas |
| ZAP histórico | 40 mensagens ativas, duas regras GET sem alerta confirmado | Não reexecutado após o Zod; triagem passiva e cobertura completa pendentes |

Maior patamar exploratório aprovado neste laboratório compartilhado: **100 VUs**, com leitura p95 204,98ms/p99 255,15ms e comércio p95 236,79ms/p99 343,93ms. Isso não estabelece capacidade máxima de produção. Nenhum pedido inconsistente, estoque negativo ou pagamento duplicado foi observado nas verificações de integridade executadas.

A consolidação contém 64 registros PASS, dois LIMITATION e quatro FAIL. São registros de evidência, incluindo sumários de etapas e métricas individuais; não representam 70 testes independentes. As quatro falhas correspondem ao aquecimento de 500, seu sumário de capacidade, ao pico de 500 e seu sumário de estresse.

## Problemas e próximos passos

- **Zod High → risco de exaustão de memória → corrigido e gates repetidos.** Produção sem findings na nova execução; não houve exploração demonstrada da aplicação.
- **PERF-01: falha a 500 VUs → indisponibilidade transitória e latência → bloqueia esse cenário e escalada para 1000.** Não atribuir exclusivamente ao Next.js: proxy, host, sockets e gerador compartilham ambiente. Diagnóstico e eventual otimização exigem escopo separado.
- **Burp humano pendente → falta validação independente manual → bloqueia conclusão desse requisito.** Seguir [procedimento de identidade](identity.md) e registrar request/response e estado persistido sanitizados.
- **Alertas passivos CSP/HSTS/redirect/atributos do ZAP → triagem contextual pendente → não equivalem automaticamente a vulnerabilidade explorável ou falso positivo.** A ausência de HSTS foi observada no laboratório local.
- **Expiração natural de boleto e análise temporal não executadas → limitação de cobertura → permanecem explícitas.** Fixture envelhecida não equivale a aguardar 24h.

Correções do harness: espera de hidratação, intervalo válido de CPU e arquivos distintos para capacidade/estresse. Tentativa com CPU inicial não confiável preservada; thresholds mantidos. Revisão independente sem achados nas correções de amostragem. Testes de falha/travamento do monitor aprovados; interrupção real por taskkill não exercitada como cenário de teste.

Reprodução: [ambiente](environment.md), [cobertura](coverage.md), [capacidade](capacity.md), [estresse](stress.md). Não executar campanhas simultâneas no mesmo banco. Preservar logs privados; publicar somente evidências sanitizadas. Encerrar app/proxy, geradores e PostgreSQL dedicado ao concluir, sem alterar processos de outros projetos. Nenhuma conclusão cobre resistência a DDoS ou infraestrutura pública.
