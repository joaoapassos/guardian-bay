# Task27 — controle HTTPS com outro gerador

node-http-control.mjs envia os mesmos500GETs reais para/products e/account, fixtures próprias, certificado local verificado, Agent com teto500sockets, timeout10s, deadline30s, guard de RAM85% e SCA de produção recente/sem findings. Após warm-up bem-sucedido, espera2s e repete500. Sem endpoint artificial, bypass de ownership ou mudança de servidor. Logs públicos têm somente contagens/timings; nenhum cookie/SQL/HTML.

Duas tentativas: warm e medida tiveram500HTTP200 em todas, sem erros de transporte. Primeira medição concluiu652ms, p95 após ClientRequest.finish565ms; segunda829ms/p95731ms. Essa definição difere de http_req_duration do k6 e **não aprova o SLO de referência**. O script retorna diagnóstico mesmo quando a latência é ruim; exit0 não significa PASS de capacidade.

Na segunda tentativa, observer confirmou500requests pendentes no proxy durante warm-up e495na medição; máximo por processoNext63. Não somar picos de processos nem afirmar500simultâneos medidos quando foram495. Invariantes PostgreSQL preservados. Resultados estão nos arquivos epic13-node-http-control-*.json, primeira execução sem enriquecimento de picos, segunda com janelas/observadores.

Comparação com k6: este havia falhado antes de medir500com204/221recusas de conexão; outro gerador completou500HTTPs. Isso aponta sensibilidade ao padrão de chegada/pacing e interação com admissão/TLS/encaminhamento; não prova bug no Go/k6 ou limite intrínseco do produto. Testes de transporte isolados também não eram validação de HTTP.

O orçamento explícito e redução de consultas foram mantidos. Próxima correção mínima: deduplicar resolução de sessão **somente dentro do render RSC da mesma request**, conforme guia instalado do Next, sem cache entre requests ou de recursos protegidos. Medir delta SQL real, testar A/B e revogação/expiração em HTTP e repetir o mesmo patamar. Isso ainda não promete resolver admissão ou5000requests.
