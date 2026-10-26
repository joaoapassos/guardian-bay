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

Produtos: chaves existentes lock/shield não identificam fotos reais verificadas. Manter schema, whitelist e contratos; não expandir upload, URLs remotas ou banco por efeito colateral. Fotos comerciais próprias/licenciadas correspondentes aos SKUs são pendência de conteúdo. Até fornecê-las, o placeholder informa ausência e não finge catálogo fotográfico concluído.

SVGs padrão file/globe/window/next/vercel não são banners da identidade e não têm consumidores em src; permanecem fora da substituição. Estudos pictóricos em docs/design/studies são arquivo histórico, sem uso na aplicação.

Para cada foto comercial futura registrar autor, origem, licença/autorização, SKU, dimensões, recorte e alt. Preservar proporção atual e evitar recortar informação do produto. Não usar fotos da Boundary Supply ou Black Diamond sem autorização.
