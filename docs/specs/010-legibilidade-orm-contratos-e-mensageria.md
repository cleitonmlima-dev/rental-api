# SPEC-010 — Legibilidade, ORM, contratos e mensageria

ADR: [ADR-010](../adr/010-legibilidade-orm-contratos-e-mensageria.md).  
Status: itens 1 a 20 tratados nas fontes; revisão Ponytail concluída; aceite de execução pendente  
Base: [SPEC-002](002-implementacao-rental-pipeline.md).  
Aceite: [plano de execução](../planos/002-plano-execucao.md#4-pendências-para-aceite).

## Objetivo e escopo

Aplicar os vinte pontos da revisão à V1 existente, sem ampliar as regras de negócio. Preservar reserva atômica,
locks imóvel → proposta, replay confirmado, histórico por trigger, privacidade e continuidade sem Redis.
A ADR/spec antecede a implementação. Os resultados abaixo descrevem fontes preparadas; a verificação comum
registra separadamente o que foi conferido e o que ainda precisa ser executado.

## Itens, comportamento e resultado

| Item | Requisito e critério de aceite | Resultado preparado |
| --- | --- | --- |
| 1 | Explicar `varchar(14)` para CPF sem inventar validação cadastral. | Mantido `text`, somente dígitos e não vazio, sem teto/checksum. Quatorze caracteres comportam a máscara; não garantem onze dígitos válidos. A pergunta não alterou o contrato. |
| 2 | Usar enum PostgreSQL para proposta/histórico, preservando valores e índices. | `proposal.proposal_status` contém os sete estados; propostas, histórico e trigger usam o tipo. `ProposalStatus` alimenta a matriz com 12 transições. Views preservam saídas textuais. |
| 3 | Consolidar na migration inicial ainda não aplicada, com rollback ordenado. | `InitialSchema1793740000000` cria o enum antes das dependências e o remove depois delas; `BusinessViews1793741000000` permanece a segunda migration. Não há conversão incremental. |
| 4 | Separar controle TypeORM dos schemas de negócio e limitar DDL. | `public.typeorm_migrations`; bootstrap revoga `CREATE` de `PUBLIC` e o concede ao migrator. A migration cria `customer`, `property`, `proposal` e seus privilégios. API sem DDL. |
| 5 | Usar entidades/repositórios concretos, com serviços sem banco direto. | Cinco entidades com schema explícito e três repositórios registrados. Callback transacional recebe repositório vinculado ao manager da transação; nenhum estado do provider global é trocado. |
| 6 | Zod valida e normaliza contratos; substituir class-validator/class-transformer. | Zod 4.1.12, schemas estritos e tipos inferidos; pipe cobre corpos, queries, UUIDs e header. OpenAPI usa conversão nativa, sem outra biblioteca. |
| 7 | Inserir/consultar clientes e imóveis por ORM e explicar a escolha anterior. | Repositórios usam `insert`, `findOneBy` e QueryBuilder. SQL anterior buscava reduzir mapeamentos; não era limitação do TypeORM. O item 5 já realizou a mudança. |
| 8 | Retornar `location` no corpo dos três POSTs e no snapshot de replay. | Corpo `201` completo salvo na mesma transação da proposta; replay preserva-o após avanço/encerramento. GETs, listas e PATCH não incluem `location`. OpenAPI/testes ajustados. |
| 9 | Usar parâmetros nomeados conforme colunas/contexto, mantendo conexão e locks. | SQL de contexto/relógio e integração usa nomes; driver TypeORM converte para o protocolo PostgreSQL sem interpolar valores. Sem placeholders posicionais escritos em `src`/`test`. |
| 10 | Limitar código a 120 colunas e oferecer correção do lint. | ESLint cobre TS, scripts MJS e sua configuração; `npm run lint:fix` definido. Linhas foram formatadas diretamente porque `max-len` não as quebra. Comandos npm não executados. |
| 11 | Organizar DTOs/interfaces e corrigir todos os imports. | `dtos/` e `interfaces/` por contexto, paginação compartilhada; sem reexports dos caminhos removidos. DTOs mantêm aliases inferidos por Zod. |
| 12 | Compartilhar schemas/normalização/erros sem duplicar contratos. | `schemas/` separado dos DTOs; primitivos e paginação comuns; catálogo único de status/códigos/mensagens, schema de erro e fábrica de detalhes. Pipe/header/Swagger compartilham contratos. |
| 13 | Tipar parâmetros e respostas conhecidos, preservando validação da fronteira. | Fixtures declaram corpos HTTP e rows SQL consumidos; datas JSON são strings. `unknown` permanece em pipe, exceções e logger externo; payloads inválidos de teste seguem possíveis. Sem `any` substituto. |
| 14 | Reutilizar enums/textos dos mesmos conceitos. | Enums para propostas, estado/tipo de imóvel, evento e códigos de erro; arrays OpenAPI derivados. Migrations e expectativas públicas de testes/demos mantêm literais independentes. |
| 15 | Publicar criação/transições SNS e filtrar sete filas SQS por estado. | Publisher real SNS, configuração AWS, hook LocalStack, sete filas/assinaturas/policies e integração temporária preparados. Sem outbox, worker, consumidor ou reenvio posterior. |
| 16 | Priorizar testes que comprovem comportamento e integração real. | Removidos nove unitários de configuração/lifecycle repetidos. Cinco suítes unitárias, 73 casos com a matriz expandida, e nove de integração preparadas; saúde HTTP encerra pool real e views comparam deltas. |
| 17 | Simplificar Compose e usar comandos npm nativos. | Dez serviços padrão mais `postgres-test` no perfil `test`, sem anchors/tooling/cache. API depende só de migration; ambientes segregados. README/CI e `.env` alinhados, preservando valores existentes. |
| 18 | Consolidar ADR e documentos conforme o resultado final. | ADR/spec 010, README, visão geral, base, plano e notas históricas sincronizados. Catálogo e referências seguem a sequência consolidada no item 19. Links/âncoras e JSON conferidos na consolidação. |
| 19 | Renumerar continuamente ADRs/specs desde 001 e corrigir referências. | Concluído: dez pares 001 a 010, em ordem de registro, e plano base 002. SPEC-001 explicita a política existente; catálogo contém somente registros reais e o próximo ID é 011. Temas antigos sem arquivo permanecem descritos sem IDs. Links/âncoras, títulos, vínculos nos dois sentidos, sequência sem lacunas e exemplos JSON conferidos por Python; dados e timestamps de migrations preservados. |
| 20 | Fazer revisão Ponytail, remover resíduos e registrar riscos/checks reais. | Concluído nas fontes: Ponytail ULTRA revisou contratos, transações, Redis, SNS, testes, observabilidade e entrega. Compartilhados erros Swagger nos três controllers e ampliada a asserção OpenAPI existente; removido import Redis redundante e corrigidos textos de publicação/fixtures. Checks reais e limites estão registrados abaixo; aceite de execução permanece pendente. |

## Persistência e transações

`CustomerEntity`, `PropertyEntity`, `ProposalEntity`, `StatusHistoryEntity` e `IdempotencyRequestEntity` mapeiam as
cinco tabelas. `CustomerRepository`, `PropertyRepository` e `ProposalRepository` executam persistência; serviços
coordenam regras. Migrations mantêm enum, checks restantes, FKs, índices, permissões e o único trigger;
`synchronize: false`, sem subscriber ou atualização automática de datas que duplique os casos de uso.

Criação mantém claim por `ON CONFLICT DO NOTHING` apenas na idempotência, comparação JSONB do payload, lock/reserva,
proposta, histórico e snapshot antes do mesmo commit `READ COMMITTED`. Conflitos de proposta/FK propagam para o
tradutor de erros. Transições bloqueiam imóvel → proposta e atualizam somente colunas permitidas. O relógio e o
contexto local vêm da conexão transacional. Redis usa TTL/token e liberação condicionada, com continuidade pelo banco.

## Contratos HTTP e tipos

Schemas estritos rejeitam campos desconhecidos, arrays/objetos em queries escalares e valores fora dos limites.
Preservam trim, e-mail minúsculo, UUID canônico, descrição ausente/null/vazia como null e CPF sem teto/checksum.
Paginação tem defaults 1/20, página máxima 2.147.483.647 e limite 100. `Idempotency-Key` é único, opaco, não vazio,
não composto só de espaços e tem até 255 caracteres; a saída não é aparada. Seus três códigos de erro continuam
distintos. Validação expõe campo/código, sem valores, mensagens cruas Zod ou nomes de propriedades desconhecidas.

O catálogo `ApiErrorCode` e a tradução por constraint/SQLSTATE preservam códigos/mensagens públicas. A configuração
continua com validação própria. Não há validação de respostas em runtime ou framework genérico de contratos.
Helpers conhecidos usam contratos específicos; fronteiras externas continuam exigindo estreitamento de `unknown`.

## Mensageria

`ProposalStatusPublisher` usa `@aws-sdk/client-sns` 3.1161.0; o cliente SQS 3.1161.0 é dependência de desenvolvimento.
Cada evento tem `eventId`, `type=ProposalStatusChanged`, `schemaVersion=1`, `occurredAt=statusEnteredAt`, `proposalId`,
`customerId`, `propertyId` e `status`. O ID é `ProposalStatusChanged:<proposalId>:<status>`; se o fluxo passar a
revisitar estados, esse identificador precisa ser revisto. Não há dados pessoais no payload.

Criação nova publica `NOVA`; cada PATCH confirmado publica seu destino após commit, métrica transacional e
liberação Redis. Replay, rejeição e rollback não chegam ao publisher. A promessa é aguardada e falhas síncronas/
assíncronas geram `PROPOSAL_STATUS_PUBLICATION_FAILED` e `rental_publication_failures`, preservando estado e HTTP.
O cliente usa prazo com abort, `maxAttempts=1` e shutdown próprio. SNS não integra startup/readiness.

`SNS_TOPIC_ARN` é obrigatório e deve corresponder à `AWS_REGION` (default `us-east-1`); `AWS_ENDPOINT_URL` é opcional.
`SNS_PUBLISH_TIMEOUT_MS` tem default de 2.000 ms; credenciais vêm da cadeia padrão AWS. As credenciais `test` e o
endpoint LocalStack são apenas locais. Em AWS, tópico/assinaturas são provisionados antes e a API precisa de
`sns:Publish`. Nenhuma chamada à AWS real foi feita nesta sessão.

LocalStack 4.10.0 usa `infra/localstack/010-messaging.py` para criar `rental-proposal-status` e as filas
`rental-proposal-<status minúsculo com hífens>`. Cada assinatura filtra `MessageAttributes.status` (`String`), usa
entrega raw e policy `sqs:SendMessage` do principal SNS condicionada ao ARN exato do tópico. Não há consumidor.
Uma queda após commit ou erro SNS pode perder o evento. SNS/SQS standard podem duplicar/reordenar; consumidores
devem deduplicar pelo ID. Outbox, retry posterior e worker continuam fora do escopo.

## Testes e operação preparados

Unitários: `configuration`, `dto`, `http-errors`, `proposal-transitions` e `redis`, com 73 casos após expandir os
49 pares da matriz. Integração: `business`, `concurrency`, `foundation`, `lock`, `messaging`, `redis`,
`redis-unavailable`, `startup` e `views`. As suítes usam fixtures/tipos comuns, PostgreSQL/Redis reais e SNS/SQS
LocalStack. As suítes npm não foram executadas. Oito casos de configuração passaram isoladamente com Node 26
nativo, conforme a verificação abaixo. Concorrência usa conexões independentes e barreiras, sem sleeps para forçar disputa.

Saúde HTTP prepara readiness 503 sanitizado após encerrar o pool real, com request ID e liveness 200. Views comparam
totais antes/depois das fixtures, duração/idade e permissões. Mensageria cria/remove tópico e sete filas próprios,
sem drenar desenvolvimento; prepara roteamento, ordem pós-commit/release/métrica, ausência em replay/rollback e
commit preservado após falha real do SNS. Duplicatas standard são permitidas na coleta.

Compose declara onze serviços no arquivo: dez padrão, incluindo `migrate` pontual, e `postgres-test` no perfil
`test`, banco `rental_test` em tmpfs. Cinco volumes persistentes permanecem. API recebe a URL do app; migrator,
a sua URL. A validação comum ainda exige configuração Redis/SNS no migrator, sem conectá-lo a esses serviços.
Só migration bloqueia API. Desenvolvimento/CI executam Node/npm no host; Dockerfile exige lockfile e `npm ci`.
As chaves ausentes do `.env` foram acrescentadas sem modificar os 17 valores anteriores; segredos não são publicados.

## Revisão final Ponytail

Revisão ULTRA concluída em 04/11/2026: contratos/controllers, entidades/repositórios, serviços/transações, migrations,
Redis, SNS/SQS, observabilidade, testes, scripts e operação foram lidos em conjunto. Os erros Swagger repetidos
passaram a usar `ApiErrorResponses`, também aplicado a imóveis; a asserção OpenAPI existente cobre os três recursos.
Foi removido o import Redis redundante do módulo raiz; `ProposalModule` continua importando seu módulo.
O painel técnico agora identifica publicação SNS real e o README descreve as fixtures sem prometer limpeza que
elas não executam. Os três dashboards e a stack requerida foram mantidos. Nenhuma nova camada, dependência,
regra de negócio ou opção futura foi acrescentada.

## Verificação comum e aceite

Checks executados durante os itens: leitura/asserções textuais de contratos, transações, enum e imports locais;
JSON/YAML e AST Python; hook/healthcheck com boto3 simulado sem rede; limite textual de 120 colunas;
`sh -n infra/postgres/001-bootstrap.sh`; configuração Compose padrão e com perfil `test`; links/âncoras locais e
exemplos JSON. A consolidação documental reconferiu links e exemplos. A renumeração conferiu dez pares ADR/spec,
catálogo, plano e referências, sem lacunas desde 001; exemplos JSON e arquivos fora da documentação foram
preservados. Esses checks não executam ESLint, Zod, SQL, SDK AWS ou os serviços reais.

Na revisão final foram reconferidos 79 arquivos TS e 226 imports nomeados locais com exports existentes,
7 arquivos JSON, 8 YAML, 83 arquivos de código com até 120 colunas, AST do hook Python e sintaxe shell.
O hook foi executado com boto3 simulado, sem rede: sete filas, filtros por estado, entrega raw e policies com
o ARN exato do SNS. Asserções de fonte conferiram as cinco entidades/três repositórios, schemas explícitos,
ausência de SQL nos serviços, parâmetros nomeados e ordem claim/locks/snapshot/métrica/liberação/publicação.
Links/âncoras e exemplos JSON foram reconferidos após os ajustes finais.

Node 26.13.0/npm 11.20.0 estão instalados no NVM, fora do PATH; Node 24 não foi encontrado. `node --check`
passou em `scripts/demo.mjs` e `eslint.config.mjs`. Oito casos de `configuration.spec.ts` passaram pelo Node 26
nativo em cópia temporária `.mts`, ajustando apenas o import para o caminho absoluto `.ts`, sem alterar os testes.
Isso verifica configuração isolada; não é execução da suíte npm, typecheck nem compatibilidade com Node 24.

Uma tentativa atual de `npm install --package-lock-only`, com zero retries e prazo de 10 s, falhou por DNS
(`EAI_AGAIN`, `registry.npmjs.org`), sem instalar dependências ou produzir lockfile. `docker version` confirmou
acesso negado ao socket do daemon. Não houve nova tentativa após esses bloqueios. `lint:fix`, lint, typecheck,
build, suítes npm, bootstrap/migrations e containers continuam pendentes. `package-lock.json` não foi fabricado.

Para aceitar: gerar/versionar o lockfile, conferir compatibilidade/peers, executar checks e integrações, corrigir
falhas de bootstrap/migration/runtime encontradas, construir/subir a stack, conferir ingestão/dashboards, SIGTERM
e jornada em ambiente limpo com Node 24. Os vinte pontos, incluindo renumeração e revisão final, estão tratados
nas fontes. A sequência e as evidências exigidas estão no plano/README; fontes e Compose válido não significam aceite.

## Referências técnicas já consultadas

- Zod: [versão 4.1.12](https://github.com/colinhacks/zod/blob/v4.1.12/packages/zod/package.json),
  [conversão nessa versão](https://github.com/colinhacks/zod/blob/v4.1.12/packages/zod/src/v4/core/to-json-schema.ts)
  e [JSON Schema](https://zod.dev/json-schema).
- AWS: pacotes [SNS](https://www.npmjs.com/package/%40aws-sdk/client-sns) e
  [SQS](https://www.npmjs.com/package/%40aws-sdk/client-sqs),
  [atributos SNS](https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html),
  [policy SQS](https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html) e
  [entrega standard](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html).
- LocalStack: [release 4.10.0](https://github.com/localstack/localstack/releases/tag/v4.10.0),
  [hooks](https://docs.localstack.cloud/aws/customization/advanced/initialization-hooks/) e
  [URLs SQS](https://docs.localstack.cloud/aws/services/sqs/#queue-urls).

São referências dos itens implementados, sem alegação de versões mais recentes ou compatibilidade já executada.
