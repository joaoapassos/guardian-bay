# Fundamentos visuais

[Índice](README.md) · [Componentes](componentes.md) · [Páginas](paginas.md)

## Cores

Os tokens e valores Boundary Supply estão em [DESIGN.md](../../DESIGN.md#colors); implementação central em `src/app/globals.css`. Não há cotas de distribuição cromática.

| Uso | Token |
| --- | --- |
| Fundo | canvas |
| Texto, título, link e foco | ink |
| Texto secundário e contorno identificador de controle | body |
| CTA | primary com on-primary |
| Card e superfície | surface-card e surface-soft |
| Separação decorativa | hairline |
| Cinza decorativo, sem texto comum em branco | muted-soft |
| Erro, atenção, sucesso | danger, warning, success |

Aliases legados são apenas compatibilidade técnica; coast não representa azul e paper não representa creme. Evitar aliases em usos novos. Âmbar em branco não satisfaz contraste de texto. Preservar rótulos/ícones para estados críticos; não comunicar sucesso antes da resposta do servidor.

## Tipografia

Manter famílias, pesos, tamanhos e quebras existentes nesta Task. Univers LT Pro é a fonte da referência e exige licença; não copiar seus arquivos. Fraunces e IBM Plex Sans existentes são adaptação de escopo documentada, não novo direcionamento artístico.

## Espacamento

Manter valores atuais, agrupamentos e alvos de interação. A mudança cromática não autoriza compactar formulários ou substituir composição.

## Containers e grids

Preservar containers, ordem das seções e grids implementados. Documentos de páginas descrevem contratos; não autorizam reconstrução nesta migração.

## Breakpoints

Preservar breakpoints existentes; verificar mobile 390px, tablet 768px e desktop 1440px, além de reflow em 320px e zoom. Sem scroll horizontal global ou ações inacessíveis.

## Bordas e superficies

Hairline identifica separações decorativas. Campo e controle que dependem do contorno usam body. Raios atuais: 6px controles, 8px cards e 12px painéis. Não copiar geometria inferida da referência.

## Hierarquia

Preservar títulos, dados, preço e ação. Acento âmbar serve às ações; preto permanece dominante na informação.

## Iconografia

Manter ícones Lucide, dimensões, nomes acessíveis e alvos atuais. Placeholder de fotografia é neutro e explicitamente identificado.

## Midia

Ver [inventário de mídia](media.md). Luz controlada e fundos neutros; fotografia do SKU fiel e autorizada. Imagem editorial sintética não substitui fotografia comercial real. Proporções e limites existentes permanecem.

## Foco e interacao

Indicador preto visível com offset existente; preservar teclado, portais, foco Radix, eventos e regras de acessibilidade. Hover de CTA inverte âmbar/preto, sem alterar tamanho. Disabled/loading/erro continuam distinguíveis.

## Movimento

Preservar Curtain, Shared Element, tempos, curvas, transições locais e alternativa de movimento reduzido. Somente as cores de Curtain mudam para preto/âmbar.

## Registro de propostas novas

As propostas N01–N08 da consolidação anterior são substituídas por este documento e pela implementação existente. Referências antigas a N01/N03 significam semânticas/contorno acessível; não restauram a identidade anterior. Nenhuma medida inferida externa autoriza reconstrução.
