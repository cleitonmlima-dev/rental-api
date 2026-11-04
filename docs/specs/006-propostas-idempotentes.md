# SPEC-006 — Propostas e idempotência

ADR: [ADR-006](../adr/006-propostas-idempotentes.md).  
Status: fontes preparadas; complementada pela SPEC-010; execução pendente  
Base: [SPEC-002](002-implementacao-rental-pipeline.md#8-fluxos-transacionais).

## Objetivo e comportamento

Entregar criação e leitura/lista/histórico de propostas. Header único e não vazio `Idempotency-Key`, até 255 caracteres, com payload dos dois UUIDs normalizados. Não aceitar campos extras. Criar proposta NOVA e reservar imóvel disponível na mesma transação, com histórico inicial pelo trigger.

Aquisição da chave aguarda conflito até os limites configurados. Se o detentor confirma, a próxima tentativa lê a resposta; se reverte, pode adquirir a chave. Mesma chave com outro payload retorna 409. Retenção apenas de sucessos, sem expiração. O snapshot inclui `location`, é serializado antes de persistir e não é reconstruído do estado atual. A [SPEC-010](010-legibilidade-orm-contratos-e-mensageria.md) mantém a transação em repositório concreto e acrescenta SNS `NOVA` após criação confirmada, sem publicação no replay.

## Aceite

Cobrir AC-05 a AC-11 e AC-16 com PostgreSQL real: duas conexões, rollback depois da reserva, mesma chave simultânea, chaves diferentes, resposta perdida e replay após mudança de estado. Histórico de proposta ausente retorna 404; paginação e filtros seguem a base. Nenhum registro de chave pode confirmar sem resposta.
