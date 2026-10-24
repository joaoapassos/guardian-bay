# Task22 — isolar proxy do processamento HTTP

LAB_HTTP_TRANSPORT=backend é uma opção exclusivamente diagnóstica de leituras para o conjunto fixo3139–3142, conforme número de instâncias validado pelo runner. Cookie sintético enviado manualmente em HTTP loopback; não representa navegação de browser/HTTPS ou configuração de produção. Host3449 preservado; nenhum endpoint financeiro ou externo. Padrão continua proxyHTTPS. Manifesto registra transporte e topologia. SCA de produção exige arquivo de gate real recente,15min, além de zero findings.

[Resultados](epic13-http-direct-backend.json):100direto passou p95341,84ms, lote368ms;250direto reprovou608,13ms, lote662ms. Zero errosHTTP e integridade global preservada. Em250: pico por processo63, sem tráfego ao proxy e TLS zero.

Comparação com250HTTPS/quatro processos: p95602,18ms e lote999ms, TLS p95497,64ms. Remover proxy reduziu duração do lote nesta tentativa, mas não aprovou SLO de leitura. Não se comprovou que substituir proxy resolveria PERF-01; instalar outra infraestrutura apenas com esse objetivo seria prematuro. Request duration e conclusão total do lote são medidas diferentes.

Próxima hipótese delimitada: quantificar custo do caminho SQL/driver sem renderização, com queries de leitura equivalentes, mesmo orçamento de conexões e sem app concorrente. Não alterar produção para inserir tracing que exponha parâmetros. O resultado precisa ser rotulado como isolamento sintético de SQL, não benchmark de aplicação ou evidência de5000HTTP.
