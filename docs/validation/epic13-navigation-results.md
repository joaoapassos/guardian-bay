# Guardian Bay — validação de 1.000 usuários navegando

**PASS no laboratório local:** 1.000 usuários virtuais autenticados durante 20 minutos de medição, com um único processo Next. Todos comprovaram atividade individual, sem erros inesperados e com integridade PostgreSQL preservada. A meta de 5.000 requisições em voo foi encerrada por mudança de escopo.

## Resultados

| Usuários | Medição | Leitura p95 | Escrita p95 | Erros | Pedidos pagos na execução |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 10 min | 6,43 ms | 10,14 ms | 0 | 24 |
| 250 | 10 min | 6,24 ms | 9,10 ms | 0 | 60 |
| 500 | 15 min | 6,07 ms | 9,19 ms | 0 | 160 |
| 1.000 | 20 min | 25,77 ms | 38,18 ms | 0 | 480 |

Cada etapa incluiu 60 segundos de rampa e 60 de aquecimento, com drenagem separada para concluir jornadas. Percentis e volume abaixo são do plateau; pedidos abrangem toda a execução, incluindo aquecimento e drenagem.

No patamar final: **99.972 leituras + 8.565 escritas**, aproximadamente **90,45 requisições/s**. Os 1.000 usuários concluíram a participação, com mínimo de **92 leituras medidas por usuário**. Leitura p99 de48,72ms e escrita p99 de76,61ms. Mantidos os SLOs: leitura p95<500/p99<1.500ms, escrita p95<1.500/p99<3.000ms, checks100% e erros inesperados<1%. Nenhum limite foi aumentado para aprovar.

Na execução final, o backend aprovou480pedidos fictícios:362cartão,63Pix e55boleto. PostgreSQL confirmou480unidades consumidas e480eventos de conclusão com ator correto. Zero estoque negativo, totais incorretos, estados de pagamento inconsistentes ou intenções duplicadas. O contadorHTTP foi confrontado com persistência; término do k6 sozinho não aprovou o teste.

## Ambiente e perfil efetivamente testados

- Windows11, IntelCorei5-14600K,20processadores lógicos e31,77GiB de RAM. Aplicação, proxy, PostgreSQL e gerador compartilharam a máquina.
- Node26.7.0, Next16.4.3, PostgreSQL18.6 e k6v2.3.0. Um processo Next em produção e pool máximo de dez conexões. Proxy HTTPS local com HTTP/2 habilitado.
- Build DrWP4iqp5d8p3_D5am9sh; árvore src e3a28a7729a0bb47cbacc3f5ea509e3a88e7d3c8. Hash do harness ef844eef618c79b3c9ad70fa7f4d9fa9baa1a37f985998c38bb2922e1ccdad8f. Manifest e relatório identificam a revisão executada.
- Hipóteses:70% navegação,20% carrinho,8% checkout e2% histórico; pausas de8–16s e compras a intervalos>=240s. Sessões distintas provisionadas antes da medição. Atividade usa a Action real a cada cinco minutos.
- Dados fictícios:1.000identidades, nove produtos publicados; compras concentradas em umSKU e carrinhos com um item. Cartões somente de fixtures autorizadas. Pix/boleto aguardam31/61s naturais e dependem da confirmação do servidor. Nenhuma operação financeira real.

Máximos amostrados do host no patamar final: CPU65,95%, RAM60,66% e19conexõesPostgreSQL; zero lock waiters nas amostras. Isso não demonstra ausência absoluta de contenção entre amostras. O pico observado foi26requests pendentes no proxy: **1.000 usuários navegando não equivalem a1.000HTTPemvoo**.

## Recuperação e limpeza

Após a carga, dez leituras HTTPS consecutivas retornaram200 e conteúdo esperado, usando o mesmo helper, CA e identidade da referência anterior. Referência p95 de12,08ms; limite+20% de14,49ms; maior leitura das dez de12,81ms. Checagem concluída29,17s após o relatório da carga. Invariantes globais e smokeHTTP2 de autenticação, anonimato, autoridade eCSP passaram novamente. Não houve teste de recuperação de pane ou DDoS.

Foram aposentados dez arquivos de diagnóstico/preflight sem uso no novo fluxo, além do profiler experimental. O runner existente foi reaproveitado para a navegação sustentada. Removidos11perfis temporários parados do Chrome, liberando413,5MiB; dados e evidências do PostgreSQL foram preservados. Detalhes em epic13-cleanup-and-target.md e epic13-navigation-cleanup.json.

## Evidências e reprodução

- [Procedimento e critérios](epic13-navigation.md).
- [Resultado100](epic13-navigation-100-1792893559124.json), [250](epic13-navigation-250-1792894398757.json), [500](epic13-navigation-500-1792895487606.json), [1.000](epic13-navigation-1000-1792896960658.json).
- [Recuperação](epic13-navigation-recovery-1792896989791.json), [referência anterior](epic13-navigation-recovery-baseline-1792895570535.json) e [limpeza](epic13-navigation-cleanup.json).

Os identificadores task-35-navigation-* pertencem ao runner introduzido naTask35; as execuções foram registradas nas Tasks36–39. Resultados históricos permanecem disponíveis. Para repetir, execute uma etapa por vez conforme o procedimento, confira os critérios e os dados PostgreSQL, revise o registro e só então avance. O gate compara perfil, hash do harness, build, topologia e a última tentativa; falha ou interrupção bloqueia avanço.

A conclusão é restrita a este ambiente, build, dados, perfil e duração. Não mede1.000logins em massa, navegadores completos, assets, grandes carrinhos ou outro servidor. O servidor prático precisa repetir o perfil antes de extrapolar a capacidade. Este resultado não é garantia absoluta de disponibilidade.

## Gates finais

Verificação final aprovada: Biome (317 arquivos), TypeScript, 121 testes unitários, 17 testes do harness e integridade do repositório. Gitleaks: zero segredos sem triagem; Semgrep: zero achados pendentes; SCA de produção: zero achados. SCA completo mantém quatro achados preexistentes de ferramentas, com triagem vigente e nenhum pendente. O mesmo código de produto já passou em187testes PostgreSQL e13HTTP/browser antes da campanha; os fluxos reais acima exercitaram os três métodos sob carga. Nenhuma migration ou dependência foi adicionada nesta continuação.
