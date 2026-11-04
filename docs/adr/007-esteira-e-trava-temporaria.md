# ADR-007 — Esteira na aplicação e trava temporária

Status: aceita; evento substituído pela ADR-010; execução pendente  
Data: 03/11/2026  
Spec: [SPEC-007](../specs/007-esteira-e-trava-temporaria.md).

## Contexto e decisão

Implementar a matriz dos 12 pares uma única vez em TypeScript. A transição bloqueia imóvel e depois proposta, lê o estado atual e atualiza disponibilidade/datas na mesma transação; o trigger cuida apenas do histórico.

Redis usa SET NX/PX e token por tentativa para rejeitar concorrentes antecipadamente. Cliente indisponível/timeout segue pelo PostgreSQL; liberação é compare-and-delete atômico e não muda sucesso já confirmado. Não criar framework de lock, renovador ou cache de status.

O log `ContractActivated` apenas na ativação foi substituído pela [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md): SNS `ProposalStatusChanged` para criação e cada estado confirmado, após commit/liberação Redis. Erro de publicação é observável e preserva HTTP. Não há outbox ou reenvio posterior.

## Alternativas e consequências

Versão esperada e idempotência do PATCH ficaram fora da V1. Só o Redis não garante integridade após falha/expiração; os locks e a matriz continuam necessários. Publicação durável exigiria Outbox, explicitamente adiada.
