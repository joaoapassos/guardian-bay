# Padrão de formulários

Identidade vigente em [DESIGN.md](../../../DESIGN.md); sem reconstrução de componentes ou mudanças de motion.
[Índice](../README.md) · [Fundamentos](../fundamentos.md) · [Form Field](../componentes.md#form-field)

Aplica-se a autenticação, conta, checkout, filtros e administração. Origem: I §§6,9; C/form-field, C/button, C/dialog e requisitos de P. Medidas, cores e tipografia são as de Fundamentos; este documento centraliza o comportamento.

## Estrutura e preenchimento

Ordem de cada campo: rótulo persistente, controle, descrição breve, mensagem de erro quando houver. Placeholder pode exemplificar formato, mas não identifica o campo. Mostrar unidade/formato esperado antes da digitação, sobretudo em preço, quantidade, validade e endereço. Não duplicar a mesma instrução em descrição e erro.

Indicar campos obrigatórios em texto ou símbolo explicado no início; marcar opcionais como “opcional” quando necessário à compreensão. Não usar apenas cor. Não introduzir campo, consentimento ou dado pessoal para preencher espaço visual; a lista de campos vem da página e suas pendências.

Texto/e-mail/senha usam entrada apropriada; seleção curta usa rádio quando comparação imediata importa, select quando uma lista compacta basta. Checkbox confirma escolha independente; não representa escolha exclusiva. Agrupar rádio/checkbox com pergunta/título e instrução comuns. Textarea se limita ao conteúdo longo já previsto, como descrição de produto. Não criar um padrão de Tabs para substituir formulário sem necessidade documentada.

Permitir colar, preenchimento assistido e gerenciador de senhas; mostrar/ocultar senha é ação explicitamente nomeada e não muda o valor. Conteúdo digitado não muda de tamanho, contraste ou altura ao receber foco. Somente leitura mantém aparência de informação consultável; disabled indica ação temporariamente indisponível e explica o motivo.

## Validação

Proposta operacional de momento, derivada da necessidade de feedback nas fontes: orientar formato enquanto preenche; validar campo após interação concluída ou tentativa de envio, sem anunciar erro antes da primeira oportunidade de preencher. Depois de um erro, atualizar sua mensagem conforme correção, sem interromper cada tecla com fala.

No envio inválido, mostrar resumo de problemas no início do formulário e mensagem específica em cada campo; levar foco ao resumo ou primeiro erro quando o resumo não agregar. O resumo aponta os campos; a mensagem explica correção, sem reproduzir senha ou entrada perigosa. Contorno de erro complementa texto/ícone conforme [cores e foco](../fundamentos.md), sem retirar o indicador de foco quando o campo inválido estiver ativo.

Falha geral fica junto à área de submissão ou em bloco de formulário identificado. Erro genérico de credenciais/recuperação não denuncia existência de conta. Conflito de edição administrativa pede carregar versão atual e revisar; não sobrescrever silenciosamente nem apagar o rascunho sem aviso.

## Submissão e resultado

| Situação | Apresentação | Continuidade |
| --- | --- | --- |
| Pronto | Ação principal com verbo específico; secundária para cancelar/voltar | Navegação por teclado e rascunho disponíveis |
| Enviando | Rótulo de andamento e indicador no mesmo lugar, sem mudar largura desnecessariamente | Evitar duplo envio; não apagar campos nem mover foco ao spinner |
| Campo rejeitado | Erro no campo e resumo quando útil | Preservar dados seguros e permitir correção |
| Erro operacional conhecido | Explicação e repetição manual segura | Não exibir sucesso nem abrir nova compra automaticamente |
| Resultado de compra incerto | Aviso persistente e caminho para consultar pedido | Consultar antes de iniciar outra intenção |
| Sucesso confirmado | Mensagem ou navegação definida pela página | Limpar rascunho só quando operação estiver confirmada |

Não declarar aceite só porque os campos passaram na validação visual. Preço, estoque, permissão, propriedade e efeito da operação continuam determinados/validados no servidor. A interface não deve pedir dado financeiro real em formulário de simulação.

## Agrupamento, responsividade e saída

Agrupar por assunto usando título, espaço e descrição curta; não criar painel para cada campo. Mobile tem uma coluna; desktop/tablet podem alinhar campos relacionados se rótulos, conteúdo e erros couberem sem compressão. A ordem de leitura/foco deve permanecer a mesma. Ações ficam após o grupo ao qual pertencem, sem barra fixa cobrindo o último campo.

Formulários longos ficam na página. Dialog comporta edição breve; endereço continua condicionado à definição dos campos. Confirmar descarte apenas quando há perda relevante, sem aninhar modais. Retornar de etapa no checkout conserva dados seguros, sem sugerir que preço ou estoque permanecem garantidos.

Ver [Feedback e estados](feedback-estados.md) para retenção de mensagens e [Interações](interacoes.md) para foco/fechamento. Não transformar todo erro de campo em Dialog.

## Revisão do padrão

- [ ] Rótulo, ajuda, obrigatoriedade e erro continuam compreensíveis sem cor ou placeholder.
- [ ] Campos podem ser preenchidos, colados e corrigidos por teclado; foco continua visível no erro.
- [ ] Envio não duplica operação e falha não perde conteúdo seguro.
- [ ] Erros e sucesso correspondem ao resultado confirmado, sem promessa de funcionalidade pendente.

## Aplicações implementadas

CEP compartilha máscara12345-678 em conta e checkout: aceitar digitação/colagem dos oito dígitos e preservar posição do cursor na edição. No-op normalizado informa “Já está atualizado.” sem reenviar intenção inalterada. Carrinho mantém confirmação explícita, consolida a última quantidade após500ms e não apaga edição mais recente ao receber resposta anterior.

Imagem de produto usa arquivo local, progresso e prévia autenticada. Seleção pendente ou falha impede salvar; cancelar conserva a imagem anterior. Remover restaura o placeholder neutro. Validação final de arquivo, acesso e associação pertence ao servidor.
