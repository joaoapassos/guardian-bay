# Mídia e direção fotográfica

Referência: [Boundary Supply](https://www.boundarysupply.com/), somente linguagem visual. Assets e fontes proprietárias não foram copiados.

| Asset anterior | Consumidores | Substituição |
| --- | --- | --- |
| `public/images/home/prepared.webp` | Home e Sobre | Editorial original com aparência fotográfica, criado por ImageGen em 26/10/2026; mochila sem marca, garrafa, lanterna e bolsa em estúdio neutro |
| `public/images/system/not-found.webp` | SystemState 404 | Mesmo editorial neutro compartilhado; imagem anterior removida |
| `public/images/system/access-denied.webp` | SystemState 403 | Mesmo editorial neutro compartilhado; imagem anterior removida |
| `public/images/system/unexpected-error.webp` | SystemState de erro | Mesmo editorial neutro compartilhado; imagem anterior removida |
| `public/images/products/product-fallback.webp` | Catálogo, detalhe, carrinho e prévia admin | Placeholder neutro com ícone Lucide e texto Foto indisponível; imagem anterior removida |

Editorial: 1536×1024, WebP, qualidade 85. Arquivo original gerado não é fotografia de produto vendido nem comprovação de estoque, material ou especificação. Sem texto, logo ou marcas na imagem. Home/Sobre/sistema usam alt vazio por função decorativa; informação e recuperação continuam no texto.

Produtos: chaves legadas lock/shield não identificam fotos verificadas e preservam placeholder. O contrato de mídia aprovado distingue none/upload. A tabela product_media guarda referência local, dimensões e dados privados de integridade; products.mediaId é uma FK opcional. Readers públicos/admin/carrinho preferem mídia associada e retornam somente ID opaco, src, alt, dimensões. Caminhos de disco, hashes e uploader não entram no DTO. Upload administrativo: um JPEG/PNG/WebP estático de até5MiB/20MP, reencodificado em WebP até1600px, sem EXIF. Draft privado do admin por24h; salvar produto confirma associação com revisão. Seleção pendente/falha bloqueia salvar; cancelar preserva imagem anterior. O seeder cria produtos sem imagem, com placeholder neutro e upload posterior opcional.

SVGs padrão file/globe/window/next/vercel não são banners da identidade e não têm consumidores em src; permanecem fora da substituição. Estudos pictóricos em docs/design/studies são arquivo histórico, sem uso na aplicação.

Para cada foto comercial futura registrar autor, origem, licença/autorização, SKU, dimensões, recorte e alt. Preservar proporção atual e evitar recortar informação do produto. Não usar fotos da Boundary Supply ou Black Diamond sem autorização.

Favicon: src/app/icon.svg, letras GB convertidas dos glifos Fraunces800 já utilizados no wordmark; preto/âmbar, sem carregamento de fonte. Fonte por The Fraunces Project Authors, [SIL OFL1.1](https://github.com/undercasetype/Fraunces/blob/master/OFL.txt). Arte vetorial gerada com fontTools4.60.1; não incorpora arquivo de fonte.

## Operação de imagens de produto

Defina PRODUCT_MEDIA_DIR absoluto, persistente e fora de public/src/.next; o serviço precisa ler/escrever nesse diretório. Arquivos não entram no Git ou no build. O endpoint administrativo exige sessão/role atual, Origin/Host confiáveis e budget10/min; streams são limitados a5MiB+64KiB de envelope e decodes simultâneos a2, sem fila ilimitada. SVG/animação/MIME falso são rejeitados. Acesso público por /media/products/UUID somente após publicação; prévia de draft exige o admin proprietário. Todas as imagens usam request direto do browser, preservando cookies nas prévias. CSP permite somente self para imagens.

Execute explicitamente `npm run media:cleanup -- 100` com GUARDIAN_LOCAL_DEMO=1 e DATABASE_URL local, sem TEST_DATABASE_URL como fallback. Lote1–1000/padrão100; exclui drafts expirados e mídias sem vínculo por24h, conferindo referências sob lock, além de arquivos órfãos/temporários antigos. Não há scheduler implícito. Backups precisam conter PostgreSQL e PRODUCT_MEDIA_DIR no mesmo ponto consistente: pare writes antes da captura e restaure ambos antes de iniciar o serviço. Preserve também as chaves CPF fora do repositório. Remover referência não apaga arquivo imediatamente; a limpeza explícita trata órfãos. Imagens públicas podem ficar em cache por5min e pixels já baixados não são revogáveis.
