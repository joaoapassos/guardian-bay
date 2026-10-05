---
name: architecture
description: Planejar ou revisar localização de código, colocation e dependências no Guardian Bay conforme a arquitetura aprovada.
---

# Aplicar a arquitetura aprovada

Leia o [AGENTS.md](../../../AGENTS.md) e consulte [a arquitetura](../../../docs/architecture/README.md) para a camada afetada. Antes de editar, examine módulos relacionados, imports, aliases e configuração existentes.

1. Identifique o responsável pelo comportamento: rota/composição, domínio, UI compartilhada, infraestrutura transversal, banco ou hook transversal. Justifique a localização pelo uso concreto.
2. Trace os imports propostos, incluindo reexports e dependências transitivas de módulos client. Compare a direção com o mapa documentado e confirme que acesso a DB passa pelo server da feature. Diferencie `actions/` (boundary pública) de `server/` (implementação privilegiada): Client pode importar referência remota de Action apropriada, nunca `feature/server` ou `db`.
3. Verifique se componentes exclusivos continuam próximos da rota/feature, se reutilização justifica centralização e se cada componente independente tem arquivo próprio.
4. Para código App Router, leia o guia pertinente em `node_modules/next/dist/docs/`, especialmente `01-app/01-getting-started/02-project-structure.md` e `05-server-and-client-components.md`. Consulte também `01-app/02-guides/server-and-client-boundary.md` e, para Actions, `01-app/02-guides/server-actions.md`. Localize a parte que exige interação e mantenha `"use client"` na menor subtree necessária; preserve composição de conteúdo Server por props/children construído no pai Server.
5. Trace reads pelo Server Component e `feature/server`; exija motivo concreto para fetching client-side/polling ou interface HTTP. Confira writes por Action fina ou handler necessário, sem mutation durante render. Revise os DTOs e retornos para enviar somente dados necessários e serializáveis ao cliente.
6. Reutilize estruturas existentes. Para uma pasta/camada nova ou dependência entre features, explique o problema concreto e escolha a menor solução compatível. Informe conflitos antes de ampliar o escopo.
7. Revise o diff e execute checks existentes pertinentes, sem instalação de dependências ou correções alheias à Task.

Na revisão, indique arquivo/import, regra afetada e menor correção necessária. Não trate o mapa como enforcement já configurado no Biome. Não avance para outra Task nem acrescente contratos além da boundary aprovada sem necessidade do escopo.
