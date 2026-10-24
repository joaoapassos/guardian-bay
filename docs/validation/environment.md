# Instalação e reconstrução

Referência: Node 24.19.0/Linux x64 para gates SDLC, PostgreSQL 18.6 e Chrome. Windows também executa app/proxy e PostgreSQL; comandos da campanha exigem LAB_BASE_URL=https://127.0.0.1:3449 e TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55442/guardian_bay_test. Não carregar credenciais de outros ambientes.

1. Em checkout limpo da branch, executar npm ci e npm run build. Registrar SHA e versões. Não usar next dev.
2. Inicializar cluster exclusivo em .vitest/epic12/postgres, usuário postgres, bind 127.0.0.1 e porta 55442. Trust somente em loopback neste cluster descartável; não reutilizar em deployment. Criar guardian_bay_test.
3. Definir as duas variáveis acima; executar `node scripts/validation/lab.mjs seed`. Aplica migrations existentes e cria A/B/admin, três produtos, estoque e cartões sintéticos. Arquivo fixtures.json é privado e ignorado. O password público de fixture é `Guardian Bay laboratory passphrase 2026`; e-mails incluem runId e podem ser consultados localmente no arquivo, sem copiar tokens para relatórios.
4. Executar `node scripts/validation/lab.mjs serve`. App na porta 3139 e terminador TLS na 3449. Certificado efêmero local gerado com OpenSSL. Perfil de navegador exclusivo: confiar somente nesse certificado ou aceitar a exceção apenas nesse perfil; não alterar trust global. O proxy preserva Host e remove autoridade forwarded, sem substituir validação da aplicação.
5. `node scripts/validation/lab.mjs status` verifica lease e banco. Abrir a origem autorizada e autenticar manualmente como A/B/admin para testar login real. Sessões provisionadas no seed servem apenas às outras campanhas; não constituem evidência de login.
6. Encerrar geradores, supervisor e PostgreSQL ao terminar. Preservar artefatos privados; para reconstrução, utilizar novo diretório validado ou remover somente fixtures da execução pela política documentada. Nunca limpar banco por nome ou caminho fornecido por request.

## Ferramentas independentes

ZAP: baixar distribuição oficial em https://www.zaproxy.org/download/; registrar versão e add-ons. Usar modo Safe na navegação inicial e Protected no escopo autorizado; nunca Attack. Burp Community: baixar em https://portswigger.net/burp/communitydownload e usar navegador/perfil próprio; registrar versão. Proxy/repeater manuais, sem presumir Scanner Pro. k6: instalar binário oficial em https://grafana.com/docs/k6/latest/set-up/install-k6/ e registrar versão/checksum. Ferramentas não entram nas dependências npm da aplicação.

Configurar proxy somente no perfil de laboratório, excluir qualquer hostname externo e desativar integrações de colaboração/OAST externas na campanha. Não publicar arquivos de sessão ZAP/Burp ou cookies. Procedimentos de cada grupo serão adicionados nas Tasks correspondentes. A instalação não equivale à execução; cada relatório deve informar a ferramenta realmente utilizada.
