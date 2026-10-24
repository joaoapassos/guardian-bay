# Epic 12 — resultado e pendências

**Resultado: validação integral pendente.** Foram entregues os procedimentos e runners das 14 etapas; carga progressiva e estresse não foram executados porque o gate SCA de produção falhou. Não declarar capacidade de usuários ou aprovação de segurança com base nesta campanha.

Base comercial: `f1252b4`. Código de produto, dependências e migrations preservados. [Resultados sanitizados](results.json) registram SHA do harness, árvore de produto, build, runId, cenário, esperado, observado e métricas. Artefatos brutos com sessões permanecem locais e ignorados pelo Git.

| Grupo | Evidência observada | Limite |
| --- | --- | --- |
| SDLC | Gitleaks e Semgrep sem findings; actionlint aprovado | Não substituem validação dinâmica; SCA falhou |
| ZAP | 40 mensagens ativas, SQLi e XSS GET sem alerta confirmado | Duas regras; alertas passivos exigem triagem |
| Identidade, entradas e negócio | Replays de Actions reais, ownership, origens, rate limit, valores e estados com verificações HTTP/DB | Burp humano e análise temporal pendentes |
| Concorrência | Última unidade, chaves repetidas/distintas, confirmação simultânea e disputa com escritor de estoque | Escritor de estoque controlado no DB; não equivale a fluxo admin HTTP |
| Integração existente | 185 testes PostgreSQL aprovados | Suite automatizada, não pentest independente |
| Calibração | 2 VUs: leitura p95 9,16 ms; comércio p95 13,49 ms; zero erro inesperado | 10/15 segundos; não é capacidade sustentada |
| Capacidade e estresse | Preflight bloqueou tráfego acima de 2 VUs | 10–1000 VUs e recuperação continuam inconclusivos |

## Problemas e decisões

- **Zod 4.6.5 / GHSA-mrhx-c7xc-m3w5, High → risco de exaustão de memória → bloqueia escalada de carga e aprovação final.** Finding de dependência confirmado pelo SCA; exploração da aplicação não demonstrada. Atualização depende de autorização separada, seguida de gates e reteste. Não há aceitação desse risco.
- **Alertas passivos CSP/HSTS/redirect/atributos → possível endurecimento ou exposição → exigem triagem contextual.** Não classificar automaticamente como vulnerabilidade explorável nem falso positivo. HSTS ausente foi observado no laboratório local.
- **Burp manual não executado → falta evidência independente humana → bloqueia conclusão desse requisito.** Procedimento disponível em [identidade](identity.md).
- **Expiração natural de boleto de 24h não aguardada → cobertura por fixture envelhecida → limitação explícita.** Pix e aprovação de boleto tiveram espera natural.
- **Falha/travamento do monitor → risco de gerador sem supervisão → corrigido no harness final.** Timeout do monitor, parada da árvore de processos criada pelo runner e fechamento limitado do DB; testes de falha e travamento reproduzíveis em `supervision.test.mjs`. Campanhas maiores continuam sem execução.

## Reteste e reprodução

Seguir [ambiente](environment.md), [cobertura](coverage.md), [ZAP](zap.md), [negócio](business.md), [concorrência](concurrency.md) e [desempenho](performance.md). Não executar suites que compartilhem o banco ao mesmo tempo. Renovar lease, gerar novo build/capturas quando o produto mudar e executar SCA imediatamente antes de escalar. Não editar relatório SCA para liberar carga.

Após correção autorizada do Zod: repetir gates, captura de Actions, cenários afetados, calibração e [capacidade](capacity.md); somente depois [estresse/recuperação](stress.md). Registrar novo runId e comparar resultados sem substituir a evidência histórica. Executar Burp Community manualmente e anexar evidências sanitizadas de esperado/observado.

Ao encerrar, parar geradores e processos exclusivos do laboratório e PostgreSQL dedicado; manter dados privados ignorados para reteste. Nunca encerrar processos de outros projetos ou remover diretórios sem verificar o caminho. Nenhuma conclusão cobre resistência a DDoS ou infraestrutura pública.

Gates finais: lint, TypeScript e 115 testes unitários aprovados; três testes Node de escopo/supervisão aprovados. Revisão independente das correções do monitor sem novos achados. A interrupção real da árvore por `taskkill /T` não foi exercitada; os testes simulam falha/travamento do monitor e comprovam o acionamento da parada.
