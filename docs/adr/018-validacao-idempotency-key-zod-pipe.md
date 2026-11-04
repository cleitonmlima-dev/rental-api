# ADR-018 — Validação do header Idempotency-Key diretamente via ZodValidationPipe

Data: 04/11/2026  
Status: aceita; aplicada  
Spec: [SPEC-018](../specs/018-validacao-idempotency-key-zod-pipe.md).  
Base: [ADR-002](002-modelo-e-fluxos-da-v1.md), [ADR-006](006-propostas-idempotentes.md).

## Contexto

O endpoint `POST /api/v1/proposals` utilizava o helper manual `src/modules/proposal/idempotency-key.ts` para iterar
`req.rawHeaders`, validar um tuple `idempotencyHeadersSchema` e mapear erros para códigos separados
(`IDEMPOTENCY_KEY_REQUIRED` e `INVALID_IDEMPOTENCY_KEY`). Todos os demais parâmetros HTTP da aplicação (`@Body`,
`@Query`, `@Param`) já são validados diretamente pelo `ZodValidationPipe` com retorno padronizado `400 VALIDATION_ERROR`.

## Decisão

- Validar o header `Idempotency-Key` diretamente na assinatura de `ProposalController.create` utilizando
  `@Headers('idempotency-key', new ZodValidationPipe(idempotencyKeySchema)) key: string`.
- Remover o arquivo `src/modules/proposal/idempotency-key.ts`, o schema auxiliar `idempotencyHeadersSchema`, a função
  exportada `validationError` e os códigos de erro específicos `IDEMPOTENCY_KEY_REQUIRED` e `INVALID_IDEMPOTENCY_KEY`,
  unificando falhas de validação do header sob `400 VALIDATION_ERROR` (`apiErrors.validation`).

## Alternativas consideradas

- Manter `idempotencyKey(req.rawHeaders)` e os códigos específicos `IDEMPOTENCY_KEY_REQUIRED` /
  `INVALID_IDEMPOTENCY_KEY`: adiciona código manual redundante fora do `ZodValidationPipe` e fragmenta o contrato de
  validação de entrada (`400 VALIDATION_ERROR`).

## Consequências

- Todos os inputs HTTP (`@Body`, `@Query`, `@Param`, `@Headers`) passam pelo mesmo `ZodValidationPipe`.
- `ProposalController.create` deixa de depender do objeto `Request` do Express (`@Req()`).
- A superfície de `api-error.ts`, `validation.ts` e `proposal.schema.ts` fica mais simples e coesa.
