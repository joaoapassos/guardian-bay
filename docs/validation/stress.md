# Task 13 — estresse, picos e recuperação

`node scripts/validation/stress.mjs` exige SCA limpo e patamar medido de read+commerce aprovado na Task 12 para o mesmo run. Sem isso gera INCONCLUSIVE e não envia estresse. Não editar evidências para contornar esse pré-requisito.

Plano delimitado: repetir baseline estável por 30s, subir ao próximo patamar autorizado por 10s (máximo 1000), parar gerador e observar recuperação por até 120s; dez leituras consecutivas <=120% do p95 de referência e integridade preservada. Se a baseline falhar, não enviar pico. Threshold/resource/deadline do runner continuam válidos. Resultado de pico com threshold falho é registrado, não escondido como sucesso. Se 1000 for o maior patamar e passar, apenas o limite autorizado foi observado; não se descobriu automaticamente capacidade máxima.

Este runner oferece um ensaio de pico curto. Estresse sustentado e repetições longas dependem da capacidade/recursos demonstrados e escopo operacional renovado; não equivale a DDoS nem a teste de infraestrutura externa. A comparação de recuperação é de requisições locais, não tempo de renderização/browser completo. Gerador compartilha host e deve ser considerado na análise.

Observado nesta entrega: preflight bloqueou estresse, com um finding de produção e zero patamares de capacidade aprovados. Nenhum pico foi enviado; tempo de recuperação após saturação e limite de capacidade permanecem desconhecidos. Smokes da Task 11 não são reclassificados como ensaio de estresse.
