# Prompts e parâmetros dos estudos

Consulta e execução: 25/10/2026. Fonte: [linguagem](../illustration-language.md). Ferramenta integrada `image_gen.imagegen`; uma chamada por imagem, `transparent_background: false`, sem edição das imagens geradas. Rodadas iniciais sem referência; seleção atual com contexto visual da garagem, detalhado ao final. Prompts enviados em inglês. Instruções negativas estão incorporadas aos textos, sem campo separado.

## Controles e limites

- Todas as saídas finais e iniciais: PNG, 1536 × 1024, proporção 3:2, confirmada pelos arquivos.
- Modelo/versão efetiva, seed, sampler, steps, guidance e qualidade: não expostos pela ferramenta; não selecionados nem inferidos. A mesma ferramenta foi usada, mas não se pode garantir backend idêntico entre chamadas.
- Resolução e proporção foram solicitadas no prompt; a interface não oferece parâmetros próprios para elas.
- A ferramenta permite prompt, transparência e referências. Referências omitidas nas rodadas iniciais e incluídas na seleção atual, conforme registro ao final. Sem filtros posteriores; somente pranchas diagnósticas de redução, cinza e recorte.
- Reproduzível no nível de instruções, não de pixels. O prefixo comum é concatenado diretamente com o assunto, sem outro texto.

## Série gestual — pinceladas marcantes (superada)

Correção explícita do usuário: todos os primeiros resultados tinham detalhes demais; o visual deve ter pinceladas exageradas e marcantes. Mesma correção comum para A/B/C; mudanças de assunto incluem direção dos gestos e materiais. A/B foram simplificados em número de elementos para reduzir ruído narrativo. Não é ensaio causal de uma única variável: novas amostras também mudam composição.

### Prefixo comum final

```text
Use case: stylized-concept. ONE original Guardian Bay validation illustration, landscape 3:2, requested 1536x1024. LOW DETAIL, EXAGGERATED BOLD BRUSHWORK is the overriding visual requirement. Hand-painted digital color study with large, conspicuous, sweeping flat-brush strokes and broad broken dry-brush passes. Each stroke must be individually legible in the main subject and in thumbnail, with visible bristle drag, rough tapered starts/stops, directional paint overlaps and incomplete coverage at selected edges. Build objects and atmosphere WITH expressive brush gestures, do not merely place brush texture behind a smoothly rendered subject. Use fewer, larger marks and broad value masses. No meticulous rendering. Retain plausible perspective, proportions, essential functional parts and support. Firm edges only where necessary for recognition, many soft/lost edges and rough brush edges elsewhere. Broad color planes follow volume; material distinctions by stroke direction, value and sparse highlights rather than fine texture. Calm, cared-for, welcoming. Muted subject-appropriate palette with a small restrained accent; no obligatory sepia or same palette across scenes. No tiny leaves, bark grooves, wood grain, scattered chips, fine scratches, tiny hardware detail, polished reflections, photorealism, smooth 3D rendering, vector-flat shapes, uniform outlines, uniform noise/paper filter, global blur, dramatic danger, people, text, logos, watermark, UI, copied compositions or identifiable franchise elements. Painterly roughness must not break construction. No reference images.
```

### A — a-floresta.png

```text
A: Quiet walkable Oregon coastal conifer trail, principal focus the path bend. Simple tree silhouettes, undergrowth in merged irregular painted masses, no individual leaves or needles. Foreground dark trunks built with several large vertical brush pulls, middle-ground warm earth path painted in sweeping horizontal/diagonal strokes, pale blue-gray distant forest in broad soft strokes. Overcast diffuse sky light, atmospheric depth by overlap and decreasing contrast. Dominant muted greens, secondary blue-gray, small earth tones. No extra scenic props or ocean vista.
```

### B — b-oficina.png

```text
B: Small welcoming original workshop in modest coherent perspective, broad wooden workbench the principal focus. One left window supplies broad diffuse daylight. Only three recognizable simple hand-tool silhouettes on wall, a camping backpack and folded canvas bundle as two support groups. Otherwise clear work surface and quiet shelving/wall, no collections of extra props. Long exaggerated horizontal brush pulls build the wood, large vertical strokes build walls, two or three broad gestural fold planes describe canvas, one sparse flat highlight indicates metal. Dominant muted umber, secondary cool gray ambient light, restrained sage accents. Very few signs of handled-edge wear; no scattered chips or wood grain. Essential load-bearing structure stays coherent.
```

### C — c-lanterna.png

```text
C: ONE traditional unlit camping lantern alone on a plain matte support, quiet neutral backdrop, no props or narrative accessories. Full object including handle and base within frame with generous margins, modest three-quarter view. Plausible reservoir/base, two structural side supports, glass globe, vented cap, curved carrying bail attached at both sides, minimal readable burner/adjuster. Dominant muted coastal-blue painted metal, secondary warm gray surface, tiny restrained warm-metal accent. Diffuse upper-left light with contact shadow to lower right. Paint the curved body with a handful of BIG sweeping curved or diagonal strokes and broken flat-brush planes; leave most enamel unarticulated, NOT covered in chips. Glass indicated by just two broad translucent-looking paint swipes and visible structural opening. Handle readable but not meticulously polished. The bold, exaggerated brushwork must be as obvious ON THE LANTERN as on the backdrop. No tiny vent-hole rendering, no individual screws, no photorealistic reflections, no flame.
```

## Rodada intermediária — simplificação sem ênfase suficiente no gesto

Somente A e B foram gerados antes da correção adicional sobre pinceladas. Não formam uma série comparável de três. Saídas descartadas da seleção, preservadas na pasta padrão da ferramenta; não duplicadas no repositório. A: `exec-fdfee156-f787-44fb-ba22-4f91017729fa.png`; B: `exec-9aa5669b-0dc9-4096-8d36-e9ca289469a9.png`. Diretório de origem de todas as gerações desta sessão: `C:\Users\joaoa\.codex\generated_images\01a1721e-32c6-7410-9e33-9092d591bcff`.

Prefixo comum:

```text
Create ONE original Guardian Bay illustration study, landscape 3:2, requested 1536x1024. This is a deliberately SIMPLIFIED PAINTED COLOR STUDY, with substantially LESS DETAIL than a finished concept painting. Use large opaque color shapes and broad flat brush patches following volume. Build the whole image from a few large value masses. Leave most surfaces unarticulated. Moderately stylized, plausible construction and perspective. Small accent marks extremely sparse and reserved for functional recognition. NO intricate foliage, NO visible individual leaves, NO elaborate bark, NO wood grain, NO chips scattered over every surface, NO fine scratches, NO tiny hardware rendering, NO photorealistic reflections, NO uniform noise or paper texture. Edge hierarchy: a few firm functional edges, broad soft and lost edges elsewhere. Color variation comes from large painted planes, not speckled texture. Calm, cared-for, welcoming; muted environmental colors with restrained accent. No text, logo, watermark, UI, people, game-specific places, copying an existing composition, photorealism, polished 3D, vector outlines, dramatic lighting, sepia filter or global blur. Do not compensate for simplification by making objects anatomically implausible.
```

Assunto A:

```text
Subject A: peaceful Oregon coastal conifer trail. Main focus is the gentle path bend. Tree trunks are simple tapered silhouettes with only two or three broad painted planes; canopies and damp undergrowth are irregular merged masses with no individual leaves or needles. Foreground, middle-ground trail and pale distant forest clearly separated by value and overlap. Diffuse overcast daylight. Dominant muted broken greens, secondary blue-gray air, small earth-color path. Do not add an ocean vista or extra scenic objects; concentrate on the simple forest path and broad light masses.
```

Assunto B:

```text
Subject B: small welcoming practical workshop with a wooden workbench as principal focus. Simple original room in coherent modest perspective, one left window as broad diffuse light source, organized hand tools represented by only THREE simple recognizable tool silhouettes on wall. One camping backpack and one folded canvas bundle as supporting groups. Otherwise broad clear bench, bare quiet shelving and wall, no collections of jars or crates or extra props. Wood by broad warm planes without grain, canvas by two or three fold planes, metal by a single restrained highlight. Dominant muted umber wood, secondary cool gray ambient light, sage accents. Moderate use suggested by only a few edge marks, not damage everywhere. Leave much of the wall and bench visually quiet.
```

## Primeira rodada — preservada como v1

Os três arquivos `*-v1.png` e as pranchas `*-v1.png` registram a linha de base rejeitada pelo usuário por excesso de detalhes.

Prefixo comum:

```text
Use case: stylized-concept. Asset type: original Guardian Bay visual validation study, not a finished advertisement. Output one landscape painting, aspect ratio 3:2, requested 1536x1024. Shared artistic specification: moderately stylized observational digital painting with visible manual execution. Plausible proportions, construction, perspective and support; simplify into broad value masses before texture. Broad blocking strokes, medium strokes following volume, sparse small marks only at the focal subject. Alternate firm functional silhouette edges, soft diffuse-light edges and lost edges in background/shadow. Material-specific marks, variable coverage and overlapping paint patches; do not apply a uniform paper/noise filter. Low-to-medium saturation in large masses and restrained small accents; chromatic darks, limited highlights. One principal focus and at most two supporting points; quieter and less defined background. Familiar, calm, cared-for and welcoming, without danger. Palette may follow the subject rather than literal interface tokens. No text, lettering, logos, watermarks, people, UI, copied artworks, identifiable game locations or franchise symbols. Avoid photorealism, polished 3D, vector outlines, cartoon proportions, global blur, uniform grain, sepia filter, neon, disaster drama and excessive microdetail. No reference images.
```

### A v1

```text
Study A — coastal forest. A peaceful walkable trail among Oregon coastal conifers and moist undergrowth. Diffuse overcast natural light from the open sky. Asymmetric tree masses, foreground trunks, a readable middle-ground trail and increasingly pale low-contrast distant forest. Main focus: the gentle bend of the path. Dominant broken greens, secondary cool blue-gray atmospheric light, small muted earth accents. Vegetation painted in grouped light/shadow masses with sparse individual needles; soil in broad patches, no leaf-by-leaf detail. Contemplative original composition.
```

### B v1

```text
Study B — workshop. A small welcoming practical workshop, original architecture with coherent modest two-point perspective at standing eye level. Wooden workbench as principal focus, organized hand tools on wall, camping backpack and folded canvas as two supporting groups. Clear working surface, cared-for moderate wear only at handled edges. Broad cool natural light from a left window, soft coherent shadows, no dramatic spotlights. Dominant muted wood umber and warm neutrals, secondary cool gray-blue ambient light, small sage accents. Wood has sparse directional grain, canvas has broad fold planes, metal has restrained selective edge highlights. Background shelving simplified, avoid equally sharp tools everywhere.
```

### C v1

```text
Study C — isolated camping lantern. One traditional unlit camping lantern alone on a simple plain matte surface with a quiet neutral background, no props, no forest, no workshop, no storytelling accessories. Entire lantern including carrying bail and base inside frame with comfortable margins, modest three-quarter view, centered. Plausible painted-metal base/reservoir, two protective side supports, clear glass globe, vented top and curved carrying handle attached at both sides. Dominant muted coastal-blue enamel, secondary warm gray neutral surface, small subdued warm-metal accents. Broad diffuse light from upper left, grounded contact shadow to lower right. Metal described by broad planes and a few narrow edge highlights, glass by sparse selective reflections with underlying structure visible. Moderate handled-edge wear only. Paint marks must remain visible on the lantern itself, not only the background. No luminous flame, no photorealistic product photography.
```


## Rodadas posteriores e seleção atual

As seções anteriores chamadas de série final documentam a rodada gestual, preservada em `*-gestual.png`; foram superadas pelas correções abaixo. Os nomes sem sufixo agora identificam a seleção com referência visual. Histórico completo e avaliação em [README](README.md).

### Fosca

Prefixo comum:

```text
Use case: stylized-concept. ONE original Guardian Bay validation illustration, landscape 3:2, requested 1536x1024. LOW DETAIL, EXAGGERATED BOLD BRUSHWORK is the overriding visual requirement. Hand-painted digital color study with large, conspicuous, sweeping flat-brush strokes and broad broken dry-brush passes. Each stroke must be individually legible in the main subject and in thumbnail, with visible bristle drag, rough tapered starts/stops, directional paint overlaps and incomplete coverage at selected edges. Build objects and atmosphere WITH expressive brush gestures, do not merely place brush texture behind a smoothly rendered subject. Use fewer, larger marks and broad value masses. No meticulous rendering. Retain plausible perspective, proportions, essential functional parts and support. Firm edges only where necessary for recognition, many soft/lost edges and rough brush edges elsewhere. Broad color planes follow volume; material distinctions by stroke direction, value and sparse highlights rather than fine texture. Calm, cared-for, welcoming. Muted subject-appropriate palette with a small restrained accent; no obligatory sepia or same palette across scenes. No tiny leaves, bark grooves, wood grain, scattered chips, fine scratches, tiny hardware detail, polished reflections, photorealism, smooth 3D rendering, vector-flat shapes, uniform outlines, uniform noise/paper filter, global blur, dramatic danger, people, text, logos, watermark, UI, copied compositions or identifiable franchise elements. Painterly roughness must not break construction. No reference images.  COLOR AND LIGHT CORRECTION: all large color masses are strongly muted and mixed with neutral gray, opaque chalky matte pigment. Subdued gray-green and gray-brown, dusty blue-gray; no vivid yellow-green, glowing ochre or saturated blue. Compressed highlight range, broad middle values, chromatic darks; keep the image readable, not underexposed. Diffuse ambient light only, no direct sunlight, no golden light, no bright cream/yellow strokes or luminous haze. Highlights are broad dull gray lighter planes, never sparkling white streaks. Metal is matte painted metal, not glossy enamel. Visible exaggerated brush marks must be made with restrained low-saturation colors, not bright accent strokes. The bold brush execution stays the same; reduce chroma and shine without applying a postprocessing filter. No uniformly brown sepia cast.
```

Assunto finalA:

```text
A: Quiet walkable Oregon coastal conifer trail, principal focus the path bend. Simple tree silhouettes, undergrowth in merged irregular painted masses, no individual leaves or needles. Foreground dark trunks built with several large vertical brush pulls, middle-ground warm earth path painted in sweeping horizontal/diagonal strokes, pale blue-gray distant forest in broad soft strokes. Overcast diffuse sky light, atmospheric depth by overlap and decreasing contrast. Dominant muted greens, secondary blue-gray, small earth tones. No extra scenic props or ocean vista.
```

Complemento:  Apply the color/light correction over any earlier color wording: gray-olive forest, dull gray-earth path, gray-blue distance. No sunlit foliage tips or glowing path.

Assunto finalB:

```text
B: Small welcoming original workshop in modest coherent perspective, broad wooden workbench the principal focus. One left window supplies broad diffuse daylight. Only three recognizable simple hand-tool silhouettes on wall, a camping backpack and folded canvas bundle as two support groups. Otherwise clear work surface and quiet shelving/wall, no collections of extra props. Long exaggerated horizontal brush pulls build the wood, large vertical strokes build walls, two or three broad gestural fold planes describe canvas, one sparse flat highlight indicates metal. Dominant muted umber, secondary cool gray ambient light, restrained sage accents. Very few signs of handled-edge wear; no scattered chips or wood grain. Essential load-bearing structure stays coherent.
```

Complemento:  Apply the color/light correction over any earlier wording: dusty gray-brown wood, gray-olive canvas, subdued cool ambient window light. No sunlight beam, no luminous gold bench or bright cream highlights. Retain broad expressive strokes on all materials.

Assunto finalC:

```text
C: ONE traditional unlit camping lantern alone on a plain matte support, quiet neutral backdrop, no props or narrative accessories. Full object including handle and base within frame with generous margins, modest three-quarter view. Plausible reservoir/base, two structural side supports, glass globe, vented cap, curved carrying bail attached at both sides, minimal readable burner/adjuster. Dominant muted coastal-blue painted metal, secondary warm gray surface, tiny restrained warm-metal accent. Diffuse upper-left light with contact shadow to lower right. Paint the curved body with a handful of BIG sweeping curved or diagonal strokes and broken flat-brush planes; leave most enamel unarticulated, NOT covered in chips. Glass indicated by just two broad translucent-looking paint swipes and visible structural opening. Handle readable but not meticulously polished. The bold, exaggerated brushwork must be as obvious ON THE LANTERN as on the backdrop. No tiny vent-hole rendering, no individual screws, no photorealistic reflections, no flame.
```

Complemento:  Apply color/light correction over any earlier wording: dusty gray-blue matte painted metal, dull gray support and backdrop. No glossy enamel, luminous cream paint, glittering metal trim, or bright glass reflections. Read the glass with a muted translucent gray plane and underlying opening, preserve functional construction. Keep bold brush marks large and low-chroma.

### Abstração excessiva

Prefixo comum:

```text
Use case: stylized-concept. Create one original Guardian Bay painterly study, landscape 3:2, requested 1536x1024. EXTREME ECONOMY OF BRUSH MARKS, large bold expressive brushstrokes, low detail. Convey a lot with VERY FEW strokes. This is a loose block-in color sketch, deliberately unfinished, not a detailed painting with visible brush texture. Think a small number of loaded wide flat-brush gestures laying down large opaque paint shapes; each gesture describes an entire plane or mass. Merge small features into larger shapes; suggest rather than enumerate. No tiny brush marks, no tiny bristle rendering, no surface stippling, no chips, scratches, grain, or decorative texture; do not fill large shapes with extra marks. Prefer one simple value shape to several tiny descriptive strokes. Large rough-ended strokes visibly construct the main subject; edges may remain open/lost, but essential structure and recognition must survive. Low saturation, gray-mixed muted colors, matte opaque pigment, broad middle values, restrained dull highlights, diffuse ambient light. No golden sunbeams, vibrant green/yellow/blue, glossy surfaces or white sparkles. No uniform sepia, global blur, vector outlines, polished 3D or photorealism. Calm, welcoming, cared-for. No text, logo, UI, people, watermark, copied composition or recognizable franchise element. No reference images.
```

Assunto economyA:

```text
A — Coastal conifer forest path. Describe the whole scene in a few large masses: dark foreground trunk group, one merged undergrowth mass on each side, broad gray-earth path turning gently inward, pale gray-blue distant forest. Only a handful of tree silhouettes; no individual leaves, fern fronds, needles, twigs or bark. Use a few oversized vertical pulls for trunks and wide sweeping strokes for ground and vegetation. A brushstroke represents a whole cluster of foliage, never a leaf. Muted gray-olive, gray-brown and gray-blue; overcast diffuse daylight and atmospheric depth by simple value separation. Avoid scenic intricacy.
```

Assunto economyB:

```text
B — Small welcoming workshop, simple plausible room perspective. One broad wood workbench, supported by simple legs. A left window is one pale gray shape and simple frame; diffuse overcast light, no sunbeams. THREE tool silhouettes on wall, a backpack as one folded gray-olive mass and a rolled camping canvas as two broad shapes. Otherwise empty quiet wall and bench. Describe long bench with two or three enormous horizontal paint gestures; walls by broad vertical pulls, objects by a few opaque planes. No wood grain, tool teeth, tiny buckles, seams, wear flecks, jars, ornament or extra props. Dusty gray-brown wood, gray wall, restrained olive cloth, compressed dull lights. Let the brush suggest materials instead of rendering their surfaces.
```

Assunto economyC:

```text
C — ONE unlit traditional camping lantern alone on plain gray matte support, quiet gray backdrop, no other objects. Entire handle and base inside frame with comfortable margin. Readable plausible base, two side supports, glass chamber, simple cap and carrying handle attached at both sides. Represent this whole lantern with VERY FEW BIG STROKES: one broad curved dark blue-gray mass for base, one lighter broad plane for its light side, two loaded vertical strokes for supports, one broad gray translucent-looking stroke for glass, a few simple dark strokes for opening and burner, one sweeping curved stroke for handle. Suggest cap as two simple planes, NOT individual vents or layered mechanical rings. Only essential functional shapes, omit screws, wire cage, chips, scratches, seams, trim and all tiny controls except one simple adjuster silhouette. Preserve recognition by silhouette and value, not mechanical detail. Very low saturation dusty blue-gray metal, dull gray environment, soft upper-left ambient light and one broad grounding shadow. Matte dull surfaces, NO glossy highlights. Main object must be just as loose and economical as the background, never a finished detailed lantern on a sketchy backdrop.
```

### Tentativa de equilíbrio sem referência visual

Prefixo comum:

```text
Use case: stylized-concept. ONE original Guardian Bay illustration study, landscape 3:2, requested 1536x1024. Balanced representational environmental concept painting: clear, well-designed recognizable forms, moderate structural detail, SIMPLE MARKS instead of detailed surface rendering. NOT an abstract block-in, NOT an empty minimalist scene, NOT photorealistic. Every important element has a readable silhouette, a few crisp construction edges and two to four broad painted value planes. Keep shapes, joins and proportions deliberately drawn; do not smear them into vague lumps. Use BIG, CONFIDENT, CONSPICUOUS FLAT-BRUSH STROKES that construct those planes and show directional overlap and broken coverage at selected edges. The painting contains meaningful details, but each detail is simply stated: a handle as a clear curved shape, a seam as one short mark, a tool as a solid silhouette. No microtexture, decorative speckles, all-over bristle scratches, chips everywhere, leaf-by-leaf foliage or meticulous hardware. Alternate selected firm silhouette/functional edges with softer/lost secondary edges; painterly but not blurry. Opaque matte gray-mixed colors, low saturation, restrained broad dull light planes, chromatic darks; natural readable value range, no murky veil. Diffuse lighting, no sparkling highlights or golden sunbeams. Distinguish materials by plane shape, stroke direction and a few selective accents. Familiar, welcoming, maintained, calm. Original scene, no copied layout, no characters, specific buildings, props, symbols or branding from a game. No text, logo, watermark, UI, people, uniform filter, glossy 3D, vector outlines or cartoon proportions. No reference-image input.
```

Assunto balancedA:

```text
A: A quiet Oregon coastal conifer trail with a clear bend leading into atmospheric forest, several individually recognizable trunks and rock forms, grouped shrubs and understory. Moderate variety of natural forms, not repetitive cylinders. Conifer branches are readable grouped silhouettes, foliage built from broad brush clusters rather than individual needles. Trunks have a few structural facet strokes, not bark texture. Stones have two or three clean painted planes, path has a few soil planes and occasional simple embedded stone shapes. Foreground, trail and blue-gray background forest separated by overlap and decreasing contrast. Dull gray-olive, gray-brown earth and muted blue-gray air. Broad diffuse overcast light. Large strokes remain clearly visible but forms are solid, intentionally drawn and not crude abstractions.
```

Assunto balancedB:

```text
B: An original small welcoming camping workshop with a wooden workbench, lower storage cabinet and upper shelves, a compact organizer, six recognizable tool silhouettes, a folded canvas bundle and camping backpack. Enough meaningful objects to feel inhabited and practical, but each is built from simple clearly bounded planes. Arrange in an original modest two-point view, not a frontal recreation of any existing garage. Each cabinet door a single muted paint shape plus one dark seam; organizer drawers small rectangles, tools simple solid silhouettes with one light plane, backpack a few fold planes and one strap. BIG bold horizontal brush strokes describe bench and shelves; broad vertical strokes describe wall and doors. No wood grain, tool teeth, screws, tiny buckles, chips, scratches or all-over dry-brush grain. Gray-brown wood, gray-olive cloth, gray-neutral wall; diffuse soft side-window light with subdued dull highlights, no golden beams. Keep the forms cleanly readable under the big strokes, avoid crude amorphous block-in.
```

### Seleção atual — referência da garagem

Prefixo comum:

```text
Create ONE original Guardian Bay illustration, landscape 3:2, requested 1536x1024. From the supplied images, use ONLY the dark frontal GARAGE reference (with upper brown cabinets and a white standing fan) to calibrate the LEVEL OF FORM SIMPLIFICATION and subdued MATTE color. Ignore the detailed coastal forest and wooden camping workshop images: those are rejected outputs, not style targets. Do not reproduce any layout, specific objects, characters, writing or scenery from the garage. Its important lesson: many recognizable forms, each stated with SIMPLE bounded painted shapes and just a few flat value changes, almost no surface texture. Apply that level of simple shape design to a completely original subject, adding BIG CONSPICUOUS PAINTERLY FLAT-BRUSH GESTURES within broad planes and at selected edges. Keep forms readable and intentionally drawn. No tiny descriptive strokes, no photorealistic surface detail, no stipple/noise, no wood grain or bark grooves, no scattered chips. Not abstract lumps, not an empty crude block-in. Matte opaque gray-mixed low-saturation colors, broad subdued lights, chromatic darks, diffuse illumination. No golden beams or glossy white shine. Strong strokes must not become fine scratchy texture. No text, logos, watermark, UI or people.
```

Assunto refA:

```text
Subject A: quiet Oregon coastal conifer trail. An original gently curving walkable path among clearly shaped tree trunks, broad merged shrub masses and a few rocks. Atmospheric distant forest as simple layered silhouettes. Dominant gray-olive, secondary blue-gray, dull earth path. Draw entire shrub clusters as single paint shapes, no individual fern leaves or needles. Trunks with two or three broad planes, not bark. Big wide vertical and diagonal strokes remain obvious. Keep scene materially as simple as the garage reference despite being a landscape. No ocean vista or scenic clutter.
```

Assunto refB:

```text
Subject B: original small practical camping workshop, modest three-quarter room perspective, wooden workbench, two lower cabinet doors, a short wall shelf, compact drawer organizer, several simple recognizable tools, folded canvas bundle and camping backpack. Distinct readable objects, each with just a silhouette and two or three broad planes; deliberate simple details, not surface texture. Broad brush strokes construct wood planes without grain. The whole scene must retain the simple shape economy of the garage reference, not the overly detailed generated camping workshop. Matte gray-brown wood, gray-olive cloth, soft gray walls and diffuse window light. No fan, target, photographs, distinctive cabinet arrangement or other identifiable layout from reference. No glitter, golden sunbeams, tiny hardware or finely rendered fabric.
```

Assunto refC:

```text
Subject C: ONE traditional unlit camping lantern, isolated on a plain matte gray support with quiet backdrop, entire handle and base visible with generous margins. Follow the garage reference's simple readable object construction, not a meticulously rendered product. Clearly drawn reservoir/base, two side supports, clear glass chamber with simple dark burner visible, vented cap, curved carrying bail attached at both sides, one simple adjuster. Each part has two or three broad painted planes and essential joins; no intricate vents, screws, embossed details, wire cage or decorative trim. Bold large flat-brush strokes clearly build curved body and glass highlights; DO NOT polish the object while leaving only the background painterly. Dusty muted blue-gray matte metal, gray glass with one broad restrained reflection and visible opening, neutral gray background. Diffuse upper-left light, broad dull shadow grounding base. Clear functional shapes, neither crude blobs nor fine mechanical rendering.
```

### Referências efetivamente incluídas na seleção atual

Ao contrário das primeiras rodadas sem referências, A/B/C finais usaram `num_last_images_to_include` = 3/4/5, respectivamente, para manter a garagem anexada pelo usuário no contexto crescente. Incluem também saídas geradas recentes: o prompt identifica explicitamente a garagem escura com ventilador branco como referência de simplificação e rejeita as saídas detalhadas como alvo. As chamadas B/C incluem também A/B recentes. Isso é uma limitação de controle: o conjunto de entradas não é idêntico; é uma rodada exploratória guiada por referência, não um ensaio perfeitamente controlado. Nenhum arquivo da referência protegida foi copiado para o repositório. Modelo e seed continuam não expostos. A referência anexada é necessária para reproduzir o contexto; prompts sozinhos não reproduzem essa rodada.

Saídas finais de origem: A `exec-f337e1fa-f4ea-4bf5-8f58-a25416cd9025.png`; B `exec-2222d2dc-06ed-4ac6-9e79-b9b6d1bd11f5.png`; C `exec-8333c0c2-7025-4a64-ab97-f0cb88977de3.png`.


## Novos ensaios da oficina — cenário em planos 2D

O usuário aprovou floresta e lanterna como base e pediu novos exemplos apenas da oficina, com sensação de fundo pintado quase artificial. D/E são novas gerações, sem entradas de referência, mesmo prefixo e transparência desativada; tamanho solicitado e observado 1536 × 1024. Modelo e seed continuam não expostos. Não são substituições das imagens aprovadas.

Prefixo comum:

```text
Create ONE original painted workshop environment study for Guardian Bay, landscape 3:2, 1536x1024 requested. The key visual is a FLAT HAND-PAINTED SCENIC BACKDROP, almost a deliberately artificial stage set painted on a canvas: recognizable space, but shallow pictorial depth, flattened masses, matte color cutouts and broad brush-built planes. NOT realistic 3D space with painterly texture added. NOT polished cozy cottage illustration. Think environmental concept sketch with an uncanny almost-fake painted background: rear wall reads as a painted PANEL, objects are graphic 2D silhouettes with one or two simply painted light/shadow shapes, mild perspective used only enough for recognition. Clearly designed forms with personality; asymmetric spacing, slight irregularities of drawing. LARGE bold opaque flat-brush passes and visible unfinished joins; broad paint overlaps on actual objects, not uniform grain or scratchy texture. Keep meaningful structural details, state each with a simple mark. Low saturation gray-olive, dirty gray-beige, muted umber, occasional tiny dull blue or rust accents. Flat diffuse ambient light, broad subdued shadows as SHAPES, no realistic light transport, no glowing window, no directional sunlight, no glossy highlights, no ambient-occlusion creases, no cinematic volumetric light, no depth-of-field blur. NO woodgrain, bark, fabric weave, screws, decorative chips, high-frequency brush texture, immaculate edges everywhere, heavy black cartoon outlines, photorealism, isometric diorama or rendered miniature. No people, text, logos, watermark, UI, copied scene or recognizable franchise property. Original composition and objects, not a recreation of any game garage.
```

Assunto D:

```text
Variant D — frontal shallow workshop wall. A compact independent coastal shop's working corner, viewed almost straight on with a slight off-axis tilt. Rear wall occupies most of frame as a large uneven gray-olive painted rectangle. A low workbench with two unequal cabinet doors, an offset small shelf, a small parts organizer, four simply silhouetted tools, folded camping canvas and a single backpack. Clear usable bench area. Each cabinet front, jar, drawer or tool is a distinct flat shape with at most one broad secondary plane; drawing gives identity instead of material rendering. Floor is a narrow flat trapezoid at bottom, not a long receding room. One small high opaque window as a dull gray patch, not a scenic landscape. Broad irregular dry-ended brush marks on wall and objects. The image should feel like a convincing drawing of a workshop whose back wall is visibly only paint on a screen, rather than a convincingly lit physical room.
```

Assunto E:

```text
Variant E — layered graphic set, cleaner untextured planes. Original workshop viewed with very shallow off-center perspective. Large dark umber cabinet band high on a muted gray wall; below, a workbench with a drawer organizer, four tool silhouettes, folded camping canvas and one backpack resting on the right. A low stool and one storage box overlap the bench like distinct painted stage flats. ONLY a narrow strip of floor, no deep room. The rear wall is one broad mostly CLEAN MATTE gray paint shape, NOT mottled plaster; cabinet doors each one flat olive-brown shape plus dark seam. Broad isolated confident strokes build objects, deliberately leave large quiet untextured areas. No distressed patina, grime, peeling paint, scratched surfaces or evenly distributed brush flecks. Large 2D shadow shapes and flat simplified volume, visibly artificial painted scenery while maintaining solid meaningful forms. Restrained gray-brown and gray-olive, deep warm-gray shadow masses; no uniformly beige washed-out image. A small side opening is dull gray with no vista. Almost no specular light. The stronger dark/light shape design supplies character, not material detail or 3D realism. Do not duplicate the previous frontal layout.
```


## F — revisão localizada da frontal

Edição da imagem D preservando composição e objetos, com a garagem anexada como referência técnica. `num_last_images_to_include: 2` (garagem e D carregada com view_image), `transparent_background: false`. Resolução solicitada/observada 1536 × 1024; modelo e seed não expostos. Resultado: `f-oficina-detalhes-integrados.png`. Sem filtro posterior. Prompt integral:

```text
EDIT the frontal Guardian Bay workshop image shown most recently (the one with blue left cabinet door, light right door, backpack at left, stool in middle). Preserve its original composition, frontal shallow space, all principal objects, object positions, proportions and muted matte palette. The other image, the darker garage with a white standing fan, is a TECHNIQUE REFERENCE ONLY: do not copy its composition, objects or writing. Refine the target's way of painting to match this principle: MANY meaningful details, but each is a SIMPLE, QUIET PAINTED SHAPE that merges into the overall reading. Details support form subconsciously; they are not decorative marks calling attention to themselves. Keep the target's organizer compartments, tool shapes, backpack straps, cabinet seams, folded cloth, shelf supports and stool structure, but render each with a few deliberately designed opaque planes and low-contrast tonal changes. BIG confident flat-brush passes construct major planes; smaller marks only state meaningful structural details, with restrained edges and color close to their surrounding plane. REMOVE the target's all-over distressed patina, peeling-paint appearance, flecks, scratchy marks, chips, streaks and busy mottled plaster. Replace them with broad quiet matte wall and door color fields containing just a few purposeful large brush transitions. The wood and floor must have no fine grain or random scratches. Do NOT remove all detail, empty the room, turn objects into vague blobs, add cartoon outlines, or smooth into a 3D render. Preserve intentionally drawn silhouettes, clear joins and simple flattened volume; shallow scenic-backdrop feeling. Painterly work is visible in how color planes meet and overlap, not in uniform texture. Keep gray-olive, muted brown, dusty blue and warm gray with low saturation. Diffuse subdued light, no golden glow, no glossy highlights, no muddy uniform overlay. No extra objects, people, text, logos or watermark. Retain landscape 3:2, requested 1536x1024. One revised image only.
```

## Seleção validada e limpeza do acervo

Após a escolha do usuário, o projeto mantém somente `a-floresta.png`, `b-oficina.png` e `c-lanterna.png`, além das pranchas diagnósticas atualizadas. `b-oficina.png` corresponde à revisão F, antes chamada `f-oficina-detalhes-integrados.png`; a oficina B antiga foi descartada. Os prompts e nomes anteriores acima são histórico textual, não inventário de arquivos presentes. Imagens v1, gestuais, foscas, abstratas, oficinas B antiga/D/E e suas pranchas foram removidas do repositório. Entradas descartadas necessárias às edições não permanecem no projeto, portanto este registro não garante reprodução exata.

Mapeamento das saídas preservadas: floresta `exec-f337e1fa-f4ea-4bf5-8f58-a25416cd9025.png`; oficina `exec-4da3bd84-1181-4968-a5d5-03d36fbf79fd.png`; lanterna `exec-8333c0c2-7025-4a64-ab97-f0cb88977de3.png`. Todas estão copiadas ao projeto com os nomes canônicos acima.
