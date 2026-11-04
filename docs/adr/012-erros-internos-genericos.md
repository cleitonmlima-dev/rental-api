# ADR-012 — Erros internos genéricos

Data: 04/11/2026  
Status: aceita; implementação e verificação pendentes  
Spec: [SPEC-012](../specs/012-erros-internos-genericos.md).  
Base: [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md).

## Contexto

O contrato HTTP distingue contenção e indisponibilidade do banco e revela estados internos de reserva/replay.
O consumidor externo precisa de uma falha genérica para esses casos, preservando a correlação para diagnóstico.

## Decisão

Usar `INTERNAL_ERROR` e `Não foi possível concluir a operação.` para falhas internas e de infraestrutura.
Remover a classificação pública por SQLSTATE/rede, mantendo somente constraints que representam regras de negócio.
Sanitizar toda exceção HTTP de status 5xx antes de considerar seu corpo, mesmo quando contém `code` próprio.
Falhas inesperadas usam 500; readiness preserva 503 e sua consulta real, com o mesmo código e mensagem genéricos.
Estados internos de reserva e resultado idempotente usam o erro interno comum. O JSON preserva caminho e IDs
de correlação, sem detalhes da causa. Swagger e contratos documentados acompanham a mudança.

## Alternativas consideradas

Manter códigos distintos com mensagens vagas ainda classificaria publicamente a causa de infraestrutura.
Remover as consultas de saúde ou as verificações transacionais comprometeria a operação e a integridade.
O filtro e o catálogo existentes resolvem a necessidade sem outra camada ou dependência.

## Consequências

Clientes passam a receber 500 genérico em falhas antes classificadas como recurso ou banco indisponível.
Validação de entrada, conflitos legítimos, transações, locks, Redis e mensageria mantêm seus comportamentos.
As causas técnicas ficam restritas ao diagnóstico interno. A [SPEC-012](../specs/012-erros-internos-genericos.md)
e o [plano](../planos/002-plano-execucao.md#4-pendências-para-aceite) registrarão os checks reais e suas limitações.
