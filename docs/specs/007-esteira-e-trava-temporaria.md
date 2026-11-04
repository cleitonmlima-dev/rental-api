# SPEC-007 — Esteira, Redis e ativação

ADR: [ADR-007](../adr/007-esteira-e-trava-temporaria.md).  
Status: fontes preparadas; evento revisado pela SPEC-010; execução pendente  
Base: [SPEC-002](002-implementacao-rental-pipeline.md#6-estados-e-invariantes).

## Objetivo e comportamento

Entregar PATCH de status com apenas o destino, controle transacional imóvel → proposta, histórico e sincronização de disponibilidade. O antigo log de ativação foi substituído pela [SPEC-010](010-legibilidade-orm-contratos-e-mensageria.md): SNS por estado após commit/liberação Redis, inclusive criação nova. Mesma etapa/salto/terminal retorna 409. Estado desconhecido retorna 400.

Trava por UUID canônico da proposta, token exclusivo, TTL e comandos Redis com timeout. Ocupado retorna PROPOSAL_BUSY; indisponibilidade segue pelo banco. SQL direto não passa pela máquina de estados. Não acrescentar autorização ou regra de imóvel próprio.

## Aceite

Testar os 49 pares, cancelamento/reprovação em todas as etapas, terminalidade e concorrência real. Testar Redis ocupado, fora, TTL expirado e liberação por token antigo. Provar publicação SNS após commit/liberação Redis, roteamento SQS por estado, ausência em rollback/repetição/replay e sucesso mesmo com falha do publicador.
