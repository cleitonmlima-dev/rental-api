# SPEC-021 — Fluxograma do fluxo do projeto no README.md

ADR: [ADR-021](../adr/021-fluxograma-fluxo-projeto-readme.md).  
Status: concluída  
Base: [SPEC-009](009-entrega-e-verificacao.md) e [SPEC-017](017-simplificacao-readme.md).

## Objetivo e escopo

Adicionar ao `README.md` um fluxograma em formato Mermaid (`flowchart TD`) que ilustre o fluxo completo do projeto desde
os cadastros iniciais até o desfecho da proposta, atualização do imóvel, auditoria de histórico e publicação SNS/SQS.

## Requisitos e comportamento esperado

- O `README.md` deve conter uma seção `## Fluxo do projeto` logo após `## O que é o serviço`.
- O diagrama Mermaid deve representar com precisão os contratos e invariantes da V1:
  - Cadastro de cliente e cadastro de imóvel inicialmente `DISPONIVEL`;
  - Criação de proposta com `Idempotency-Key`, replay `201` para mesma chave/payload, reserva atômica para
    `EM_NEGOCIACAO` e proposta inicial em `NOVA`;
  - Sequência de estados `NOVA → ANALISE_CREDITO → CONTRATO_EMITIDO → ASSINADO → ATIVO` e saídas antecipadas para
    `CANCELADA` ou `REPROVADA` antes de `ATIVO`;
  - Imóvel atualizado para `ALUGADO` ao atingir `ATIVO` e liberado para `DISPONIVEL` quando a proposta é `CANCELADA` ou
    `REPROVADA`;
  - Registro de histórico por trigger na mesma transação (`GET /api/v1/proposals/:id/history`) e publicação pós-commit
    de `ProposalStatusChanged` no tópico SNS `rental-proposal-status` para as 7 filas SQS.
- Os rótulos dos nós Mermaid devem estar entre aspas duplas e sem tags HTML para garantir renderização compatível no
  GitHub.
- O `README.md` deve continuar sem menções a ADRs ou specs ([SPEC-017](017-simplificacao-readme.md)).

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S21-01 | `README.md` contém o bloco `mermaid` com `flowchart TD` cobrindo cadastros, esteira, imóvel, histórico e SNS/SQS. |
| S21-02 | Sintaxe Mermaid usa rótulos entre aspas sem tags HTML e respeita todas as transições válidas da V1. |
| S21-03 | `README.md` permanece sem referências a `ADR` ou `SPEC`, e o catálogo documental referencia `ADR-021`/`SPEC-021`. |

## Resultado e verificação

Fluxograma Mermaid inserido no `README.md` e referências sincronizadas na especificação técnica e no plano de execução.
