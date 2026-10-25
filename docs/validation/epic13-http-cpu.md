# Task32 — CPU de proxy e aplicação

runtime-observer oferece LAB_CPU_PROFILE_ROLE=all com LAB_CPU_PROFILE=1 para perfilar supervisor/proxy e apps por45segundos, sem porta de inspector. Padrão anterior sóapp preservado. Rawprofiles permanecem privados. http-cpu-summary.mjs exige todos9perfis do run/topologia atuais, verifica frescor, exporta categorias e nomes de função sanitizados sem URLs/stacks.

O1000perfilado novamente falhou:p95670ms,pico1000,zeroerros,PGíntegro. Não utilizar perfilado como baseline limpo. Perfis incluem startup,aquecimento sequencial,idle eburst. Não é possível atribuir percentis de latência às porcentagensCPU ou medir aquisição de poolSQL dessa forma.

Proxy:885amostrasativas; função connect teve111selfsamples. Aplicação exemplo:1630ativas,469next-render,424next-other,74GC. Há atividade de render e conexão no proxy, mas sem função de produto isolada que justifique outra modificação comercial. Maisréplicas não foi suficiente naTask31.

Hipótese delimitada seguinte: proxy dispara socketsHTTPbackend sem teto explícito porhost;1000requests podem iniciar muitas conexões locais antes de qualquer resposta. Avaliar Agentkeepalive com teto pequeno porbackend, mantendo requestsHTTPpendentes no proxy e timeout/SLOinais. É controle de encaminhamento, não redução de concorrência medida; aceitar somente se contadorproxy confirmarN, latência e integridade passarem. Comparar mesma8replicas/pool5; não alterar padrão sem evidência.
