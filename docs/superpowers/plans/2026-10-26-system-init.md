<!-- Ajuste de execução aprovado: seeder padrão 200, máximo 1000; sem preparação de DNS/hosts/alias local. -->
# Inicialização local Ubuntu — Implementation Plan

> Para implementação: superpowers:executing-plans, após T11 do [plano principal](2026-10-26-correcoes-operacao.md). Não instalar nem provisionar durante o planejamento.

**Goal:** `npm run system:init` prepara uma instalação local/na rede em Ubuntu, cria admin e inicia banco/aplicação sem interface gráfica.

**Architecture:** bootstrap Node CLI separado do runtime; somente passos de provisionamento usam sudo. Runtime web sem root, DB com papéis limitados e reverse proxy HTTPS. Reexecução retoma etapas sem sobrescrever dados/secrets.

**Tech Stack:** Ubuntu Server 24.04 LTS x64/systemd, Node24>=24.19.0/npm, PostgreSQL18, Drizzle versionado, Caddy e stack atual.

**Spec:** [contrato operacional](../specs/2026-10-26-correcoes-operacao.md). Senhas, HTTPS local, isolamento do DB, ausência de testes no instalador e restrição à rede local são globais.

## Review Focus

Sudo indisponível/OS não suportado; cluster/porta/serviço já existente; interrupção após criar segredo ou migration; admin já cadastrado e senha com espaços; CA não configurados em outro cliente. Cada um ganha smoke/check abaixo.

## T12 — Bootstrap PostgreSQL e ambiente

**Criar:** `scripts/system-init.mjs`, `scripts/system/preflight.mjs`, `packages.mjs`, `postgres.mjs`, `environment.mjs`, `state.mjs` e testes focados de planejamento de comandos/state. **Alterar:** package.json, .env.example, drizzle.config.ts para credencial de migration opcional e docs/onboarding.md/README. Templates de serviço pertencem a T13.

**Interfaces:** `runSystemInit(options): Promise<void>` orquestra fases nomeadas com estado durável sem secrets. `DATABASE_URL` continua runtime; `MIGRATION_DATABASE_URL` só é carregada pelo caminho operacional de migration, sem import no cliente/runtime. Valores existentes são preservados; chave CPF não é regenerada em rerun.

- [ ] Criar entrypoint Node somente com módulos nativos, executável antes de node_modules existir. Preflight detecta Ubuntu24.04/x64/systemd, Node/npm suportados, cwd, usuário de serviço, portas3000/5433/80/443 e sudo. Fora do alvo, sair sem instalar/apagar nada. Argumentos para portas/diretório/admin-email não exigem perguntas adicionais.
- [ ] Implementar dry-run que lista fases/comandos sanitizados e necessidades de sudo. Commands via spawn com argv, sem shell concatenado com senha, path ou entrada do usuário. Sudo mantém seu fluxo normal; não capturar senha sudo no aplicativo.
- [ ] Instalar pacotes necessários por fonte oficial verificada, incluindo PostgreSQL18/Caddy e ferramentas de build se exigidas. Configurar repositório PGDG quando necessário usando chave/fingerprint verificados na implementação; sem curl|sh, atualização global de npm ou troca de Node silenciosa. Executar npm ci com usuário não root e package-lock existente.
- [ ] Preparar cluster dedicado guardian-bay em loopback/porta5433 padrão; detectar cluster próprio versus preexistente. Não reconfigurar cluster de outro projeto ou liberar listen externo. Criar banco guardian_bay e roles distintas guardian_bay_app/guardian_bay_migrator com senhas crypto de48 caracteres.
- [ ] Dar DML estritamente necessário às tabelas da aplicação para runtime, sem ownership de schema/DDL/admin de roles; migrator limitado ao banco/schema próprios. Configurar HBA para esses roles no banco autorizado e rejeitar os mesmos roles em outros bancos. Não aplicar REVOKE global em clusters alheios; preservar defaults/controle dentro do cluster dedicado.
- [ ] Criar ambiente server-only com DATABASE_URL e chaves CPF independentes; guardar credencial migrator em arquivo separado protegido, carregado apenas durante tarefas operacionais. Permissões0600, diretório privado e ownership do serviço. Codificar URL corretamente; não imprimir valores. Detectar configuração incompleta e retomar sem rotacionar credenciais.
- [ ] Aplicar somente migrations versionadas via Drizzle com migrator; migration não usa runtime role, drizzle push ou schema generate. Garantir grants/default privileges corretos para novas tabelas. Não criar DB de testes ou copiar credencial do runtime para TEST_DATABASE_URL.
- [ ] Persistir conclusão de fase depois de verificar o recurso real. Reexecução não deve confiar somente em marcador: verificar cluster/role/DB/schema/migration. Falhas imprimem fase e ação de recuperação sem dump de env; não destruir o que funcionou por rollback global.
- [ ] Smoke em Ubuntu descartável, autorizado: instalação vazia, rerun, interrupção após secrets, sudo negado, porta ocupada e cluster alheio existente. Confirmar runtime sem CREATE DATABASE/ROLE/DDL/acesso a outros bancos e que credencial migrator não aparece no processo web. Banco de desenvolvimento de outras Tasks não é destino desse smoke.

## T13 — Admin, serviços e domínio local

**Criar:** `scripts/system/admin.mjs`, `terminal-secret.mjs`, `services.mjs`, `https-proxy.mjs`; templates `scripts/system/templates/guardian-bay.service` e `Caddyfile`. **Alterar:** entrypoint de T12, docs/onboarding.md, .env.example e docs/architecture/threat-model.md na parte de deployment concreto.

**Interfaces:** admin-email padrão admin@guardianbay.com.br, override por `--admin-email`; única pergunta interativa é a senha na primeira criação. Templates consomem diretórios/portas validados e localhost/IP configurado. system:init não executa seed.

- [ ] Compartilhar opções Argon2id versionadas entre bootstrap e aplicação no menor módulo server-safe possível, preservando política pública de registro. Bootstrap aplica apenas limites técnicos de authenticationPasswordSchema (1–128 caracteres válidos), sem score/complexidade ou segunda confirmação. Senha lida sem eco e sem trim; Ctrl+C restaura terminal e sai sem persistência parcial.
- [ ] Provisionar admin diretamente por CLI privilegiada/transação após migrations, fora da API de cadastro. E-mail canônico e role admin definidos no servidor. Se e-mail já existe, não promover, alterar role ou resetar senha implicitamente; exibir diagnóstico e exigir comando operacional explícito de recuperação. Se admin inicial já provisionado, rerun pula prompt e preserva hash.
- [ ] Testar senha com espaços iniciais/finais, Unicode válido e curta aceita para autenticação existente; rejeição técnica legível para vazia/tamanho impossível de autenticar. Confirmar login real do admin provisionado e que registro web continua apenas customer/política original.
- [ ] Fazer build de produção como usuário sem root; gerar serviço systemd com usuário próprio, diretório de trabalho, env runtime sem segredo migrator, diretório de mídia persistente, start em127.0.0.1:3000, restart controlado e enable no boot. Não executar npm dev nem iniciar Drizzle Studio publicamente. Instalar/atualizar unidade somente após comparar conteúdo e validar template.
- [ ] Configurar Caddy para HTTPS em localhost/IP configurado, tls internal e proxy127.0.0.1:3000; sem preparar DNS, hosts ou alias. Preservar Host público, Origin e protocolo; Next não fica exposto diretamente na LAN. Limite de body de upload compatível com T10. Não abrir firewall/rotas públicas implicitamente nem sobrescrever Caddyfile de outros serviços; usar fragmento dedicado quando houver instância existente.
- [ ] Não modificar hosts nem DNS. Informar URL HTTPS pelo IP/localhost configurado. Exibir localização do certificado público da CA para confiança nos clientes; não exportar chave privada ou instalar confiança remotamente. Se cliente não estiver configurado, explicar que a confiança no certificado é pendente nesse cliente, sem mascarar com downgrade HTTP.
- [ ] Iniciar/verificar Postgres e aplicação, health operacional e handshake HTTPS com CA local no próprio servidor. Mostrar progresso de etapas e URL final, status de serviços e comandos de diagnóstico; senhas/URLs de DB continuam ocultas. Nenhum teste ou seed faz parte dessa execução.
- [ ] Smoke em Ubuntu sem GUI: reiniciar host, verificar persistência de DB/mídia/serviço, login e upload; validar Actions same-origin via proxy. Cliente de teste na LAN configurado acessa a mesma URL. Testar rerun e falha de build/proxy sem perder instalação funcional anterior ou alterar usuário/senha admin.

## T14 — Validação consolidada

**Arquivos:** documentação responsável (README/onboarding/arquitetura/qualidade/identidade), planos de execução e suites existentes; somente novos cenários necessários às Tasks, sem duplicação de testes que espelham CSS.

- [x] Revisar matriz de requisitos T01–T13 e diffs; source de produto/segurança não pode ser trocada para acomodar falha de implementação. Retirar decisões obsoletas da documentação responsável, sem duplicar histórico global.
- [x] Executar npm run verify, whitespace staged/unstaged e testes de integração apenas em TEST_DATABASE_URL dedicada com preflight. Incluir suites de segurança de upload, no-op e budget conforme risco; nenhum DB real é fallback de teste.
- [x] Browser desktop/mobile: CEP, rajadas/no-op/checkout, cortina em todos os caminhos da matriz, scroll/reduced-motion, hover/favicon, catálogo e upload em todos os consumidores. Medir requests por burst; capturar resultado final e registrar limites das fixtures versus DB real.
- [x] CLI: dry-run/limites/retomada e nomes distintos com 1000 produtos simulados, sem imagens; writer em banco dedicado.
- [ ] Instalador: evidência de Ubuntu descartável suportado e reboot; confirmar ausência de execução de testes pelo system:init, usuário sem privilégios extras, segredo protegido e CA local com passos de cliente documentados. Se o host Ubuntu não estiver disponível, registrar bloqueio específico, sem alegar smoke executado no Windows.
- [x] Revisão contextual final de segurança para upload, DB, bootstrap e proxy. Corrigir achados materiais e repetir somente checks afetados por mudanças novas.
- [x] Entrega informa comandos finais, o que rodou, migrações alteradas, pendências externas e plano de recuperação; nenhum deploy público, seed em produção ou commit/push por efeito colateral.

## Comandos previstos ao usuário

```text
npm run system:init
npm run seeder:products
npm run seeder:products -- 250
npm run seeder:products -- --resume <runId>
```

O primeiro comando poderá instalar/configurar recursos do Ubuntu com sudo, mas os demais são explícitos e separados. O acesso nesta fase é por localhost/IP, sem DNS local.
