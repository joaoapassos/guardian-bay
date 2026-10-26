> Revisão aprovada: produtos seed sem imagem/placeholder neutro; provedor externo, downloads e créditos retirados. Sem DNS/hosts. Padrão200, máximo1000. Esta revisão substitui as decisões históricas conflitantes abaixo.

<!-- Ajuste de execução aprovado: seeder padrão 200, máximo 1000; sem preparação de DNS/hosts/alias local. -->
# Correções de interação, mídia e operação

Especificação para planejamento solicitado em 26/10/2026. Nenhuma implementação, instalação, migration ou operação de serviço é autorizada por este arquivo isoladamente. A execução depende da aprovação do plano pelo usuário.

## Objetivo e decisões confirmadas

Corrigir interações e permitir preparar uma instalação local do Guardian Bay em Ubuntu sem reconstruir páginas. Preservar regras comerciais, isolamento de usuários, autenticação, autorização e paleta Boundary Supply vigente.

- Imagem: upload de **um arquivo por produto**, persistido no disco do servidor Ubuntu.
- Seeder: produtos sem imagem, com placeholder neutro; padrão200 e máximo1000 por execução.
- Acesso: localhost/IP; não preparar DNS, alias ou hosts local, conforme ajuste aprovado pelo usuário.
- Seeder recebe quantidade de produtos de 1 a 1000, padrão 200; interpretar o intervalo aleatório 0–1000 como **estoque por produto**, inclusive os extremos. Quantidade de produtos solicitada é exata, condicionada à disponibilidade de imagens únicas e quota.
- Instalação: entrada por `npm run system:init`, Node/npm e acesso sudo no Ubuntu; nenhum Docker ou interface gráfica como pré-requisito. Não executar testes dentro do instalador.
- Admin inicial: identificador padrão `admin@guardianbay.com.br`, configurável por argumento/ambiente; interação solicita somente a senha uma vez, sem confirmação ou regra de força. Preservar espaços e remover somente o terminador de linha. Entrada não deve aparecer no log. Limites técnicos de login (não vazia, até 128 caracteres válidos) continuam necessários para não criar conta inacessível; não aplicar a política de cadastro público.

## Diagnóstico observado no checkout

1. `cart-item-controls.tsx` chama a Action mesmo quando a quantidade numérica é igual à confirmada. O servidor autentica, bloqueia registros, verifica produto/estoque e executa UPDATE; a Action revalida e o cliente invalida a leitura.
2. `submitting.current` impede concorrência no mesmo componente, mas não agrupa envios sequenciais rápidos. `AddToCartButton` também invalida carrinho e chama `router.refresh()`; revisar reads redundantes sem retirar atualizações necessárias.
3. Estoque, categoria, produto, endereço e perfil têm caminhos de edição que precisam de comparação normalizada antes de salvar. Algumas operações incrementam revisão/audit sem comparação de conteúdo.
4. CEP em `address-form.tsx` e `checkout-address-fields.tsx`: `maxLength=9`; schema aceita oito dígitos com hífen opcional e persiste sem hífen. Não foi encontrada máscara nesses componentes. A perda do oitavo dígito relatada precisa ser reproduzida antes de atribuir uma causa.
5. Curtain depende de `ContextLink`; logout usa `router.replace()` diretamente. O controlador atual abandona intenções em redirect inesperado e não tem lock explícito de scrollbar. CSS declara 220ms e o controlador sobrescreve duração para 500ms.
6. Produto armazena somente `imageKey` limitado a lock/shield; `ProductImage` mostra placeholder. Upload exige novo contrato de mídia. CSP permite imagens apenas da própria origem e Server Actions limitam body a 16kb.
7. Catálogo usa área max-w-7xl, filtro 260px e quatro colunas desktop; a combinação comprime os cards. O cabeçalho deve continuar na guia atual.
8. `system:init` e `seeder:products` não existem. Banco usa Drizzle/Postgres.js; usuários exigem e-mail e hash Argon2id. Produção exige HTTPS para Origin/cookies; um alias HTTP não satisfaz esse contrato.

## Contratos de comportamento

### Ausência de mudança e frequência

Submit normalizado igual ao último estado confirmado mostra “Já está atualizado.” e produz zero requests, revalidações ou SQL originados por esse clique. Isso é uma informação sobre o estado carregado, não uma alegação de atualidade absoluta em outras abas. Reads de autenticação/autorização continuam necessários se alguém chamar a operação diretamente.

No servidor, uma edição sem mudança não faz UPDATE de negócio, incremento de revisão ou evento de alteração. Verificar ownership e revisão antes de classificá-la como inalterada. Um budget de proteção pode ser consultado/atualizado para resistir a chamadas diretas. Não aplicar essa otimização a checkout, confirmação de pagamento, senha, logout ou atualização explícita de consulta.

Carrinho mantém o botão de confirmação. Um submit agenda o último valor após **500ms de silêncio**; novos submits/edições durante uma intenção agendada reiniciam o prazo. Editar sem solicitar atualização não passa a salvar automaticamente. Por item há uma request em voo e no máximo uma intenção posterior substituível. Estado inválido, remoção, logout e desmontagem cancelam trabalho ainda não enviado. Não reenviar automaticamente uma adição cujo resultado ficou incerto.

Proteção server-side proposta: `cart.write`, até **60 operações/60s por usuário**, com intervalo mínimo **500ms** entre aceitações. Usar infraestrutura PostgreSQL existente; não confiar no debounce como proteção. Retornar RATE_LIMITED/retryAfterMs sem reenviar em loop. Leituras necessárias de sessão não podem ser prometidas como zero SQL em tráfego hostil.

Reconciliar respostas por geração da intenção, sem sobrescrever edição mais nova. Consolidar invalidações de leitura ao final da sequência. Revisar checkout aguarda conclusão das atualizações já solicitadas; erro mantém o usuário no carrinho.

### Curtain e movimento

Contexto admin: `/admin` ou `/admin/...`, sem classificar `/administrator` como admin. O controlador na raiz é a autoridade para toda troca de contexto dentro da aplicação: Link comum, ContextLink, push/replace, login/logout, redirecionamento por sessão/role e histórico. Navegação inicia imediatamente; a animação não atrasa revogação ou autorização.

Observar intenção quando disponível e a mudança efetivamente confirmada como fallback, evitando duas cortinas para a mesma navegação. Para navegação de documento completo, permitir recuperação no destino sem preservar DOM privado; fechar a aba ou sair para site externo não admite garantia de animação de saída. Movimento reduzido continua navegação direta e liberação imediata.

Ocultar scrollbar antes de pintar a entrada; preservar largura útil/posição e estilos prévios; restaurar somente no término ou recuperação da intenção. Watchdog máximo de 5s, Escape, erro, redirect, mudança de preferência e desmontagem sempre desbloqueiam. Não remover dataset/lock entre fases.

Deformação só no eixo Y, sem estreitar X. Proposta inicial: scaleY entre 0.96 e 1.08, origem superior e overscan vertical; base curva durante deslocamento, retificando ao cobrir a viewport para não revelar cantos. Texto não se deforma com a superfície. Ajuste em navegador, duração 500ms por fase preservada, sem bounce repetido. Hover de cores dos botões: 300ms, respeitando movimento reduzido.

### Catálogo e favicon

Breadcrumb, título e descrição mantêm max-w-7xl e alinhamento atual. Só a área de trabalho de `/products` pode se expandir até 1680px, com margem mínima 24px desktop; filtro à **esquerda**, próximo dessa margem, 280px quando couber. Interpretar a menção a “right” como referência à folga lateral, não inverter a posição confirmada na frase. Cards com largura mínima desejada 260px: três colunas a 1440px e quatro em telas largas quando houver espaço; não forçar quatro cards estreitos. Mobile conserva Drawer e duas colunas onde legíveis, com reflow acessível. Home não herda a expansão.

Favicon SVG com GB na tipografia do wordmark atual (Fraunces), letras convertidas em paths para funcionar sem carregamento da fonte dentro do SVG. Preto/âmbar, legível em 16/32px, sem raster ou nova direção artística.

### Imagens de produto

Uma mídia associada por produto. Upload aceita JPEG/PNG/WebP, até 5MiB e 20 megapixels; rejeitar SVG, conteúdo disfarçado, imagem animada/multiframe e decode inválido. Verificação real de bytes/dimensões, remoção de EXIF e reencodificação em WebP até 1600px no maior lado. Limitar stream antes de acumular arquivo completo; tamanho declarado/MIME do browser não bastam.

Disco fora de public e do build, em diretório persistente configurável; nome gerado no servidor e acesso por ID opaco. A operação de upload é administrativa, same-origin e limitada por budget. O browser não escolhe caminho, host remoto, proprietário ou preço. Drafts de upload vinculados ao admin e com prazo; anexação revalida permissão, vínculo e revisão. Trocar/remover referência não apaga arquivo compartilhado por efeito colateral. Limpeza explícita de órfãos, recuperação em falhas e backup de DB + mídia são parte do contrato.

Mídia suporta somente upload local autenticado. Não aceitar URL arbitrária digitada no formulário. Produto sem mídia mantém placeholder neutro; CSP permite imagens somente da própria origem.

### Seeder

Comandos: `npm run seeder:products` e `npm run seeder:products -- 250`; também aceitar a forma posicional sem `--` se o npm instalado a encaminhar. Default 200; rejeitar 0, negativos, frações, NaN e >1000 antes de rede/DB. API key só server-side, configurada separadamente; não imprimir segredo ou criar conta no provedor.

Gerar preços inteiros BRL positivos, categoria de demonstração, nome temático normalizado único e descrição explícita de demonstração. Produtos publicados sem imagem e estoque aleatório inteiro0–1000. Pipeline CLI com lotes atômicos de até100 produtos+inventário e lock exclusivo, sem chamar Actions por produto.

Checkpoint privado e retomada reconciliam contagem por seedRunId no banco, incluindo falha entre commit e checkpoint. Interrupção informa contagem real e comando de retomada. Nomes colidem por normalização, sem diferenciar apenas por UUID. Seeder nunca roda automaticamente no init e recusa destino não marcado explicitamente como instalação local/demonstração. Não há consulta ou download de imagens.

### Instalação Ubuntu

Primeiro alvo suportado: Ubuntu Server 24.04 LTS x64 com systemd e Node 24 compatível com a baseline do projeto (>=24.19.0), npm e sudo. Detectar plataforma/versões; outros sistemas recebem diagnóstico sem alteração parcial. Aplicação roda sem root. Usar npm ci para respeitar package-lock, sem instalar Drizzle Studio como serviço público.

Instalador Node usa módulos nativos até instalar dependências. Preparar pacotes necessários, PostgreSQL 18 por fonte oficial e Caddy; preparar cluster dedicado guardian-bay em loopback, porta livre configurável (padrão 5433). Usuário de runtime sem superuser/CREATEDB/CREATEROLE, com apenas DML necessário no banco guardian_bay; credencial distinta para migrations. HBA impede esses usuários de acessar outros bancos; não alterar permissões de clusters alheios.

Gerar senhas por crypto com pelo menos 32 caracteres (proposta 48 em alfabeto seguro para URL), chaves de cifragem de CPF independentes e arquivos de ambiente protegidos. Execuções repetidas preservam credenciais/chaves e contas existentes. Registrar etapas sanitizadas e falha recuperável; nunca imprimir senha/URL de banco, hash, chave CPF ou senha admin.

Aplicar migrations versionadas, sem drizzle push nem generate em produção. Inicialização autorizada aqui é bootstrap explícito; não tornar migrations efeito colateral de npm start. Não criar TEST_DATABASE_URL a partir de DATABASE_URL.

Admin inicial por provisionamento CLI privilegiado, fora do endpoint público, com Argon2id e senha exata; não promover conta existente silenciosamente nem enfraquecer cadastro/login globais. Reexecução não reseta senha; rotação exige comando explícito.

Build de produção + serviço systemd dedicado e restart controlado; Next só em 127.0.0.1:3000. Caddy atende localhost ou IPv4 privado configurado por HTTPS com CA local, preservando Host público e Origin; não confiar arbitrariamente em X-Forwarded-Host. A CA no servidor não configura os demais computadores: emitir instruções e certificado público para configuração local/na rede. Não instalar trust em clientes por efeito colateral nem publicar DNS público.

Não executar testes no system:init. Checagens operacionais necessárias (DB pronto, migration aplicada, processo ativo, HTTP/HTTPS) continuam; mostrar etapa, progresso e próxima ação, sem tela gráfica. Sem seed automático, exposição de Postgres, dev server público ou daemon Drizzle Studio.

## Fontes e limites de planejamento

- Código e guias Next 16.4.3 instalados são autoridade da implementação; Context7 consultado para limites de onNavigate e observação de navegação, sem importar API de versão diferente.
- https://ubuntu.com/server/docs/how-to/databases/install-postgresql/ e https://nodejs.org/en/about/previous-releases: instalação e baseline operacional. Instalador deve validar repositórios/versões na implementação.

Só foram lidos código/documentação e escritos os arquivos deste planejamento. Nenhum teste, banco, upload, seeder, instalação de software ou serviço foi executado nesta etapa.
