## Mudança e motivo

<!-- Problema, comportamento resultante e escopo. -->

## Validação

<!-- Comandos, resultados e evidência CI; skips/unrun separados de passes. -->

## Risco e revisão

Classe: normal / security-sensitive / infrastructure-sensitive (podem se acumular).

<!-- Impacto de segurança? Migration? Dependência nova? Threat model precisa mudar?
Para itens inaplicáveis, escreva N/A com justificativa; não marque falso sucesso. -->

- [ ] Validação server-side, autenticação/role atual e autorização verificadas.
- [ ] Ownership/IDOR e valores críticos server-owned preservados.
- [ ] Transações, concorrência e logging/audit revisados.
- [ ] Migration/schema e dependências/lockfile revisados, ou N/A justificado.
- [ ] Secrets/DTOs/erros e findings de scanners triados sem autofix.
- [ ] Testes/gates aplicáveis passaram; documentação/threat model consistentes.

<!-- Exceção: finding/local, evidência, justificativa, risco, mitigação,
responsável e prazo. Gate obrigatório ausente/falhando impede merge. -->

Política canônica: [SDLC seguro](../docs/architecture/sdlc.md).
