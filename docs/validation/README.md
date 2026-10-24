# Epic 12 — laboratório de validação

Base comercial: Epic 11 em f1252b4. A campanha não altera regras da aplicação. Scripts ficam em scripts/validation, procedimentos e resultados sanitizados nesta pasta, dados brutos privados em .vitest/epic12 (ignorada). Nenhum endpoint de bootstrap, bypass de autenticação ou redução de rate limit será adicionado à aplicação.

## Autorização e isolamento

Único alvo: https://127.0.0.1:3449, com backend exclusivo em 127.0.0.1:3139 e PostgreSQL 18 exclusivo em 127.0.0.1:55442/guardian_bay_test. Não apontar ferramentas para produção, outros projetos, DNS externo ou terceiros. Instalar ferramentas a partir das fontes oficiais é distinto de autorizar ataques aos seus sites. Guard exige origem, banco e lease local de até 24h; redirecionamentos externos não devem ser seguidos. Não executar simultaneamente campanhas DAST, carga e suites de integração que compartilhem dados.

Usuários A/B/admin, produtos e cartões são sintéticos. Cookies, senhas e chaves TLS não entram em Git nem nos relatórios publicados. Certificado local vale apenas para o perfil de laboratório; nunca desabilitar validação TLS do sistema. Build de produção obrigatório, sem next dev.

## Limites e interrupção

Primeiro smoke 1–2 usuários; carga 10, 50 e 100, avançando somente após aprovação do patamar anterior. 500 e 1000 dependem de recursos e sinais estáveis; não são metas garantidas. Até calibração, DAST limitado a uma thread e duas requisições/s, com deadline de dez minutos. Campanhas comerciais respeitam os budgets reais e usam identidades independentes; login não é repetido por iteração de carga.

Critérios provisórios: leituras p95 <= 500ms/p99 <= 1500ms; mutations p95 <= 1500ms/p99 <= 3000ms; erros inesperados < 1%; zero acesso indevido ou violação de integridade. Espera comercial de Pix/boleto é medida separadamente da latência HTTP.

Interromper: violação de integridade/acesso, OOM/reinício, erros inesperados > 5% por 30s, CPU > 90% por 60s, memória > 85% do limite ou conexões PostgreSQL >= 80% da capacidade reservada. Não prosseguir sem métricas. Recuperação: até dois minutos para retornar a até 20% da latência de referência. Timeout ou abort é resultado, não sucesso.

## Recuperação, dados e evidências

Interromper primeiro o gerador, preservar relatório sanitizado e métricas, verificar app/banco, executar auditoria de integridade e só então limpar fixtures da execução. Destruição de cluster exige processo parado e caminho absoluto verificado dentro de .vitest/epic12; esta campanha prefere retenção local ignorada e parada, sem remoção recursiva automática.

Registrar SHA, versões, configuração, ambiente, horário UTC, IDs de cenário/execução, esperado/observado e evidências. Resultado: confirmado, falso positivo, risco aceito, limitação ou inconclusivo. Uma captura de tela não substitui request/response e estado persistido. Uma ferramenta sem alertas não demonstra segurança absoluta. Proteção contra DDoS e segurança de infraestrutura pública ficam fora da conclusão.

## Sequência

1. Escopo/guard; 2. ambiente/dados/procedimentos; 3. matriz/evidências; 4. SDLC; 5. captura real; 6. ZAP; 7. identidade/autorização; 8. abuso/entradas; 9. negócio; 10. concorrência; 11. métricas/calibração; 12. carga; 13. estresse/recuperação; 14. consolidação/retestes.

Cada etapa tem commit e relatório próprio. Findings de produto não autorizam correção silenciosa; registrar impacto e obter aprovação para a correção. A conclusão de uma Task pode ser limitada pelo ambiente; distinguir entrega do procedimento de execução bem-sucedida de todos os cenários.
