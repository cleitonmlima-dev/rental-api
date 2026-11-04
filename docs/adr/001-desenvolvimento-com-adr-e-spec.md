# ADR-001 — Exigir ADR acompanhada da spec em todo desenvolvimento

Data: 03/11/2026  
Status: aceita  
Spec: [SPEC-001 — Documentação de cada desenvolvimento](../specs/001-desenvolvimento-com-adr-e-spec.md).  
Regra normativa: [seção 15.1 — Regra de desenvolvimento](../especificacao-tecnica.md#151-regra-de-desenvolvimento--definida).

## Contexto

A especificação previa ADRs para temas arquiteturais, sem exigir um registro para cada desenvolvimento. O responsável pelo projeto determinou que todo desenvolvimento gere uma ADR acompanhada da spec correspondente, permitindo rastrear requisitos e decisões em cada entrega.

## Decisão

Exigir uma nova ADR e uma spec criada ou atualizada antes da implementação de qualquer desenvolvimento, incluindo alterações de documentação. Os documentos devem conter links entre si, acompanhar a entrega e refletir seu resultado final. A SPEC-001 registra o escopo e o aceite da política; a regra operacional continua definida na seção 15.1 e é referenciada pelo `AGENTS.md` da raiz.

## Alternativas consideradas

- Registrar ADRs somente para decisões arquiteturais relevantes: não atende à abrangência exigida pelo responsável.
- Manter apenas a spec: descreve os requisitos, mas não atende à exigência de registrar também as decisões em uma ADR.

## Consequências

Cada entrega passa a incluir documentação de requisitos e decisões, inclusive em mudanças pequenas. A manutenção dos links e a consistência entre ADR, spec e resultado entregue fazem parte do critério de conclusão.
