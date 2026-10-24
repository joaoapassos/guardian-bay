# Task 8 — abuso, entradas e exposição

Executar `node scripts/validation/abuse.mjs` com lease, captures e Chrome explícito. Renova B por login real, envia no máximo 11 chamadas de cartões para localizar cap, comprova isolamento A/B e aguarda janela natural (até 60s), sem alterar counters ou prazos. Não confundir RATE_LIMITED em resposta Flight com erro HTTP. Não representa teste volumétrico de autenticação ou DDoS.

Burp manual: capturar requisição positiva, enviar fixture não autorizada, mês 13, campos PAN/CVV e quantidade negativa; esperado INVALID_INPUT e DB sem efeito. Query SQLi deve ser literal, não enumerar catálogo. Pesquisa com payload de imagem deve aparecer como texto/valor de input, sem imagem executável nem marcador JS; conferir DOM, não só string HTML. Erro não pode conter token, hash de senha, SQL/stack ou URL de banco. Após dez operações de cartão/minuto, A é bloqueado; B permanece independente; repetir A depois do vencimento da janela e comprovar recuperação.

Evidências: args redigidos, resultado Flight, contadores por userId/operação, relógio do banco e DOM. Payloads exclusivamente sintéticos. Não enviar coleções gigantes nem tentar esgotar memória enquanto SCA-01 não estiver tratado. Taxas/slots globais de autenticação têm cobertura automatizada existente; campanha de saturação desses slots deve ser separada e delimitada, não inferida deste teste.

Observado: dez casos PASS. Fixture inválida, mês inválido, PAN/CVV extras e quantity negativa rejeitados; SQL-looking query não enumerou fixtures; navegador refletiu payload como valor sem executar evento; erro sem dados privilegiados; cap 10 preservado, B independente e A recuperou após janela natural. Nenhum counter/prazo foi antecipado para esse resultado.
