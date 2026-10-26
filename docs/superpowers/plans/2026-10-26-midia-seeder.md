<!-- Ajuste de execução aprovado: seeder padrão 200, máximo 1000; sem preparação de DNS/hosts/alias local. -->
# Mídia e factory de produtos — Implementation Plan

> Para implementação: superpowers:executing-plans, após T08 do [plano principal](2026-10-26-correcoes-operacao.md). Não executar antes da aprovação.

**Goal:** upload de um arquivo por produto e geração retomável de produtos demonstrativos sem imagem, com placeholder neutro.

**Architecture:** mídia é responsabilidade da feature catalog; Route Handlers só cuidam da boundary HTTP, servidor valida/autoriza/persiste e DB guarda referências/metadados. CLI de seed compartilha schemas e infraestrutura de mídia, sem simular sessão web nem chamar Actions em massa.

**Tech Stack:** stack atual, Sharp runtime explícito com versão compatível/pinada, filesystem local Ubuntu.

**Spec:** [especificação](../specs/2026-10-26-correcoes-operacao.md). Restrições globais de formato/tamanho, quotas, ownership e origem se aplicam a todas as Tasks.

## Review Focus

Arquivo disfarçado/decode bomb; draft de outro admin e publicação; falha disco/DB e limpeza; URLs externas/SSRF/CSP; seed com duplicatas, cota ou interrupção. Checks nos passos abaixo.

## T09 — Contrato persistente de mídia

**Arquivos:** criar `src/db/schema/product-media.ts`; alterar `src/db/schema/products.ts`, `src/features/catalog/images.ts`, schemas/reads de catálogo e `src/features/cart/server/read-cart.ts`. Migration versionada em `drizzle/`, sem aplicar fora de DB dedicado. Testes de DTO, schemas e integração existentes.

**Interface pública em catalog/images.ts:** `ProductImageDto` discriminado por `kind: 'none' | 'upload'`. Com mídia: id opaco, src permitido, alt, width, height; Não enviar storageKey, caminhos, uploader ou hash ao cliente. Atualizar consumidores do antigo ReturnType<typeof productImage> sem DTO global.

**Persistência proposta:** product_media com UUID, origem, storageKey local, MIME/dimensões/byteSize, SHA-256/pixelHash/perceptualHash, uploadedBy e createdAt/expiresAt para drafts locais. products recebe mediaId nullable (uma referência), seedRunId/seedNameKey nullable para importações retomáveis. seedNameKey com unicidade parcial; hashes indexados, sem impedir reuso legítimo de mídia no admin.

- [ ] Definir CHECKs de origem/metadados e FK/índices sem guardar arquivo binário no Postgres. Identificadores/path não são autoridade de cliente. Produtos sem mídia preservam placeholder; lock/shield legados não viram URL arbitrária.
- [ ] Gerar migration pelo fluxo existente; manter image_key legado durante transição, com reads preferindo mediaId. Nenhuma migração inventa imagem ou expande constraint para aceitar caminhos livres. Remoção do legado só se não houver consumidor e sem apagar dados necessários.
- [ ] Migrar readers públicos/admin/carrinho e DTOs mínimos; histórico de pedido continua snapshot existente, sem exigir foto nova para ler pedidos antigos.
- [ ] Testar NONE, upload, origem externa rejeitada, relação inválida e dimensões ilegais. Checar que storageKey/hashes/uploader não aparecem em DTO ou bundle client.
- [ ] Revisar schema com supabase-postgres-best-practices e security-review; integração em TEST_DATABASE_URL dedicada e db:check. Atualizar arquitetura de mídia e inventário visual.

## T10 — Upload e exibição

**Criar:** `src/app/api/admin/product-images/route.ts`, `src/app/media/products/[id]/route.ts`; `src/features/catalog/server/upload-product-image.ts`, `media-storage.ts`, `read-product-image.ts`, `media-policy.ts`; `src/features/catalog/components/product-image-field.tsx`; `scripts/media-cleanup.mjs` e testes focados. **Alterar:** product-form, manage-catalog/schema/Actions, product-image e consumidores admin/store/cart; package.json/lock, next.config.ts, .env.example e docs de operação.

**Interfaces:** upload retorna `{ success:true, mediaId, image:ProductImageDto }` ou erro sanitizado. `manageCatalog` aceita `mediaId: UUID | null`, revalidado no servidor. Um ID enviado pelo cliente não permite anexar mídia de draft alheio. Armazenamento lê `PRODUCT_MEDIA_DIR`; default operacional em `/var/lib/guardian-bay/media` no init.

- [ ] Adicionar Sharp explicitamente ao runtime com npm/lock, verificando versão instalada/compatibilidade e advisory atual na implementação; não importar dependência transitiva por acaso.
- [ ] Route multipart autenticada/admin/same-origin e budget admin.media (proposta 10/min por usuário), sem ampliar o limite global 16kb das Actions. Limite total de stream 5MiB+64KiB de envelope e de arquivo 5MiB, inclusive sem Content-Length; responder 413 cedo. Aceitar um campo file e rejeitar extras.
- [ ] Decodificar bytes JPEG/PNG/WebP, impor 20MP, uma imagem estática, remover EXIF e reencodificar WebP até 1600px; validar resultado. Nome UUID/chave gerada; nunca concatenar caminho do usuário. Limitar decodes simultâneos a dois por processo e rejeitar fila ilimitada.
- [ ] Persistir draft de upload ligado ao admin com TTL de 24h; usar escrita temporária + rename atômico e compensação em falha de DB. Não remover arquivo antigo antes de confirmar nova associação por revisão de produto. Revalidar admin depois de espera/trabalho caro e na anexação.
- [ ] Campo React com seleção, progresso/estado, prévia, substituir e remover. Seleção não resolvida/falha não vira salvamento bem-sucedido da imagem; permitir cancelar seleção preservando imagem anterior. Campo de imagem participa da comparação sem mudança de T02.
- [ ] Entregar upload por ID opaco: público somente se associado a produto publicado; draft/prévia administrativa exige admin atual e vínculo. Para prévia privada usar request do browser sem otimização que descarte cookies. Content-Type fixo, nosniff, cache público somente no conteúdo realmente público; não prometer revogar pixels já baixados.
- [ ] ProductImage renderiza imagem local com dimensões/sizes e fallback, com request direto para preservar cookies na prévia. Limitar CSP a self, sem liberar hosts arbitrários ou mídia externa em geral.
- [ ] Cleanup explícito de drafts expirados e arquivos sem referência, limitado por lote e rechecando associação sob concorrência; não apagar arquivo compartilhado. Registrar forma de backup/restauração de DB + diretório persistente. Não iniciar scheduler implícito.
- [ ] Testes: cliente sem sessão/customer, draft alheio, MIME falso, SVG, animação, path traversal, body sem tamanho, >5MiB, >20MP, falha de decode/disco/DB, troca concorrente e cleanup. Browser valida criar/editar/remover, placeholder e todos os consumidores de mídia. Validar Origin/Host e CSP com request real.
- [ ] Atualizar docs e evidências; executar gates de risco para upload e DB antes da Task de seed.

## T11 — Factory/seeder sem imagem

Revisão aprovada pelo usuário: retirar integralmente o provedor externo e criar produtos com placeholder neutro. Não baixar, gerar ou deduplicar fotografias no seeder.

- [x] CLI `npm run seeder:products -- 250`, padrão 200, faixa 1–1000; `--dry-run` e `--resume UUID`.
- [x] Factory temática com nomes normalizados distintos, preço BRL inteiro e estoque aleatório 0–1000.
- [x] Writer com lock exclusivo, lotes atômicos de até 100, produto+inventário, mediaId nulo e contagem por seedRunId.
- [x] Checkpoint privado sem secrets, reconciliação pelo banco após interrupção, sem duplicar produtos confirmados.
- [x] Somente DB local explicitamente autorizado, sem fallback para teste ou banco remoto.
- [x] Testes determinísticos com 1000 produtos e integração dedicada para atomicidade, lock, replay e ausência de mídia.
- [x] Remover chave, hotlinks, créditos, allowlist externa e código do provedor. Upload manual de fotos permanece.
