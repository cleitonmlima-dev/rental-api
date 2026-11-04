# ADR-006 — Criação transacional e idempotente de propostas

Status: aceita; complementada pela ADR-010; execução pendente  
Data: 03/11/2026  
Spec: [SPEC-006](../specs/006-propostas-idempotentes.md).

## Contexto e decisão

Uma resposta perdida não deve criar outra proposta. Adquirir a chave por PK antes de bloquear o imóvel; gravar reserva, proposta, histórico e resposta na mesma transação READ COMMITTED. Mesma chave/payload devolve o retrato original; chave com outro payload é conflito. Só sucessos são persistidos.

Usar `transaction_timeout` local do PostgreSQL 18 para o prazo total, além dos limites de instrução/lock. A correlação também é local à transação. Não criar framework de Unit of Work, worker de chaves pendentes ou retry automático. FKs validam cliente existente sem consulta duplicada antes do insert.

A [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md) mantém essas garantias com repositório transacional e parâmetros nomeados. O snapshot inclui `location` no corpo; criação nova publica SNS `NOVA` após commit e replay não publica.

## Alternativas e consequências

Redis separado do commit deixaria uma janela entre resultado e registro. Persistir apenas ID não reproduziria o corpo original depois de uma transição. A retenção sem expiração aumenta armazenamento e é uma limitação aceita da V1. Timeout é conflito temporário, não autorização para repetir com outra chave.

Referência: [transaction_timeout no PostgreSQL](https://www.postgresql.org/docs/18/runtime-config-client.html).
