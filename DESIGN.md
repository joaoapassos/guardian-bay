---
version: alpha
name: Guardian Bay
source_url: https://github.com/xjli360/awesome-design-md-ecommerce/blob/main/design-md/boundary-supply/DESIGN.md
colors:
  primary: "#fdc656"
  ink: "#121212"
  canvas: "#ffffff"
  body: "#434343"
  muted: "#acacac"
  hairline: "#dedede"
  surface-soft: "#f5f5f5"
  surface-card: "#f7f7f7"
  on-primary: "#121212"
  overlay-scrim: "#00000033"
  overlay-strong: "#00000066"
  border-dark: "#000000"
  text-hover: "#555555"
  danger: "#8f2d2d"
  warning: "#755016"
  success: "#2f5a3d"
rounded:
  control: 6px
  card: 8px
  panel: 12px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.primary}"
---

# Guardian Bay — Design System

## Overview

Direção visual Boundary Supply: equipamentos, fotografia de materiais, superfícies neutras e ações em âmbar. Substitui a identidade costeira e pictórica anterior por autorização do usuário em 26/10/2026. Produto e contratos em [PRODUCT.md](PRODUCT.md); arquitetura e segurança mantêm a precedência de [AGENTS.md](AGENTS.md).

A [referência principal](https://github.com/xjli360/awesome-design-md-ecommerce/blob/main/design-md/boundary-supply/DESIGN.md) documenta captura de CSS em 29/09/2026 e distingue valores observados de papéis inferidos. O [site original](https://www.boundarysupply.com/) orienta fotografia e aplicação; não concede licença para seus assets. Black Diamond é apenas comparação, sem tokens incorporados.

## Colors

Valores cromáticos da referência no frontmatter. CSS canônico em `src/app/globals.css`; não duplicar valores em componentes. Âmbar no fundo de CTA com texto preto; preto nos títulos, links e foco; branco no canvas; cinzas nas superfícies e separadores. O cinza muted da referência é decorativo: texto secundário usa body para contraste AA. Hairline também é decorativo; controles usam contorno body.

Aliases existentes paper → canvas, coast → ink, sage → body, muted → body, surface → surface-soft, line → hairline preservam os consumidores. O CTA usa primary explicitamente, pois trocar coast por âmbar tornaria títulos e links ilegíveis. Erro, atenção e sucesso são extensões funcionais, com texto/ícone e rótulo; nunca inferir estado apenas da cor. [Fundamentos](docs/visual-identity/fundamentos.md#cores).

## Typography

Famílias e métricas existentes preservadas nesta migração de cores e mídia: Fraunces editorial, IBM Plex Sans na UI e Geist/Geist Mono nos usos existentes. A referência usa Univers LT Pro; não foi incorporada por faltar fonte licenciada. Esta é uma adaptação explícita, não equivalência tipográfica à Boundary Supply.

## Layout

Preservar composição, grids, containers, breakpoints, espaçamentos e responsividade das páginas implementadas. Exceção aprovada: catálogo distribui cards de pelo menos260px em área comercial de até1680px, com filtro280px no desktop; título, breadcrumb e descrição mantêm a guia original. A referência informa direção visual; suas medidas inferidas não substituem o layout existente. Não adicionar seções, produtos, recursos ou controles por imitação do site.

## Elevation & Depth

Superfícies neutras, bordas discretas e sombras existentes; sem textura pictórica na UI. Dialogs, drawers e foco mantêm comportamento Radix e garantias de acessibilidade.

## Shapes

Preservar raios existentes: controles 6px, cards 8px, painéis 12px. Pílulas e cartões 10px da referência não são aplicados nesta migração para conservar a geometria aprovada.

## Components

Botões e ações principais: âmbar/preto com inversão no hover; campos brancos ou cinza claro e contorno acessível; cards neutros; badges semânticos mantêm significado. Ícones, React/Radix, dimensões e motion existentes são preservados. [Componentes](docs/visual-identity/componentes.md) e [padrões](docs/visual-identity/README.md) documentam contratos existentes.

## Do's and Don'ts

- Usar fotografia de equipamentos, luz controlada, fundos neutros e materiais legíveis.
- Usar imagens próprias ou licenciadas; registrar origem e finalidade em [mídia](docs/visual-identity/media.md).
- Não copiar fotos, logos, textos promocionais ou fontes proprietárias da referência.
- Não apresentar uma imagem editorial gerada como fotografia fiel de SKU.
- Ausência de foto usa placeholder neutro identificado; catálogo não inventa produto ou características.
- Teclado, foco, contraste, estados, desktop/mobile e movimento reduzido exigem validação proporcional.
