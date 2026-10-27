# Compatibilidade do bootstrap com Ubuntu 26.04

**Task:** adaptar o instalador existente conforme a especificação fornecida, preservando Ubuntu 24.04, Node24.19+, npm10+, systemd, PostgreSQL18 e isolamento atual.

**Decisão:** mapear explicitamente 24.04 → noble e 26.04 → resolute no preflight e reutilizar esse mapa no APT. Não aceitar outras distribuições nem reutilizar noble no Ubuntu26.04. PGDG documenta ambas as séries e PostgreSQL18: https://www.postgresql.org/download/linux/ubuntu/ (consulta em 2026-10-26).

**Critérios:** aceitar apenas Linux/x64/Ubuntu nas duas versões; manter versões de ferramentas; fontes assinadas por distribuição, fingerprint fixo e recuperação de política; nenhum provisionamento neste host Windows. Testes determinísticos não comprovam instalação real.

- [x] Auditar entrada, pacotes, PostgreSQL, ambiente, release, serviços, proxy, estado e templates.
- [x] Adicionar regressões de plataforma e seleção APT; observar falha antes de implementar.
- [x] Centralizar distribuição e validar fonte antes de mutações APT; preservar recuperação.
- [x] Documentar auditoria, limites e acesso Windows/VirtualBox sem ampliar exposição.
- [x] Executar test:scripts, check, build e whitespace; registrar resultados e pendências.

## Resultado local

Branch `fix/bootstrap-ubuntu-26`. Ubuntu26.04/26.04.1 reconhecido; Ubuntu24.04 preservado. Fonte PGDG selecionada pela versão efetiva.

Checks já executados: `npm run test:scripts` (21 aprovados), `npm run check` (Biome, tipos e215 unitários aprovados), `npm run build` aprovado; `git diff --check` e `git diff --cached --check` sem erros. Host Windows, Node24.11.1; requisito do instalador continua24.19+. Assertions Unix de dono/modo não foram executadas neste host.

Usuário encerrou a ampliação de validação: não são necessários mais testes, apenas reconhecimento do Ubuntu. Revisão independente interrompida antes de conclusão; não alegar aprovação independente. Nenhum provisionamento, serviço ou migration foi executado.

## Validação operacional pendente

Em VMs descartáveis 24.04 e 26.04.1: instalação limpa, rerun, interrupção APT/restauração da política, versão18 e permissões DB, admin persistente, build, reboot, systemd, Caddy e confiança TLS no Windows. Nenhuma VM foi disponibilizada nesta sessão.
