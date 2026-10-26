> HISTÓRICO REVOGADO em 26/10/2026. Não aplicar estas regras a novos assets. Direção vigente: [fotografia](../visual-identity/media.md) e [DESIGN.md](../../DESIGN.md).

# Contrato de ilustração — Guardian Bay 1.0.0

Contrato documental, independente de provedor, para transformação de imagens e geração por descrição. Implementa a [linguagem](illustration-language.md) com base nas [três referências aprovadas](illustration-references.md); não implementa executor, Skill, chamada de API ou transformação real nesta Task.

## Arquivos e responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| [illustration-style.json](illustration-style.json) | Perfil fixo: `style`, `constraints`, identidade/versionamento e referências aprovadas com hashes |
| [illustration-contract.schema.json](illustration-contract.schema.json) | JSON Schema 2020-12 para perfil, pedido individual e coleção de exemplos |
| [illustration-examples.json](illustration-examples.json) | Três pedidos de transformação fotográfica e um pedido textual, todos referindo o mesmo perfil |

O repositório usa JSON de dois espaços/Biome e Zod nos schemas de aplicação. Não foi encontrado schema local de design a reutilizar. Adotou-se JSON Schema para manter o contrato portátil, sem adicionar schema de runtime à aplicação. A validação local usa `z.fromJSONSchema` da versão de Zod já instalada. Nenhuma dependência foi instalada ou alterada.

## A. Style fixo e fundamentação

`kind: "style"` identifica o perfil `guardian-bay-illustration`, `style_version: "1.0.0"`. `style` contém formas, pinceladas, materiais, bordas, luz/sombra, espaço, cor, distribuição de detalhes e exclusões. São instruções artísticas em texto, não controles numéricos fictícios de um gerador.

- A floresta sustenta planos legíveis, direção de marcas e distância por contraste/definição; sua folhagem mais subdividida não é requisito universal.
- A oficina sustenta detalhes estruturais discretos, massas quietas e fundo pictórico; sua frontalidade não deve substituir automaticamente a composição de outra foto.
- A lanterna sustenta identidade no próprio objeto, materiais por planos e peças reconhecíveis; não torna azul-cinza, fundo neutro ou reflexos obrigatórios em outras cenas.

O perfil preserva o equilíbrio aprovado: pincelada ampla constrói os planos, detalhes simples dão forma sem rabiscos ou microtextura generalizada. Fosco não significa subexposição, filtro cinza ou vidro sem transparência. A paleta ambiental varia; os papéis de creme, azul e sálvia da interface permanecem em DESIGN.md/Fundamentos.

Os pedidos referenciam o perfil por `style.path`, `style_id` e `style_version`. Não aceitam `style.forms`, parâmetros de render ou sobrescritas do perfil. Carregar a versão canônica do repositório, não qualquer documento que apenas declare o mesmo ID. O schema verifica a estrutura do perfil e suas referências/regras de preservação; não avalia se uma edição dos textos mantém a identidade. Uma mudança artística exige revisão do perfil e incremento de versão, não um override por cena.

## B. Scene variável

Um pedido usa `kind: "request"`, `contract_version`, `request_id`, referência `style` e `scene`. Não embute uma cópia das regras fixas.

| Campo | Semântica |
| --- | --- |
| `scene.source` | Imagem: `kind: "image"`, `asset_id`, `description`. Texto: `kind: "text"`, `description`. Ramos exclusivos; não incluir os dois formatos juntos. |
| `scene.subject` | `main` e lista `secondary`. Na transformação, descrevem o que já existe; não autorizam adicionar objetos. |
| `scene.context` | Ambiente e contexto cromático. Na transformação, descrevem a origem; a redução pictórica de brilho/saturação não autoriza trocar a cor identificadora de um objeto. |
| `scene.preserve_elements` | Lista não vazia de características essenciais. Em texto, são compromissos de conteúdo a manter no resultado. |
| `scene.composition` | Imagem: `preserve_source` ou `change_source` com `instructions`. Texto: `specified` com `instructions`. A mudança explícita aqui é a permissão para reenquadrar/recortar. |
| `scene.lighting` | Imagem: `preserve_source` ou `change_source` com `instructions`. Texto: `specified` com `instructions`. O estilo traduz a luz em pintura; mudar sua fonte/horário exige `change_source`. |
| `scene.allowed_changes` | Lista de mudanças de conteúdo autorizadas, com `operation`, `target` e `instructions`. Operações: adicionar/remover objeto, mudar ambiente ou característica não essencial. `[]` significa nenhuma mudança de conteúdo. No modo textual a lista deve ser vazia; o conteúdo vem da descrição. |
| `scene.output` | `width_px`, `height_px`: inteiros positivos. `fit`: `contain_source` ao preservar composição; `requested_frame` para composição alterada ou textual. |

`asset_id` identifica uma imagem anexada/fornecida fora do JSON. Não é um caminho que autoriza acesso ao disco ou download. As imagens aprovadas em `sources.references` são referências de estilo, nunca a fotografia a transformar; não copiar seus objetos ou layout para a origem. Caminhos de documentação e do perfil são relativos a `docs/design/`, independentemente do local onde o pedido for guardado.

A proporção desejada é derivada de `width_px:height_px`, reduzindo pelo máximo divisor comum. Exemplo: 1536 × 1024 = 3:2; 1024 × 1280 = 4:5. Não existe um segundo campo de proporção que possa contradizer as dimensões. Esses números são um pedido, não garantia de suporte do modelo.

Com `contain_source`, preservar todo o enquadramento: se a proporção da origem diferir, acomodar a imagem com margens neutras sem inventar conteúdo ou cortar objetos. Não usar `cover` automaticamente. Um reenquadramento intencional deve usar `composition.mode: "change_source"`, instrução explícita e `output.fit: "requested_frame"`; o schema rejeita combinações cruzadas. Essa autorização não permite cortar uma peça marcada como essencial.

Todos os campos operacionais são explícitos. O consumidor não deve preencher valores ausentes silenciosamente. Listas vazias são aceitas onde fazem sentido (`secondary`, `allowed_changes`); strings vazias ou apenas espaços são rejeitadas.

## C. Constraints de preservação

`constraints` fica no perfil fixo e é obrigatório, com valores constantes no schema: preservar assunto e geometria funcional; mudar conteúdo, composição, luz e identidade cromática somente quando explicitamente permitido; rejeitar texto/logotipo acidental, deformações e artefatos funcionais. Fotografias comerciais de produto ficam fora do escopo.

Uma permissão de cena é limitada ao alvo descrito. Nunca libera adulterar função ou apagar elementos essenciais. Exemplo de autorização restrita:

```json
{
  "operation": "remove_object",
  "target": "Caixa vazia ao fundo, fora do assunto essencial",
  "instructions": "Remover somente essa caixa; manter bancada, ferramentas e seus apoios."
}
```

Textos existentes na fonte exigem decisão explícita se forem relevantes: preservar informação essencial ou autorizar remoção de um letreiro específico; nunca substituir por letras inventadas. Conteúdo textual correto não é comprovado pelo schema. Referências de propriedade exclusiva não autorizam reproduzir personagens, marcas, símbolos ou composições do jogo.

Em conflitos, as regras fixas e `preserve_elements` limitam as permissões. Não escolher silenciosamente entre instruções incompatíveis. Exemplos: pedido de remover o próprio assunto, trocar a alça essencial por peça impossível, ou contexto dizendo “noite” enquanto a foto diurna mantém `preserve_source`. O schema rejeita incompatibilidades estruturais; contradições semânticas exigem revisão do pedido antes da execução.

## Exemplos

Os quatro pedidos no [arquivo de exemplos](illustration-examples.json) compartilham exatamente o mesmo `style`. Nenhum foi executado nesta Task.

| `request_id` | Entrada e demonstração |
| --- | --- |
| `forest-photo` | Foto de trilha: conserva traçado, troncos/pedras e perspectiva; não acrescenta mar ou farol. |
| `workshop-photo` | Foto de oficina: mantém disposição, ferramentas e arquitetura; aplica planos simples sem impor a frontalidade da referência. |
| `lantern-photo` | Foto de lanterna: mantém cor reconhecível, alça, suportes, câmara e base; não acrescenta acessórios. |
| `text-scene` | Descrição de entrada de loja original: explicita composição e luz, sem imagem de origem; usa o mesmo perfil fixo. |

Os três IDs de imagem são **placeholders de vinculação**, não fotografias existentes no repositório. Antes de uma geração real, associar cada ID a uma foto autorizada e examinar se descrição e elementos essenciais correspondem a ela. Não substituir fotos ausentes pelas artes aprovadas. Os exemplos demonstram configuração e troca de assunto, não evidência visual de transformação.

Para executar futuramente, validar o pedido, resolver o perfil fixo e seus hashes de referência, examinar a entrada, verificar conflitos/permissões e só então converter as instruções para a ferramenta escolhida. Essa conversão não foi implementada. Se a ferramenta não aceitar resolução, preservação ou referência necessária, registrar a limitação em vez de descartar o requisito silenciosamente.

## Validação e versionamento

`contract_version` versiona estrutura/semântica do contrato; `style_version` versiona direção artística. Ambas começam em 1.0.0. Mudança incompatível de estrutura ou interpretação exige major; campo compatível novo exige minor e schema correspondente; correção editorial sem mudança de intenção pode usar patch. Consumidores 1.0.0 rejeitam outras versões até migração explícita; não se promete compatibilidade automática com versões futuras. Não editar silenciosamente o perfil mantendo a mesma versão artística.

Verificação reproduzível a partir da raiz, sem instalar pacotes:

```powershell
@'
const fs = require("node:fs");
const z = require("zod");
const read = name => JSON.parse(fs.readFileSync("docs/design/" + name, "utf8"));
const schema = z.fromJSONSchema(read("illustration-contract.schema.json"));
schema.parse(read("illustration-style.json"));
const examples = read("illustration-examples.json");
schema.parse(examples);
for (const request of examples.requests) schema.parse(request);
console.log("Perfil, coleção e quatro pedidos válidos.");
'@ | node -
```

Validação estrutural cobre tipos, campos obrigatórios/desconhecidos, versões, ramos imagem/texto, instruções de mudança obrigatórias, dimensões positivas, pares composição/fit e constantes de preservação. A verificação da identidade das referências usa seus SHA-256. O schema não valida pixels, existência/vinculação da foto, direitos de uso, coerência física, contradições em prosa nem capacidade de um modelo atender o pedido.

Verificação executada em 25/10/2026 com Zod 4.6.7 instalado: perfil, coleção, quatro pedidos individuais e um pedido com reframe/relight explícitos válidos; 18 mutações inválidas rejeitadas. Incluíram imagem ausente, mistura de tipos de entrada, override do estilo, modelo desconhecido, versões divergentes, dimensões negativas/fracionárias, crop sem permissão, mudança de composição/luz sem instrução, ausência de elementos essenciais, assunto em branco, mudança sem alvo, preservação de origem inexistente no modo textual, regra de geometria desativada e referência não aprovada. Conferidos três hashes e igualdade da referência de estilo nos quatro exemplos. Biome verificou os três JSONs.

Não foram incluídos modelo, seed, sampler, steps, qualidade ou força de transformação: não estão definidos para o executor futuro. A escolha de ferramenta e a adaptação de parâmetros não podem prometer saída idêntica entre modelos. Consistência visual precisa de transformações efetivas e revisão pelos critérios existentes; nesta Task só a estrutura foi validada.

Nenhuma imagem, interface, banco, dependência ou Skill é criada por este contrato. A próxima etapa depende de aprovação do contrato; não começa automaticamente.
