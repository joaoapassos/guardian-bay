# Matriz e critérios de evidência

Referências fixadas: [WSTG 4.2](https://wstg.owasp.org/v4.2/) e [ASVS 5.0.0](https://asvs.owasp.org/). WSTG organiza cenários; ASVS fornece requisitos aplicáveis de nível 2, sem alegação de conformidade integral. Usar identificadores completos ao selecionar cada requisito no relatório de execução; categorias abaixo não substituem checklist integral.

| ID do grupo | WSTG 4.2 / área ASVS | Risco e objetivo | Ferramenta / evidência | Aprovação |
| --- | --- | --- | --- | --- |
| CONFIG | CONF / configuração | Headers, CSP parcial, debug, TLS e superfícies | ZAP passivo + HTTP bruto, headers e inventário | Sem exposição de secrets/debug; lacunas CSP explicitadas |
| INPUT | INPV, CLNT / validação e encoding | SQLi, XSS refletido/armazenado/DOM e payloads extras | Burp/ZAP, request-response, DOM e DB antes/depois | Query não manipulada, sem execução JS, entradas inválidas sem efeito |
| IDENTITY | ATHN, SESS / autenticação e sessão | Enumeração, fixação, replay, revogação, expiração e cookies | Burp, dois perfis, login positivo/negativo e estado de sessão | Nenhuma identidade sem autenticação; cookies corretos; sessão final inválida |
| ACCESS | ATHZ / autorização | BOLA horizontal A/B e vertical customer/admin | Burp, replay cruzado e estado persistido | Negação na própria operação, sem leitura ou mutation indevida |
| CSRF | SESS / segurança web | Origin ausente/hostil, Host e forwarded forjados, corpo grande | Repeater/HTTP, referência positiva e negativa | Rejeição antes de efeito; não usar HTTP 200 como prova de sucesso comercial |
| ABUSE | ATHN, BUSL / abuso e recursos | Budgets por identidade/operação, reset, hashing e isolamento | HTTP cadenciado, counters DB e relógio | Caps reais, recovery e isolamento; bloqueio esperado não contado como erro inesperado |
| BUSINESS | BUSL / regras e autorização | Preço/desconto/total, quantity, método/cardId/fixture/status/tempo | Burp + SQL read-only; fluxos reais de UI | Autoridade server-side, snapshot coerente, sem pagamento real |
| CONCURRENCY | BUSL / integridade transacional | Última unidade, mesma chave e chaves distintas, expiração, auditoria e administração concorrente | Requisições independentes + testes PG + snapshots | Zero oversell/duplicação, finais imutáveis e auditoria exatamente conforme política |
| PRIVACY | ERRH / proteção de dados e logging | Cookies, senha, PAN/CVV, erro e bundle | ZAP/Burp + revisão de DTO/log, sem dados reais | Ausência de dados privilegiados nas saídas; evidência publicada sanitizada |
| PERFORMANCE | Não é certificação ASVS | Limites de latência, throughput e recuperação | k6 + OS + pg_stat_activity/locks | Thresholds e invariantes preservados no workload descrito |

## Registro por caso

ID; requisito versionado; objetivo/risco; ferramenta e versão; precondições/fixtures; passos; controle positivo; esperado; observado; status; evidência; horário/SHA/build; responsável/reteste. Ausência de controle positivo torna uma rejeição inconclusiva: request malformado pode nunca alcançar a regra investigada.

PASS é comportamento observado correspondente ao esperado; FAIL exige efeito/reprodução, não apenas alerta. Findings: confirmado, falso positivo com justificativa, risco aceito com dono/prazo ou limitação. INCONCLUSIVE indica evidência insuficiente. Não converter indisponibilidade de ferramenta em PASS. Relatórios k6 podem ter HTTP 200 e retorno comercial de erro; decodificar ambos.

`scripts/validation/evidence.mjs` mantém relatório estruturado em .vitest/epic12/reports, com hash da árvore src, SHA do harness, buildId, runId, esperado/observado e métricas numéricas. Não recebe bodies ou cookies; publicação sanitizada em docs/validation/results. Dados brutos sensíveis permanecem ignorados e com acesso local restrito. Screenshots são complementares, nunca evidência única de integridade.

## Independência

Procedimentos Burp/ZAP usam a aplicação real, sem página de probe. Suites antigas continuam regressão complementar. Operador deve repetir manualmente os casos documentados em navegador/perfil próprio e registrar resultado observado. Sessão provisionada não comprova login; manipular datas de fixture não comprova espera natural. Ambos devem ser identificados no relatório.
