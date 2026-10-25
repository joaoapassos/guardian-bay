---
version: alpha
name: Guardian Bay
description: Preparo, acolhimento e confiança em uma interface comercial limpa.
colors:
  primary: "#256A94"
  secondary: "#71816E"
  tertiary: "#AB6248"
  neutral: "#EEE7D9"
  on-surface: "#232A27"
  text-muted: "#4B5551"
  surface: "#F8F4EC"
  product: "#FFFFFF"
  border: "#CBC2B3"
typography:
  body-md: {fontFamily: IBM Plex Sans, fontSize: 16px, fontWeight: 400, lineHeight: 1.6}
  headline-editorial: {fontFamily: Fraunces, fontSize: 56px, fontWeight: 700, lineHeight: 1.1}
  headline-editorial-mobile: {fontFamily: Fraunces, fontSize: 40px, fontWeight: 700, lineHeight: 1.1}
spacing: {xs: 4px, sm: 8px, field: 16px, group: 24px, section: 32px, editorial: 64px, container: 1280px}
rounded: {control: 6px, card: 8px, panel: 12px}
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.control}"
    height: 44px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.control}"
    height: 44px
---

# Guardian Bay — Design System

## Overview

Preparo, acolhimento e confiança; atmosfera costeira e nostalgia discreta, com produtos e tarefas acima da decoração. [Identidade operacional](visual-identity/idv.md).

Formato: tokens em YAML e orientação em Markdown, conforme a [especificação Google DESIGN.md](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md). Não utiliza TOON. O frontmatter concentra valores para leitura estruturada; a prosa explica sua aplicação sem repetir a tabela de tokens.

Precedência: [AGENTS.md](AGENTS.md), [arquitetura](docs/architecture/README.md) e segurança permanecem vigentes. A IDV determina identidade visual; estudos de páginas/componentes determinam estrutura e comportamento. [Fontes, divergências e pendências](visual-identity/README.md).

## Colors

`neutral` é cenário; `primary`, principal destaque de marca/interação; `secondary` e `tertiary`, apoios discretos. A estimativa 60/20/10/10 orienta o conjunto, sem cotas por página. Verde não é CTA principal; terracota não equivale a erro.

Tokens cromáticos vêm da IDV. Semânticas propostas N01 e contrastes estão em [Fundamentos](visual-identity/fundamentos.md#cores), sem transformar propostas em cores de marca aprovadas.

## Typography

Wordmark: Fraunces 800 em caixa alta, com dimensão final pendente. Fraunces editorial, IBM Plex Sans na interface e IBM Plex Mono apenas em dados técnicos úteis. Os níveis YAML são um recorte da proposta operacional N04, não uma nova escala. [Tipografia completa e fallbacks](visual-identity/fundamentos.md#tipografia).

## Layout

Container fluido; `spacing.container` é limite aproximado, não largura fixa. Home: quatro colunas desktop, tablet adaptativo, duas mobile. Catálogo: quatro/três/duas, com filtros laterais/recolhíveis/Drawer. [Espaçamento, margens e faixas](visual-identity/fundamentos.md#containers-e-grids).

## Elevation & Depth

Usar espaço, contorno e contraste entre superfícies; sombras mínimas. Sem textura em campos, preços ou checkout. A borda decorativa não identifica sozinha controles: aplicar N03 em [Bordas e superfícies](visual-identity/fundamentos.md#bordas-e-superficies).

## Shapes

Raios e alturas YAML expressam a proposta N06 existente; espaços operacionais expressam N05. Continuam referências de trabalho, sem validação em UI. Nenhum token encerra pendências de logo, mídia ou responsividade.

## Components

Os dois exemplos YAML reutilizam tokens por referência; variações e estados permanecem na aplicação dos [26 componentes](visual-identity/componentes.md). Começar pela composição da página entre as [27 páginas](visual-identity/paginas.md), preservando seus condicionantes.

Padrões: [formulários](visual-identity/padroes/formularios.md), [navegação](visual-identity/padroes/navegacao.md), [feedback e estados](visual-identity/padroes/feedback-estados.md), [interações e foco](visual-identity/padroes/interacoes.md). Alterar um valor exige manter frontmatter e Fundamentos coerentes; não criar uma segunda escala nos documentos de páginas.

## Do's and Don'ts

- Manter Home simples, banner estático, catálogo compartilhado e administração sem CMS.
- Reservar arte ao contexto editorial; foto de produto fiel, isolada e neutra.
- Mostrar informação essencial sem hover; nunca comunicar estado apenas pela cor.
- Confirmar sucesso somente após resposta; validação visual não substitui servidor. Pagamento sempre simulado.
- Preservar propostas e pendências explícitas; não criar funcionalidades para preencher o design.

Validação mínima da futura interface:

- [ ] Cores, fontes, espaços e componentes coerentes com seus papéis.
- [ ] Desktop/tablet/mobile preservam ações, informações e grids.
- [ ] Teclado, foco, contraste, zoom, rótulos e movimento reduzido verificados.
- [ ] Loading, vazio, falha, indisponibilidade e resultado incerto distinguíveis.

Esta entrega é documental. Não declara acessibilidade, aparência ou economia de tokens medidas em navegador ou modelo.
