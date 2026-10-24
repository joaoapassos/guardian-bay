# Task 6 — ZAP reproduzível

Distribuição utilizada: ZAP 2.17.0 Crossplatform, release oficial https://github.com/zaproxy/zaproxy/releases/tag/v2.17.0, SHA256 publicado 94c8f767b1c2e94f0db66b3ae56514d5e3f5a728ee1b6c798e0c8fe2d61fbff0. Download/extração somente em .vitest/epic12/tools/zap/ZAP_2.17.0. Java 25 local; versões/add-ons e logs brutos ficam no diretório privado da execução.

Executar `node scripts/validation/zap.mjs` com lease/ambiente já definidos. O script gera plano YAML (sintaxe JSON), liga apenas loopback, limita JVM a 512MB, desativa updates no startup, controla deadline, contexto e uma thread. Regras ativas: 40012 XSS refletido e 40018 SQLi, strength Low, delay de 500ms, no máximo dois minutos de scan; apenas GET /products. Não há POST fuzzing, OAST ou ataque de exaustão. Leituras passivas conhecidas de anônimo/A/B/admin têm controles positivos prévios. Não equivale a autenticação automática de todos os scanners nem cobertura completa de mutations.

## Observado

Execução final: 40 mensagens ativas (26 XSS, 14 SQLi), zero alertas dessas regras; sete tipos de alerta passivo. As primeiras tentativas enviaram zero mensagens ativas, apesar de exit 0; foram classificadas inconclusivas e preservadas. Semeadura da URL parametrizada antes do nó sem query e adição explícita de parâmetro permitiram exercitar os vetores. O wrapper agora exige contagem positiva de mensagens no log, além de report/exit; diretório novo por execução evita somar evidência antiga.

Triagem inicial:

| Alerta | Decisão |
| --- | --- |
| CSP wildcard / script-src / style-src unsafe-inline | Fraqueza de configuração confirmada: CSP parcial sem diretivas restritivas de script/style/default. Não significa que o header contenha literalmente unsafe-inline ou que XSS esteja comprovado. Não corrigida silenciosamente. |
| HSTS ausente | Confirmado no laboratório; deployment HTTPS público não avaliado. Não impor HSTS global em ambiente de certificado local. |
| Big Redirect | Potencial vazamento, exige inspecionar conteúdo/controle anônimo na Task 7; alerta isolado não confirma segredo. |
| Modern Web Application | Informativo; exige exercício de Actions além do spider clássico. |
| Atributo HTML controlável | Informativo, não comprova XSS; corroborar encoding/DOM na Task 8. |

Report/log/plano brutos em .vitest/epic12/zap-run-*/; contêm cookies e não devem ser publicados. alerts-sanitized.json guarda somente ID/nome/risco/contagem. task-06-zap.json registra resultado da campanha; PASS significa execução no escopo, não aplicação livre de vulnerabilidades.

## Repetição manual

Importar o contexto exato da origem local; Safe para navegação, Protected para scan. Navegar e verificar identidade antes de capturar, separar A/B/admin. Desabilitar todas as regras ativas e habilitar somente as duas acima; uma thread e 500ms; sem seguir destinos externos. Conferir contagem de mensagens por regra no Active Scan: zero torna o caso inconclusivo. Exportar JSON/HTML redigido, anotar SHA/build/add-ons, conferir cada alerta contra HTTP/DOM/DB e registrar esperado/observado. Campanhas posteriores podem ampliar cobertura somente com novo escopo delimitado.
