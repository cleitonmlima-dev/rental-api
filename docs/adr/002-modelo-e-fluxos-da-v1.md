# ADR-002 — Modelo e fluxos da V1 com regras na aplicação

Data: 03/11/2026  
Status: aceita; eventos, tipos e persistência revisados pela ADR-010  
Spec: [SPEC-002 — Implementação da V1](../specs/002-implementacao-rental-pipeline.md).  
Plano: [Plano de execução](../planos/002-plano-execucao.md).  
Visão geral: [Especificação funcional e técnica](../especificacao-tecnica.md).  
Termos: [Glossário](../../GLOSSARY.md).

Pontos técnicos substituídos pela [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md): proposta/histórico usam enum, persistência usa entidades/repositórios, contratos usam Zod e o evento é SNS por estado. As regras de negócio e garantias transacionais desta ADR permanecem.

## Contexto

A revisão da proposta inicial definiu os cadastros, relacionamentos e contratos HTTP. Também mudou a distribuição das regras: manter a máquina de estados, reserva e sincronização do imóvel em triggers tornaria mudanças do processo dependentes de migrations e dividiria as regras entre aplicação e banco. O responsável decidiu concentrar essas regras no NestJS, conservando as garantias estruturais e transacionais do PostgreSQL.

O projeto continua sendo um monólito modular NestJS/TypeScript com TypeORM, três módulos de negócio e um PostgreSQL com schemas `customer`, `property` e `proposal`. Esta ADR registra a consolidação aprovada durante a entrevista e atende à [regra de ADR e spec por entrega](../especificacao-tecnica.md#151-regra-de-desenvolvimento--definida).

## Decisão

### Cadastros e relacionamentos

- Cliente possui ID, nome, CPF, e-mail e data de criação. CPF e e-mail são únicos, independentemente. O CPF é normalizado para dígitos, sem validação de comprimento, dígitos verificadores ou situação cadastral nesta V1.
- Proprietário e interessado usam o mesmo cadastro de cliente; os papéis são determinados pelos relacionamentos, sem `tipoCliente`.
- Imóvel possui um proprietário obrigatório, endereço descritivo, tipo `APARTAMENTO` ou `CASA`, descrição opcional, disponibilidade e datas. Um cliente pode possuir vários imóveis.
- A referência cadastral única foi removida. Endereços repetidos são permitidos; identificar duas representações da mesma unidade física fica fora do escopo. Uma evolução poderá estruturar o endereço e definir uma identidade cadastral adequada.
- Proposta vincula um cliente interessado a um imóvel. Não haverá entidade de contrato nem dados financeiros, vigência ou anexos nesta V1.
- Um cliente pode propor para vários imóveis. Após cancelamento ou reprovação, outra tentativa cria uma nova proposta, preservando a anterior. Não será acrescentada uma regra que impeça proposta para imóvel próprio.

### Regras, concorrência e histórico

- O NestJS valida a máquina de estados e coordena criação, reserva, liberação e ativação em transações PostgreSQL `READ COMMITTED`.
- O PostgreSQL conserva FKs, `NOT NULL`, checks dos valores admitidos, unicidade de CPF/e-mail e índice único parcial de proposta ocupante por imóvel. `ATIVO` participa desse índice; somente `CANCELADA` e `REPROVADA` ficam fora.
- Os caminhos de escrita adquirem locks na ordem imóvel → proposta. A criação adquire antes a unicidade da chave de idempotência. Nenhuma chamada externa ocorre com os locks de negócio abertos.
- Um único trigger registra criação e mudanças de estado no histórico, na mesma transação. Ele não valida transições nem modifica imóveis. A aplicação não duplica a inserção do histórico.
- Não haverá tabela `allowed_transitions`, `expectedVersion` ou coluna `version`. O histórico terá ID próprio para ordenação.
- A transição é avaliada contra o estado atual obtido sob lock. Repetição, salto ou alteração de estado terminal retorna conflito.

### Idempotência e Redis

- `POST /api/v1/proposals` exige `Idempotency-Key`. A chave, o payload normalizado e a resposta HTTP de sucesso são persistidos junto com a proposta e a reserva na mesma transação.
- Mesma chave e mesmo payload reproduzem o `201` e o corpo originais. A [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md) substitui o header `Location` pelo campo `location` no corpo salvo. Mesma chave com outro payload retorna conflito. Uma chave diferente inicia nova tentativa, sujeita à disponibilidade do imóvel.
- Somente criações confirmadas são retidas, sem expiração automática na V1. A criação idempotente não é estendida aos demais endpoints.
- Redis serve apenas como trava temporária por proposta durante a transição. Uma trava ocupada produz conflito antecipado; indisponibilidade do Redis permite seguir pelo PostgreSQL.
- A trava tem TTL, token exclusivo e liberação condicionada ao token. Expiração ou falha do Redis não substitui nem compromete as verificações transacionais do banco.

### Interface e ativação

- JSON usa `camelCase`; tabelas e colunas usam `snake_case`. Os payloads de negócio são os definidos na SPEC-002. O consumidor informa IDs das referências (`ownerId`, `customerId`, `propertyId`), mas não o ID do novo recurso, seu estado inicial ou suas datas.
- O único endpoint de alteração é `PATCH /api/v1/proposals/{id}/status`, com corpo `{ "status": "..." }`. As etapas externas são simuladas; não executam consulta de crédito, emissão documental ou assinatura.
- As listagens têm paginação e os filtros acordados. O histórico inclui a criação e é consultável do registro mais antigo para o mais recente.
- Decisão original de evento: log `ContractActivated` após ativação. Substituída pela ADR-010: SNS `ProposalStatusChanged` para criação e cada transição confirmada, após commit/liberação Redis, sem entrega durável da aplicação.
- Permanecem fora da V1 autenticação, edição/exclusão cadastral, expiração de reservas, encerramento de locação ativa, outbox, workers e integração financeira real. A ADR-010 inclui SNS/SQS na V1 e LocalStack local; observabilidade e entrega permanecem.

## Alternativas consideradas

| Alternativa | Motivo da escolha atual |
| --- | --- |
| Máquina de estados e sincronização em triggers | Rejeitada para manter o processo no código da aplicação e evitar migrations para cada alteração da sequência. |
| Histórico produzido pela aplicação | O trigger reduz código repetido e faz o registro acompanhar a escrita e seu rollback. |
| `expectedVersion` obrigatório | Dispensado para limitar a V1. Validar a transição contra o estado atual é o comportamento desejado. |
| Apenas exclusividade por imóvel, sem replay | Não atende à decisão de devolver a resposta original após repetição da criação. |
| Idempotência armazenada somente no Redis | Separaria seu registro do commit PostgreSQL e exigiria outra política de falhas e retenção. |
| Redis como garantia final de exclusividade | Expiração ou falha da trava não pode autorizar uma proposta conflitante. A garantia final permanece transacional. |
| Endereço único ou cadastro postal estruturado | Não será usado para deduplicar unidades físicas nesta V1, por limite explícito de escopo. |

## Consequências

- As regras de processo ficam testáveis em TypeScript; migrations cuidam da estrutura, dos índices e do histórico.
- Escritas diretas por SQL podem contornar a sequência e a sincronização. Não são um caminho de negócio suportado; o trigger de histórico não corrige essas escritas.
- Sem controle de versão do consumidor, dois comandos podem executar em sequência se cada um for válido no estado que encontrar. Isso é aceito nesta V1.
- A idempotência exige armazenamento adicional e retenção sem limpeza automática. Seu replay retorna o retrato original da criação, não o estado atual da proposta.
- A proteção de ocupação é por ID de imóvel; não identifica cadastros duplicados da mesma unidade física.
- A publicação pode se perder entre commit e SNS, conforme a ADR-010. Outbox permanece uma evolução documentada.

## Relação com o desenho anterior

Esta decisão substitui os temas da proposta inicial sobre máquina de estados e reserva/sincronização em triggers; redefine a auditoria por trigger para histórico sem versão; descarta a versão esperada; e inclui Redis como trava temporária, antes excluído da V1. A exclusão original de mensageria foi posteriormente substituída pela ADR-010. Esses temas não geraram arquivos de ADR próprios.

A ADR-001 e sua regra de uma nova ADR acompanhada de spec para cada entrega permanecem vigentes. Os incrementos futuros deverão ter seus próprios registros antes da implementação.

## Verificação desta entrega

A entrega atual é documental: ADR, spec, plano, glossário e visão geral devem ter links locais válidos, exemplos JSON válidos e decisões coerentes entre si. Nenhuma aplicação, migration ou infraestrutura é criada por esta ADR. Os critérios de teste da implementação estão na SPEC-002 e no plano.
