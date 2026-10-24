# Task 4 — cobertura e execução dos gates

Data: 2026-10-23. Base comercial f1252b4; harness d4a34db. Ferramentas existentes executadas no Node 24 Linux local, sem instalar outro scanner ou relaxar regras.

| Controle | Observado | Decisão |
| --- | --- | --- |
| Gitleaks 8.24.3 | 260 arquivos indexados, zero findings não triados | PASS para árvore atual; não cobre histórico completo |
| Semgrep 1.140.0 | 178 arquivos, zero findings pendentes | PASS para regras locais; não prova BOLA ou integridade comercial |
| npm audit produção | Zod 4.6.5, GHSA-mrhx-c7xc-m3w5, High; versão afetada <4.6.6, fix indicado 4.6.7 | FAIL no gate; advisory confirmado na dependência, exploração da aplicação não demonstrada |
| npm audit completo | Finding Zod + quatro entradas Moderate Drizzle/esbuild já aceitas até 2026-11-06 | Não ampliar exceção; nenhum audit fix |
| actionlint 1.7.7 | Workflow sem erro | PASS de sintaxe, não comprova execução remota ou proteção de branch |
| GitHub runs do SHA f1252b4 | Connector retornou lista vazia para runs de PR | LIMITATION: wrapper filtra PR; não inferir situação de pushes |

SAST possui sete regras locais (avaliação dinâmica, HTML bruto, hashes fracos, shell string, Drizzle raw, taint request→sinks, random inseguro). Lacunas: autorização, fluxo entre módulos/Actions, estados comerciais e segurança do deployment exigem revisão/testes. Gitleaks usa regras padrão e exclui credenciais locais não rastreadas; histórico completo não faz parte do gate atual. SCA usa advisory/versionamento exatos e falha em novos findings; reporta indisponibilidade separadamente. Transitivas Python do Semgrep não têm hash lock, risco residual de reprodutibilidade já documentado.

Não adicionar scanners redundantes. Futuras regras Semgrep só com consumidor e casos negativos específicos. Artefatos locais: .vitest/sast.json e dependencies-{production,all}.json. Não são evidência imutável por si; resultados sanitizados acima registram execução. Política e configuração originais permanecem intactas.

Finding SCA-01: risco de esgotamento de memória em coleções Zod grandes. Body limit 16KB e contratos strict reduzem superfície, sem provar ausência de exploração. Bloqueia declarar SCA aprovado e testes agressivos de exaustão. Atualização necessita autorização e commit corretivo separado, seguida de reteste; a campanha pode continuar em cenários independentes limitados.
