# Task 5 — captura da aplicação real

Executar com laboratório pronto e SECURITY_BROWSER_PATH explícito: `node scripts/validation/capture.mjs`. Chrome usa perfil temporário exclusivo e confiança de certificado restrita a esse perfil. Não executa servidor de probe nem altera arquivos app/features.

Procedimento independente: abrir DevTools Network ou proxy Burp/ZAP no perfil de laboratório; fazer login como A; cadastrar/remover test-2; adicionar e atualizar item do carrinho; selecionar Pix no checkout; aguardar 30 segundos reais; solicitar confirmação. Observar POSTs Next-Action, seus argumentos e resposta Flight, e consultar pedido/pagamento/estoque/audit no banco de teste. Repetir como B/admin em seus próprios perfis para autorização. Cookie de A não deve aparecer no perfil B.

Actions capturadas: login, saveCard, removeCard, addCart, updateCart, checkout, confirmPayment. Capturas privadas em .vitest/epic12/captures.json contêm IDs e bodies da build real; regenerar após rebuild. Cookies privados em fixtures.json. Não versionar/exportar esses arquivos sem redigir credenciais. HTTP replay usa ID capturado na rota real e decodifica success/code da resposta Flight; status HTTP sozinho não indica efeito comercial.

## Resultado observado em 2026-10-23

Três controles positivos PASS: login real levou a /account com cookie HttpOnly/Secure/SameSite=Lax; sete IDs capturados e replay de cadastro retornou success; Pix aguardou intervalo natural, backend aprovou e UI refletiu o resultado. Nenhuma data de pagamento foi alterada para antecipar elegibilidade. Report estruturado task-05-real-surface.json inclui build/árvore de produto e runId.

Limite: execução via CDP reproduz UI real, mas não é execução humana no Burp. Roteiro manual acima permanece disponível; os demais grupos acrescentam esperado/observado. Transporte privado é implementação de teste dependente da build, não API pública estável nem recomendação de criar endpoint interno.
