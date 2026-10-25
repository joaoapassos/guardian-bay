# Desenvolvimento local

[README](../README.md) é a referência de requisitos, versões e comandos; [arquitetura](architecture/README.md) define ambiente e camadas. Use npm e lockfile versionado. A referência de CI permanece Node 24.19.0/PostgreSQL 18.6; setup em outro Node não muda esse contrato.

1. Instale com `npm ci` e execute `npm run check`.
2. Para fluxos de dados, configure DATABASE_URL somente no ambiente ou arquivo ignorado, usando PostgreSQL de desenvolvimento. `.env.example` não contém credenciais reais. Não imprimir env/URLs em relatórios.
3. Execute `npm run dev`; use a porta indicada pelo Next. Home e GET de login permitem smoke sem banco. Fluxos de dados exigem schema preparado pelo fluxo operacional aprovado; este onboarding não executa migrations automaticamente.
4. Para uma Task, leia AGENTS, invariantes e fontes pertinentes; defina critérios/checks antes de editar.

## Testes com serviços

`npm run test:integration` exige TEST_DATABASE_URL explícita, loopback e banco guardian_bay_test, diferente do banco normal. Preflight impede fallback. A suíte aplica migrations e cria/limpa suas fixtures; só execute com destino dedicado confirmado.

`npm run test:security` também exige SECURITY_BROWSER_PATH executável e OpenSSL. O contrato documentado de browser aceita Node 22.12+ ou 24+; Node 24.19.0 é referência do CI, não requisito exclusivo. O preflight atual verifica somente major >= 22: não comprova o minor mínimo documentado. Usa perfil/certificado temporários em loopback; sem login pessoal ou trust no sistema. Consulte README/harness antes de rodar. Instaladores de scanners SDLC são específicos de Linux x64; não reproduzir comandos bash como instaladores Windows.

## Diagnóstico e recuperação

Falha em check: guarde comando/exit code e trecho sanitizado; reproduza antes de mudar código. Build pode exigir acesso a Google Fonts conforme README. Não remover gates, ampliar ignores nem usar audit fix para obter verde.

Pare somente processos iniciados pela Task, identificados por PID/sessão. Não apague .next enquanto dev estiver ativo nem rode build concorrente na mesma saída. Preserve mudanças locais antes de reset/reinstalação.

Retomada confere git status, revisão, diff e preflights reais. Backups deste setup estão em `.vitest/toolkit-backup/` ignorado; recupere somente o arquivo necessário, comparando para não sobrescrever customizações posteriores. Não versionar caches ou secrets.
