# Auditoria do bootstrap Ubuntu 24.04/26.04

Task de compatibilidade revisada em2026-10-26, sem provisionamento privilegiado. O instalador existente é preservado.

| Área | Resultado e limite |
| --- | --- |
| Preflight/entrada | Linux x64, Ubuntu24.04/26.04 explícitos; Node24.19+, npm10+, sudo/flock e systemd preservados. Dry-run não instala nem comprova npm/portas/rede. |
| Pacotes | VERSION_ID seleciona noble-pgdg/resolute-pgdg; fingerprint PGDG fixo, Signed-By e amd64 preservados. Fonte conflitante recusada antes do primeiro update. PostgreSQL18/client18 explícitos; Caddy Ubuntu/universe. |
| Recuperação APT | Backup persistente de createcluster.conf com conteúdo/dono/modo; finally e retomada restauram política e máscara temporária do Caddy. Falha de recuperação mantém journal. Teste com falha de comando simulada; interrupção real de dpkg pendente. |
| PostgreSQL | pg_createcluster/pg_ctlcluster, /etc/postgresql/18/guardian-bay, /usr/lib/postgresql/18/bin e unidade postgresql@18-guardian-bay mantidos. Versão e identidade conferidas em runtime; loopback, roles/HBA/grants separados preservados. |
| Usuários/ambiente | useradd/getent/id/runuser, nologin, permissões Unix, segredos persistentes e contas build/migração/web continuam necessários. Sem alteração SQL, de privilégios ou diretórios. |
| Release/admin | Node/npm existentes copiados; npm ci pelo lockfile, dependências nativas (Argon2/sharp) e build precisam funcionar na VM. Selagem root-owned, senha por TTY e admin persistente mantidos. |
| Serviços/HTTPS | systemctl/systemd-analyze, sandbox da unidade, Next loopback, caddy validate, tls internal e health/rollback preservados. Paths /lib e /usr/lib para unidade Caddy já contemplados. Templates testados, execução/reboot pendentes. |
| Estado | Configuração original e segredos não são substituídos em rerun; troca de SO não é upgrade automatizado. Rollback de release/proxy não desfaz migrations ou pacotes instalados. |

Fontes oficiais consultadas: [PGDG: Ubuntu suportados, amd64 e PostgreSQL18](https://www.postgresql.org/download/linux/ubuntu/), [índice PGDG](https://apt.postgresql.org/pub/repos/apt/dists/), [Caddy no Ubuntu26.04](https://packages.ubuntu.com/resolute/caddy), [pg_createcluster no26.04](https://manpages.ubuntu.com/manpages/resolute/man1/pg_createcluster.1.html). A disponibilidade documentada não comprova instalação real.

Antes de declarar validação operacional, executar em VMs24.04 e26.04.1: instalação limpa, rerun, recuperação de falha APT, versão18/roles/grants efetivos, migrations, admin, build, reinício/reboot e HTTPS confiável pelo Windows em cada topologia usada. Nenhum desses smokes foi executado nesta sessão Windows. Instruções de rede e TLS em [onboarding](onboarding.md#virtualbox-e-navegador-no-windows).
