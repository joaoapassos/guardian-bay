# Substituição da identidade visual — Boundary Supply

Sistema: Guardian Bay → Epic: identidade visual → Tasks autorizadas em 26/10/2026.

## Critérios aprovados

Máxima mudança por cores/mídia; preservar composição, React/Radix, responsividade, motion, funcionalidades, camadas e segurança. Paleta da Boundary Supply sem mistura com Black Diamond; sem copiar assets proprietários. Fontes e geometria atuais são adaptações explícitas de escopo, com Univers dependente de licença.

## Tasks e resultado

1. **Inventário — concluído.** Tokens centrais em globals.css e fallback cromático de Curtain; cinco imagens de identidade anteriores identificadas. Mapeamento de usos e substituições em [mídia](../visual-identity/media.md).
2. **Tokens — concluído.** Paleta documentada na referência, aliases para consumidores existentes, CTA âmbar/preto, neutros e overlays centralizados. Cores semânticas preservadas. Sem novas camadas ou mudanças em contratos.
3. **Mídia — implementação concluída, conteúdo comercial pendente.** Editorial original gerado em linguagem fotográfica substitui Home/Sobre/sistema; placeholder neutro substitui a ilustração de produto. Fotos reais autorizadas dos SKUs ainda precisam ser fornecidas, sem ampliar schema/upload.
4. **Documentação — concluído.** DESIGN.md, IDV, Fundamentos, inventários e padrões atualizados; direção pictórica e skill anterior revogadas. Histórico permanece identificado como histórico. Impeccable instalado com licença/revisão/hash; setup registra alcance e limites.
5. **Validação — realizada com limites abaixo.** Checks de código e fixture de navegador; não há certificação de acessibilidade nem prova de fluxos reais de banco/pagamento.

## Evidência de validação

Em 26/10/2026, npm run check passou em Biome, tipos e 200 testes/38 arquivos. Build de produção passou com acesso à rede para as fontes Google existentes; uma repetição no sandbox falhou exclusivamente no download das fontes. git diff --check e git diff --cached --check sem problemas.

A fixture existente scripts/store-ui.test.mjs foi executada por cópia descartável em .vitest, com captura em 1440 e 390px. O teste passou em 1440/768/390/320px para 15 rotas da loja/conta/institucionais, além de formulários, filtros, carrinho, transições e movimento reduzido. Dados sintéticos, banco proibido, POST bloqueado; não demonstra checkout persistente real. Chrome/Edge no sandbox falharam em Page.enable; Chrome fora do sandbox passou. Capturas locais em .vitest/store-browser foram inspecionadas (Home desktop/mobile, catálogo mobile e checkout desktop). Não há comparação pixel a pixel com a marca, pois layouts e fontes foram preservados.

Revisão independente apontou alt antigo em Sobre e texto conflitante de CTA em autenticação; ambos corrigidos. O último ajuste de rótulo acessível do placeholder remove o prefixo pictórico legado sem alterar DTO. Links internos dos documentos visuais: 191 válidos. Contrastes opacos calculados: preto/âmbar 11,94:1; body/branco 9,89:1; body/surface 9,07:1; erro/surface 7,46:1. Esses cálculos não certificam composições transparentes ou toda a UI.

Impeccable foi lido manualmente pelo fallback do launcher; detector não executado. Web Design Guidelines aplicada ao diff para semântica, alt, foco, contraste e imagens. Sem alteração de auth, autorização, DB ou regras comerciais. Referência original examinada em navegador: hero fotográfico escuro e CTA âmbar; a adaptação usa o canvas neutro do DESIGN.md escolhido e os layouts existentes.
