# ADR-010 — Legibilidade, ORM, contratos e mensageria

Data: 03/11/2026  
Status: aceita; vinte pontos tratados e revisão Ponytail concluída nas fontes; aceite de execução pendente  
Spec: [SPEC-010](../specs/010-legibilidade-orm-contratos-e-mensageria.md).  
Base: [SPEC-002](../specs/002-implementacao-rental-pipeline.md).  
Aceite: [plano de execução](../planos/002-plano-execucao.md#4-pendências-para-aceite).

## Contexto

A V1 precisa manter os contratos e as garantias transacionais enquanto sua persistência, validação e configuração
ficam mais fáceis de ler e alterar. O desenho inicial usava SQL nos serviços, DTOs com decorators, evento de
ativação por log e serviços Docker para comandos npm. A revisão definiu ORM concreto, contratos Zod e publicação
SNS por estado. Esta decisão consolida persistência, contratos, mensageria e operação da V1.

## Decisão

- Manter CPF em `text`, normalizado para dígitos e não vazio, sem checksum, comprimento cadastral ou teto.
  `varchar(14)` seria possível, mas acrescentaria um limite que não foi solicitado.
- Usar `proposal.proposal_status` nas propostas e no histórico. Consolidar o tipo na migration inicial ainda
  não aplicada; manter índices, FKs e o único trigger de histórico. O controle fica em `public.typeorm_migrations`,
  separado dos três schemas de negócio. Apenas o migrator recebe DDL; `synchronize: false` permanece.
- Mapear as cinco tabelas em entidades e usar três repositórios TypeORM concretos. Serviços coordenam regras,
  Redis e publicação; não acessam o banco diretamente. O repositório transacional usa seu próprio `EntityManager`,
  com parâmetros nomeados no SQL necessário de contexto/relógio e nas consultas de integração.
- Preservar `READ COMMITTED`, claim da chave antes da reserva, locks imóvel → proposta e commit conjunto de
  reserva, proposta, histórico e resposta idempotente. Redis continua sendo lease com TTL/token e fail open.
- Usar schemas Zod estritos como fonte de validação, normalização e OpenAPI; DTOs são tipos inferidos.
  Separar `schemas/`, `dtos/` e `interfaces/`; compartilhar primitivos, paginação e catálogo de erros.
  Reutilizar enums de estados, tipos de imóvel, evento e códigos de erro. Manter `unknown` nas fronteiras que
  realmente recebem valores arbitrários e literais SQL independentes nas migrations versionadas.
- Incluir `location` no corpo dos três POSTs. A proposta salva o corpo `201` completo antes do commit e o
  reproduz no replay; GETs, listas e PATCH não recebem esse campo.
- Publicar `ProposalStatusChanged` para `NOVA` e cada PATCH confirmado pelo SDK SNS oficial 3.1161.0.
  Aguardar SNS após commit, medição transacional e liberação Redis. Replay, rejeição e rollback não publicam.
  Erro de envio gera log/métrica e preserva o HTTP confirmado. LocalStack 4.10.0 provisiona tópico e sete filas
  SQS standard, com filtros por atributo `status`, entrega raw e policies restritas ao tópico.
- Aceitar a janela de perda entre commit e publicação, sem outbox, reenvio posterior, worker ou consumidor.
  O ID `ProposalStatusChanged:<proposalId>:<status>` permite deduplicação enquanto o grafo não revisita estados;
  consumidores precisam tolerar duplicatas e reordenação do transporte standard.
- Aplicar limite de 120 colunas pelo ESLint e disponibilizar `lint:fix`, sem nova dependência de formatação.
  Priorizar testes de comportamento; saúde e persistência usam integração real, evitando espelhos de configuração.
- Declarar o Compose sem anchors, tooling npm ou cache: dez serviços padrão, incluindo migration pontual, e
  PostgreSQL temporário no perfil `test`. API depende somente do sucesso da migration; credenciais são segregadas.
  README/CI usam Node/npm nativos e Docker continua construindo a imagem por lockfile.
- Consolidar os documentos, renumerar os registros continuamente desde 001 e concluir uma revisão Ponytail.
  A spec distingue esses resultados das validações ainda pendentes.
- Na revisão final, compartilhar as respostas de erro Swagger entre os três controllers, remover o import
  redundante de Redis e corrigir referências à publicação simulada e à limpeza das fixtures, sem mudar o domínio.

## Alternativas consideradas

SQL explícito nos serviços reduzia mapeamentos iniciais, mas não havia impedimento para ORM nos cadastros.
Entidades e repositórios concretos atendem à revisão sem interfaces genéricas ou Unit of Work adicional.
Classes de DTO com validação separada do OpenAPI duplicavam fontes; Zod fornece tipos e documentação nativos.
O header `Location` seria uma convenção HTTP válida; o campo no corpo é a escolha de contrato deste projeto.

Somente log de ativação não atende à publicação por estado. Outbox e worker ofereceriam recuperação durável,
mas ampliariam o escopo aceito. SNS direto após commit foi escolhido com perda possível explicitamente registrada.
Serviços Docker para npm foram removidos para reduzir configuração e comandos; desenvolvimento requer Node no host.

## Consequências e estado da entrega

Persistência e contratos têm fontes concretas compartilhadas; migrations continuam snapshots independentes.
SNS acrescenta configuração e latência após commit, sem integrar startup/readiness. Sua falha não reverte negócio.
As [ADRs 003 a 009](../especificacao-tecnica.md#152-catálogo-de-adrs) preservam o histórico e identificam os pontos
substituídos; as demais decisões transacionais, de privacidade e observabilidade permanecem.

A revisão final Ponytail percorreu contratos HTTP, persistência/transações, Redis, SNS, testes e infraestrutura.
Removeu a repetição dos erros Swagger, completou essa documentação em imóveis, retirou o import Redis redundante
e corrigiu textos obsoletos do painel SNS/fixtures. Não foram acrescentadas camadas ou regras de negócio.

Em 04/11, Node 26.13.0/npm 11.20.0 foram encontrados no NVM, fora do PATH; Node 24 não foi encontrado.
`npm install --package-lock-only` falhou por DNS (`EAI_AGAIN` no registry npm), sem gerar lockfile ou instalar
dependências. Docker continua sem acesso ao daemon. Oito casos de configuração passaram com o Node 26 nativo,
em cópia temporária do teste que ajusta apenas o caminho de import; os MJS passaram em `node --check`.
JSON/YAML, shell, imports/exports, contratos e links foram conferidos. A configuração Compose já estava validada
e não foi alterada nesta revisão. Esses resultados não substituem `npm run check` com Node 24 nem integração.

Os vinte pontos estão tratados nas fontes. `lint:fix`, lint, tipos, build, suítes npm, SQL, integração e containers
aguardam as evidências do plano. O lockfile real ainda não existe; o aceite de execução permanece pendente.
