# Task 7 — autenticação, autorização, sessão e CSRF

Reprodução automatizada sobre capturas reais: `node scripts/validation/identity.mjs`. Requer Task 5, lease e fixtures intactas. O script revoga somente a sessão da fixture B ao final; para próximas campanhas, renovar B por login real ou reconstruir fixtures. Nenhuma proteção da aplicação é desativada.

## Procedimento manual Burp Community

Instalar versão oficial, registrar versão e usar navegador interno/perfil exclusivo. Proxy em listener loopback diferente do laboratório (ex.: 127.0.0.1:8080); escopo somente https://127.0.0.1:3449. Certificado Burp somente nesse perfil. Não usar conta real, extensões de colaboração externa ou Scanner Pro.

1. Fazer login como A e confirmar /account; capturar um POST Next-Action de remoção de cartão e enviá-lo ao Repeater. Manter ID/estrutura da build real. Controle positivo: remover cartão próprio de fixture ou ID inexistente retorna success.
2. Perfil B separado: capturar sua sessão, substituir apenas cardId/orderId pelo de A; ler detalhe de A. Esperado: sem dados de A, confirmação NOT_FOUND, remoção idempotente sem apagar linha de A. Consultar DB somente leitura, comparando dono e contagem.
3. Como customer, consultar /admin/orders; como admin, repetir. Esperado: customer 404, admin 200. Esconder menu não comprova autorização.
4. Repeater: remover Origin, usar null, origem externa e HTTP. Esperado: rejeição >=400 e nenhum efeito. Testar Host divergente (proxy deve rejeitar) e forwarded externo (proxy remove). Diferenciar camada proxy de guard Next/Action.
5. Enviar corpo >16KB, campos extras e sessão ausente/revogada. Esperado: sem mutation, erro sanitizado. Login com conta desconhecida e senha incorreta de conta conhecida deve ter resposta pública equivalente; medir timing em campanha separada antes de alegar resistência temporal.
6. Logout/revogação: guardar cookie de fixture somente localmente, encerrar sessão e repetir request. Esperado: UNAUTHENTICATED. Testar expiração absoluta/idle com fixtures dedicadas; sem editar datas, verificar passagem natural quando viável.

Evidências: request/response redigidos, IDs de cenário, controles positivos, status HTTP + resultado Flight, queries read-only e horário/SHA/build. Cookies, senha e sessão de projeto Burp não entram no Git.

Execução humana no Burp não é automatizada nesta sessão: o roteiro está pronto, mas não deve receber PASS sem operador registrar seus próprios observado/evidência. O replay HTTP separado verifica os mesmos boundaries por requisições reais, sem afirmar que substitui a revisão manual.

Resultado observado: 14 controles HTTP/DB PASS (visitante, identidade própria, vertical, BOLA pedido/cartão, quatro origens indevidas, forwarded, body limit, equivalência de erro, revogação e integridade). Big Redirect do ZAP foi conferido no acesso anônimo: resposta 307 sem e-mail/token das fixtures; o alerta não confirmou vazamento nesse caso. Risco temporal de enumeração não foi medido. Burp humano permanece LIMITATION.
