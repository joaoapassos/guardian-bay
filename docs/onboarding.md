# Desenvolvimento local

[README](../README.md) é a referência de requisitos, versões e comandos; [arquitetura](architecture/README.md) define ambiente e camadas. Use npm e lockfile versionado. A referência de CI permanece Node 24.19.0/PostgreSQL 18.6; setup em outro Node não muda esse contrato.

1. Instale com `npm ci` e execute `npm run check`.
2. Para fluxos de dados, configure DATABASE_URL somente no ambiente ou arquivo ignorado, usando PostgreSQL de desenvolvimento. `.env.example` não contém credenciais reais. Não imprimir env/URLs em relatórios.
3. Execute `npm run dev`; use a porta indicada pelo Next. Home e GET de login permitem smoke sem banco. Fluxos de dados exigem schema preparado pelo fluxo operacional aprovado; este onboarding não executa migrations automaticamente.
4. Para uma Task, leia AGENTS, invariantes e fontes pertinentes; defina critérios/checks antes de editar.

## Testes com serviços

Compras com CPF exigem `BUYER_DATA_ACTIVE_KEY_ID` e `BUYER_DATA_KEYS` server-only, descritos em `.env.example`. Mantenha os valores reais somente no ambiente ou `.env.local` ignorado; testes usam chaves próprias em `.env.test.local`. Chaves são 32 bytes aleatórios em base64, indexadas por ID; rotação muda o ID ativo e preserva as antigas enquanto houver registros cifrados. Não substituir a chave por senha de usuário nem removê-la antes de recriptografar os dados dependentes. A falta da configuração falha de forma fechada, sem gravar CPF em claro. Reinicie o servidor de desenvolvimento após alterar o ambiente.

`npm run test:integration` exige TEST_DATABASE_URL explícita, loopback e banco guardian_bay_test, diferente do banco normal. Preflight impede fallback. A suíte aplica migrations e cria/limpa suas fixtures; só execute com destino dedicado confirmado.

Para repetir localmente, mantenha `TEST_DATABASE_URL` em `.env.test.local` (ignorado pelo Git), apontando explicitamente para `guardian_bay_test`, com credencial própria. Execute `npm run test:integration:local`: o comando carrega somente esse arquivo, valida o destino, aplica migrations nesse banco e executa a suíte sequencial. Não carrega `.env` nem deriva conexão de `DATABASE_URL`. O usuário de testes deve poder gerenciar o schema desse banco, sem ser superusuário, criar bancos ou administrar roles. Não reutilize a credencial da aplicação.

`npm run test:security` também exige SECURITY_BROWSER_PATH executável e OpenSSL. O contrato documentado de browser aceita Node 22.12+ ou 24+; Node 24.19.0 é referência do CI, não requisito exclusivo. O preflight atual verifica somente major >= 22: não comprova o minor mínimo documentado. Usa perfil/certificado temporários em loopback; sem login pessoal ou trust no sistema. Consulte README/harness antes de rodar. Instaladores de scanners SDLC são específicos de Linux x64; não reproduzir comandos bash como instaladores Windows.

## Diagnóstico e recuperação

Falha em check: guarde comando/exit code e trecho sanitizado; reproduza antes de mudar código. Build pode exigir acesso a Google Fonts conforme README. Não remover gates, ampliar ignores nem usar audit fix para obter verde.

Pare somente processos iniciados pela Task, identificados por PID/sessão. Não apague .next enquanto dev estiver ativo nem rode build concorrente na mesma saída. Preserve mudanças locais antes de reset/reinstalação.

Retomada confere git status, revisão, diff e preflights reais. Backups deste setup estão em `.vitest/toolkit-backup/` ignorado; recupere somente o arquivo necessário, comparando para não sobrescrever customizações posteriores. Não versionar caches ou secrets.

## Bootstrap Ubuntu local

`npm run system:init -- --dry-run` lista etapas sem alterar o host. O alvo de provisionamento é Ubuntu Server24.04 x64/systemd, Node24.19+ e npm10+, com sudo. O comando normal prepara pacotes, copia Node/npm existentes para ferramentas privadas da instalação, cria release isolada e executa npm ci com conta de build sem login. Não executa testes, seeds, drizzle push ou Drizzle Studio. PostgreSQL18 vem do PGDG com fingerprint fixado e Caddy do repositório Ubuntu assinado.

Cluster18/guardian-bay em127.0.0.1:5433, banco guardian_bay, credenciais distintas de runtime/migração. Runtime não recebe DDL nem acesso a outros bancos pelo HBA; audit_events e order_items têm somente leitura/inserção. Grants de tabelas novas precisam de revisão explícita no mapa operacional, sem DML automático irrestrito. A conta Linux de migração difere da conta web e de build. Código de migração é selado para leitura antes de receber a credencial operacional.

Estado público em /etc/guardian-bay/state.json; secrets.json e migrator.env privados de root; runtime.env0600 para a conta web. Senhas48 caracteres e chave CPF independente32 bytes são preservadas em rerun. Se segredos estiverem incompletos, restaure backup: o comando não inventa outra chave CPF. Se não existir, a .env.local do checkout recebe configuração local com dono original; arquivo existente é preservado. Credencial migrator só entra no processo operacional de migrations; drizzle.config.ts aceita MIGRATION_DATABASE_URL apenas nesse caminho.

Reexecutar com os mesmos argumentos pode reiniciar o cluster próprio e reaplicar grants; não adota clusters ou diretórios sem estado correspondente. A política create_main_cluster é desativada apenas durante apt PostgreSQL, com backup/restauração finally e recuperação na próxima execução. Caddy recém-instalado fica temporariamente mascarado para evitar iniciar sua página padrão antes da configuração. Clusters/serviços preexistentes não são sobrescritos.

Limite de evidência atual: preflight/dry-run e testes determinísticos executados no Windows; instalação real, interrupções de apt e isolamento de roles no Ubuntu ainda precisam de smoke em máquina descartável suportada. Não interpretar testes de geração SQL como execução das permissões em Ubuntu.


O bootstrap cria admin por CLI com Argon2id compartilhado com a aplicação, sem atravessar o cadastro público. Uma intenção com UUID é salva antes de cadastrar; se houver interrupção após commit, rerun reconhece somente esse mesmo admin e mantém a senha. Cancelar restaura o terminal. Sem identidade correspondente, e-mail existente causa recusa, sem promoção/reset. Arquivos de credencial não são argumentos de processo nem saída de terminal.

Após build, release fica root-owned e sem escrita para o processo web, com exceção de .next/cache; mídia/checkpoints ficam fora do build. A unidade guardian-bay usa EnvironmentFile runtime, conta sem login, ProtectSystem/ProtectHome e bind loopback. O Caddy mantém Host/Origin, limita body a6MB (o endpoint mantém limite menor próprio) e usa tls internal. Rerun pode reiniciar o cluster próprio; falha de build mantém o symlink anterior e falha de health após ativação tenta restaurá-lo. Isso não desfaz migrations: versões futuras incompatíveis exigem restauração operacional de backup.

Diagnóstico: `sudo systemctl status guardian-bay caddy postgresql@18-guardian-bay` e `sudo journalctl -u guardian-bay -u caddy`. Não publique logs/env com credenciais. A chave privada da CA permanece no storage do Caddy. Certificado público em /etc/guardian-bay/local-ca.crt, com confiança manual em cada cliente. HTTP não é usado como downgrade; instalação nova não cria redirect em80. Caddy existente usa fragmento e conserva os demais sites.

A distribuição WSL existente foi consultada somente para versão/PID1: Ubuntu24.04.4 com systemd. Ela não foi tratada como máquina descartável e seus serviços não foram provisionados pelo smoke. Testes de TTY/Argon2, cadastro em DB dedicado e templates não comprovam apt, reboot, firewall, CA ou deploy completo no servidor Ubuntu alvo.

Os checkpoints do seeder do operador ficam em var/seeds no checkout, preservando a privacidade de /var/lib/guardian-bay. Produtos seed não têm imagem. Para limpeza da mídia instalada, use o comando com `sudo -u guardian-bay` documentado no README; o comando comum de desenvolvimento não adquire permissões de produção automaticamente.
