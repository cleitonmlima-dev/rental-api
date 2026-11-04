# SPEC-018 — Validação do header Idempotency-Key com ZodValidationPipe

ADR: [ADR-018](../adr/018-validacao-idempotency-key-zod-pipe.md).  
Status: concluída  
Base: [SPEC-002](002-implementacao-rental-pipeline.md).

## Objetivo e escopo

Padronizar a validação do header `Idempotency-Key` no `ProposalController.create` usando `@Headers('idempotency-key',
new ZodValidationPipe(idempotencyKeySchema))`, eliminando o parser manual de `rawHeaders` e unificando erros de
validação de header em `400 VALIDATION_ERROR`.

## Requisitos e comportamento esperado

- `ProposalController.create` deve receber `@Headers('idempotency-key', new ZodValidationPipe(idempotencyKeySchema))
  key: string` e repassar `key` diretamente para `ProposalService.create(input, key)`.
- Quando `Idempotency-Key` estiver ausente, vazio, composto apenas por espaços ou acima de 255 caracteres, o
  `ZodValidationPipe` deve rejeitar a requisição com `400 VALIDATION_ERROR` e `details` apontando para o campo
  `idempotency-key`.
- Remover `src/modules/proposal/idempotency-key.ts`, `idempotencyHeadersSchema`, `IDEMPOTENCY_KEY_REQUIRED` e
  `INVALID_IDEMPOTENCY_KEY`.

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S18-01 | `ProposalController.create` valida `idempotency-key` via `@Headers(..., new ZodValidationPipe(idempotencyKeySchema))`. |
| S18-02 | `src/modules/proposal/idempotency-key.ts` e `idempotencyHeadersSchema` foram removidos. |
| S18-03 | `ApiErrorCode` e `apiErrors` não contêm `IDEMPOTENCY_KEY_REQUIRED` nem `INVALID_IDEMPOTENCY_KEY`. |

## Resultado e verificação

Aplicado em `src/modules/proposal/proposal.controller.ts`, `src/modules/proposal/schemas/proposal.schema.ts`,
`src/shared/http/validation.ts` e `src/shared/http/api-error.ts`, com remoção de
`src/modules/proposal/idempotency-key.ts`.
