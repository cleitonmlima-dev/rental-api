# SPEC-003 — Fundação da aplicação

Data: 03/11/2026  
Status: artefatos da fundação preparados; aceite pendente dos checks de execução  
ADR: [ADR-003](../adr/003-fundacao-nestjs-postgres-redis.md).  
Base: [SPEC-002](002-implementacao-rental-pipeline.md).  
Plano: [incremento 1](../planos/002-plano-execucao.md#1-fundação-da-aplicação).

Atualizada pela [SPEC-010](010-legibilidade-orm-contratos-e-mensageria.md): controle em `public`, comandos npm nativos, perfil `test` e inventário de testes revisto. O escopo inicial da fundação não descreve todo o código atual; os incrementos seguintes já têm fontes de negócio preparadas.

## 1. Objetivo e escopo

Criar a base NestJS/TypeScript, configuração validada, conexão PostgreSQL, cliente Redis opcional, endpoints de saúde, comandos de desenvolvimento/migration/testes e containers locais. A etapa não cria tabelas ou endpoints de negócio.

Nesta etapa, os módulos Customer, Property e Proposal foram registrados vazios; os incrementos seguintes os preencheram. TypeORM usa `synchronize: false` e uma conexão gerenciada pelo ciclo de vida NestJS. O cliente Redis conecta em segundo plano e não bloqueia inicialização/prontidão.

## 2. Versões e configuração

As versões diretas ficam exatas no `package.json`; Node fica em `.nvmrc` e no Dockerfile. CommonJS e TypeScript com decorators/metadata atendem ao NestJS/TypeORM sem bundler. Não adicionar dependências de observabilidade/DTOs antes dos respectivos incrementos.

Obrigatórias na fundação: `DATABASE_URL`, `MIGRATION_DATABASE_URL` para comandos de migration e `REDIS_URL`. A SPEC-010 acrescenta região/ARN SNS e configuração AWS; o migrator reutiliza a validação comum, sem conexão Redis/SNS. URLs não aparecem em logs ou mensagens de erro. O ambiente de desenvolvimento pode carregar `.env` pelo suporte nativo do Node; o container recebe variáveis do Compose.

| Variável | Default | Regra |
| --- | --- | --- |
| `NODE_ENV` | `development` | development, test ou production. |
| `PORT` | 3000 | Inteiro de 1 a 65535. |
| `DB_CONNECT_TIMEOUT_MS` | 1000 | Inteiro positivo. |
| `DB_LOCK_TIMEOUT_MS` | 1000 | Inteiro positivo. |
| `DB_STATEMENT_TIMEOUT_MS` | 3000 | Maior ou igual ao lock timeout. |
| `DB_OPERATION_TIMEOUT_MS` | 5000 | Maior que o statement timeout; aplicado à transação de propostas. |
| `REDIS_COMMAND_TIMEOUT_MS` | 150 | Inteiro positivo; limita conexão e futuros comandos. |
| `REDIS_LOCK_TTL_MS` | 10000 | Maior que o prazo de operação; aplicado à trava de transição. |

Valores inválidos falham antes de abrir conexões, com indicação da variável e sem ecoar valores sensíveis. Limites são configurações iniciais, não metas de performance.

Todos os parâmetros em milissegundos aceitam no máximo 2.147.483.647. A validação de `MIGRATION_DATABASE_URL` identifica essa variável, sem depender da existência de `DATABASE_URL` e sem expor a URL nos erros. Os outros parâmetros continuam compartilhados com a aplicação.

## 3. Inicialização e ciclo de vida

1. Validar a configuração e registrar os três módulos.
2. Inicializar PostgreSQL com timeout de conexão, timezone UTC e limites de instrução/lock.
3. Iniciar a conexão Redis sem aguardar sua disponibilidade; desabilitar fila offline, registrar erro sem credenciais e permitir reconexão limitada por intervalo.
4. Expor HTTP após a inicialização do banco; habilitar SIGTERM/SIGINT para encerrar HTTP, pool e Redis.

PostgreSQL indisponível impede o startup. Falha/indisponibilidade Redis não impede startup. Encerramento não deve ficar aguardando reconexão Redis.

## 4. Saúde

- `GET /health/live`: 200 com `{ "status": "ok" }`, sem consultar dependências.
- `GET /health/ready`: executa `SELECT 1`; 200 quando PostgreSQL responde, 503 com `INTERNAL_ERROR` e
  `Não foi possível concluir a operação.` em falha, conforme a [SPEC-012](012-erros-internos-genericos.md).
  Não consulta Redis.
- Os endpoints ficam fora do prefixo `/api/v1` reservado ao negócio.

O contrato HTTP compartilhado de erros/correlação e Swagger foi preparado na fase cadastral e revisado pela SPEC-010. Não acrescentar endpoints de negócio nesta etapa.

## 5. Banco e containers

Bootstrap repetível cria os três papéis e concede ao migrator os privilégios técnicos em `public`, revogando `CREATE` de `PUBLIC`. O schema `proposal` antecipado foi removido pela ADR-010: a migration inicial cria os três schemas de negócio. Senhas vêm das variáveis locais, com quoting pelo psql.

O DataSource da CLI exige a URL do migrator e mantém o controle em `public.typeorm_migrations`, conforme a ADR-010. O DataSource da API usa somente a URL da aplicação.

O Compose inclui:

- PostgreSQL com volume persistente, bootstrap e healthcheck.
- Redis independente, sem volume necessário para uma futura trava temporária.
- Serviço `migrate`, que usa a imagem da aplicação e termina antes da API.
- API com usuário sem privilégios, healthcheck de readiness e sem dependência de saúde Redis.
- Tooling/lockfile Docker e perfil `tools` foram removidos pela ADR-010; Node/npm executam no host.
- PostgreSQL temporário no perfil `test`, LocalStack e stack de observabilidade foram acrescentados pelos incrementos seguintes. Integração inicia dependências separadamente; unitários não abrem conexões.

O Dockerfile exige `package-lock.json`, instala com `npm ci`, compila e remove dependências de desenvolvimento da imagem final. Não aceitar build não reproduzível como substituto da geração do lockfile.

## 6. Comandos previstos nesta entrega

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Executar TypeScript com watch e `.env` opcional. |
| `npm run build` | Compilar a aplicação em `dist/`. |
| `npm run check` | Verificar tipos, lint, unitários e build limpo em sequência. Não inclui integração. |
| `npm start` | Executar o build. |
| `npm run typecheck` | Verificar tipos de aplicação e testes. |
| `npm run lint` | Análise estática de aplicação e testes. |
| `npm test` | Unitários vigentes: configuração, contratos, erros, transições e rejeição assíncrona Redis; sem conexões. |
| `npm run test:integration` | HTTP/PostgreSQL real, conexão Redis real e cenários de indisponibilidade. |
| `npm run migration:run` / `migration:revert` / `migration:show` | CLI TypeORM com URL do migrator. |
| `npm install --package-lock-only` | Resolver o lockfile real com Node/npm e rede. |
| `npm ci` | Instalar a árvore resolvida pelo lockfile. |
| `npm run lint:fix` | Aplicar correções disponíveis do ESLint; limite de 120 colunas. |

A fundação original não continha migrations de domínio. Hoje `InitialSchema` e `BusinessViews` estão preparadas, com cinco tabelas e views; execução ainda pendente.

## 7. Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| F-01 | Instalação npm gera lockfile válido; `npm ci`, build, typecheck e lint passam. |
| F-02 | Testes de config cobrem URLs ausentes/inválidas sem vazar credenciais, limites, unidades e relações entre prazos. |
| F-03 | Vida não consulta banco; readiness consulta e mapeia falha para 503. |
| F-04 | Integração inicia NestJS com PostgreSQL real e Redis inacessível; vida e readiness respondem 200. |
| F-05 | URL da aplicação usa `rental_app`; URL de migration é independente; `synchronize` permanece falso. |
| F-06 | Bootstrap executa em banco limpo e pode ser repetido sem destruir dados. Aplicação não recebe DDL/superuser. |
| F-07 | Compose é válido; imagem compila com lockfile e ambiente inicia após migrations sem exigir Redis saudável. |
| F-08 | Shutdown encerra conexões, inclusive Redis em reconexão; configuração/README/ADR/spec e plano refletem o estado real. |

A cobertura vigente combina unitários de limites/configuração/rejeição assíncrona Redis e integração real de HTTP/saúde, papéis, Redis conectado/fora, shutdown e startup sem PostgreSQL. A SPEC-010 removeu unitários que apenas repetiam configuração/lifecycle; readiness 503 agora encerra o pool real e preserva liveness 200. A suíte de integração completa exige PostgreSQL e Redis reais; o teste de continuidade força a URL Redis para uma porta inacessível sem alterar a dependência da aplicação.

## 8. Estado de verificação

Os checks de execução foram adiados pelo responsável para outra sessão. Na retomada em 04/11, foram encontrados
Node 26.13.0/npm 11.20.0 no NVM, fora do PATH; Node 24 não foi encontrado. `npm install --package-lock-only`
falhou por DNS do registry (`EAI_AGAIN`), sem gerar lockfile ou instalar dependências. `docker version` confirmou
`permission denied` em `/var/run/docker.sock`. Oito casos de configuração passaram com Node 26 nativo em cópia
temporária do teste que ajusta apenas o caminho de import; a suíte npm e o aceite com Node 24 continuam pendentes.

Não houve tentativa de alterar permissões do host ou contornar o isolamento. O perfil `tools` foi removido pela ADR-010. A validação atual requer Node/npm no host, além de Docker/rede para integração.

Verificações executadas nesta entrega:

| Verificação | Resultado |
| --- | --- |
| Configuração Compose | Verificação histórica incluía tooling; a SPEC-010 conferiu o Compose vigente padrão/perfil `test`, sem daemon. |
| Modelo Compose resolvido | A verificação histórica conferiu papéis e ordem de startup. A SPEC-010 conferiu o modelo vigente com ambientes segregados e API dependente apenas de migration; execução permanece pendente. |
| `sh -n infra/postgres/001-bootstrap.sh` | Aprovado; sintaxe shell válida. Não comprova execução SQL. |
| JSON e links documentais | Conferidos arquivos JSON, exemplos e destinos/âncoras locais. |
| Acesso ao daemon | Negado em `/var/run/docker.sock`, mesmo com escrita permitida pelas permissões visíveis. Evidência de restrição adicional da sessão; a regra exata não foi identificada. |
| Configuração isolada | Oito casos passaram com Node 26 nativo; verificação parcial registrada na SPEC-010, sem substituir Node 24/typecheck. |
| Instalação e lockfile | Tentativa atual falhou por DNS do registry; dependências/lockfile não foram produzidos. |
| Build, lint, suítes npm e containers | Não executados; pendentes de Node 24, dependências e acesso aos serviços. |

Não marcar a fundação ou os incrementos seguintes como aceitos com base apenas na presença dos arquivos. A preparação de fontes avançou; a validação de execução continua pendente.

## 9. Entrega preparada e pendências

### Artefatos preparados

| Parte da fundação | Arquivos/evidência de implementação |
| --- | --- |
| Aplicação e módulos | `src/application.ts`, `src/main.ts`, `src/app.module.ts` e módulos Customer/Property/Proposal, posteriormente preenchidos pelos incrementos de negócio. |
| Configuração | `src/config/`, `.env.example`, `.nvmrc`, `.npmrc`; URLs separadas, limites de timers e erros sem eco de credenciais. `.env` local foi criado apenas se ausente, sem sobrescrever configuração existente. |
| PostgreSQL/migrations | `src/database/`, bootstrap de papéis/schema em `infra/postgres/001-bootstrap.sh`, CLI TypeORM com URL própria e `synchronize: false`. |
| Redis | `src/redis/`, conexão em segundo plano, fila offline desabilitada e shutdown sem esperar reconexão. |
| Saúde | `src/health/health.controller.ts`, vida independente e readiness PostgreSQL, fora de `/api/v1`. |
| Ferramentas | `package.json`, tsconfigs, ESLint, build limpo e `npm run check`; versões diretas fixadas. |
| Containers | Dockerfile multi-stage e Compose com API/migration/PostgreSQL/Redis, LocalStack, observabilidade e PostgreSQL temporário no perfil `test`; npm nativo pela SPEC-010. |
| Unitários preparados | `configuration`, `dto`, `http-errors`, `proposal-transitions` e `redis`; cinco suítes, 73 casos após expandir a matriz. Oito casos de configuração passaram isoladamente com Node 26; suíte npm pendente. |
| Integração preparada | `test/integration/foundation.spec.ts`, `redis.spec.ts` e `startup.spec.ts`: HTTP, papéis, Redis real/fora, PostgreSQL fora e shutdown. Não executada. |
| Retomada documentada | README com Node/npm nativos e Docker para serviços, mais plano com pendências separadas dos artefatos. |

### O que falta para aceitar a fundação

| Critério | Falta efetivamente |
| --- | --- |
| F-01 | Gerar `package-lock.json` com resolução real; conferir peers/versões; executar `npm ci` e `npm run check`; corrigir e registrar qualquer incompatibilidade encontrada. |
| F-02 | Oito casos de configuração passaram isoladamente em Node 26; executar a suíte npm com Node 24, incluindo URLs do app/migrator, ausência de vazamento e limites/relações dos prazos. |
| F-03 | Executar HTTP de vida/readiness com PostgreSQL real, incluindo pool encerrado, 503 sanitizado e liveness 200. |
| F-04 | Subir PostgreSQL/Redis reais e provar que HTTP/readiness funcionam com a URL Redis deliberadamente inacessível. |
| F-05 | Executar a CLI com migrator e verificar o papel `rental_app` e ausência de privilégios de DDL/superuser na integração. |
| F-06 | Executar bootstrap em volume de desenvolvimento limpo; reaplicá-lo sem apagar dados e conferir permissões. A análise shell não valida o SQL. |
| F-07 | Construir a imagem com o lockfile gerado e subir o ambiente; confirmar migration antes da API e continuidade sem Redis saudável. |
| F-08 | Executar testes de fechamento de HTTP/pool/Redis e verificar SIGTERM no container; atualizar este registro e o plano com resultados. |

A sequência executável está no [README](../../README.md#verificar). Cadastros/propostas, histórico, idempotência, trava e observabilidade já foram preparados nos incrementos seguintes; o [plano](../planos/002-plano-execucao.md#4-pendências-para-aceite) reúne a validação ainda necessária.
