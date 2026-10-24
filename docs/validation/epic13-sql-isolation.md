# Task23 — custo do ciclo SQL isolado

Aplicação/proxy encerrados antes da medição para não exceder orçamento do cluster. Novas sessões sintéticas provisionadas fora da janela; fixture anterior preservada. Script isolate-sql-cycle.mjs valida cluster e lease; quatro pools max10, transações default READ ONLY, statement_timeout2s e deadline global15s; fechamento garantido dos clientes. Nenhuma mutation comercial, migration ou alteração do produto.

250jobs/750SELECTs de projeções equivalentes a catálogo/conta, todos os40sockets aquecidos antes: pipeline padrão100 concluiu em70,66ms, p95 dos ciclos59,57ms; pipeline1 concluiu67,83ms, p9566,27ms. Ordem fixa e execução exploratória única não comprovam diferença estatística. Não alterar pipeline do produto com base nesse resultado.

O teste exclui Drizzle, mapeamento monetário, RSC/HTML, HTTP e TLS; quatro pools estão em um processo Node, diferentemente dos quatro processos Next. Não subtrair seus percentis dos percentis HTTP para afirmar percentual exato de renderização. Evidência limita a hipótese de saturação do driver/SQL naquele dataset; não prova capacidade de aplicação, cardinalidade de produção ou5000requests.

Próxima intervenção delimitada: permitir orçamento explícito de pool por processo, padrão existente preservado, para comparar oito processos com cinco conexões cada, contra quatro com dez. Orçamento total continua40, guard do cluster80/100 e memória85% mantidos. Escalar indefinidamente sem medir não está autorizado pelo plano; interromper na primeira evidência de falta de recursos/medição válida.
