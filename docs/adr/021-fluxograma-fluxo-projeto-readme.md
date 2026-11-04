# ADR-021 — Inclusão de fluxograma Mermaid do fluxo do projeto no README.md

Data: 04/11/2026  
Status: aceita; aplicada  
Spec: [SPEC-021](../specs/021-fluxograma-fluxo-projeto-readme.md).  
Base: [ADR-009](009-entrega-e-verificacao.md) e [ADR-017](017-simplificacao-readme.md).

## Contexto

O `README.md` descreve em texto o ciclo de vida das propostas de locação, mas a ausência de uma representação visual
exige leitura sequencial de múltiplos tópicos para compreender a relação entre cadastros, reserva atômica, idempotência,
transições da esteira, reflexo no estado do imóvel, histórico por trigger e publicação de eventos SNS/SQS.

## Decisão

- Inserir no `README.md` uma seção `## Fluxo do projeto` com um fluxograma em Mermaid (`flowchart TD`) representando de
  ponta a ponta:
  1. Cadastros de cliente (`POST /api/v1/customers`) e imóvel (`POST /api/v1/properties`, nascendo `DISPONIVEL`);
  2. Criação idempotente de proposta (`POST /api/v1/proposals` com `Idempotency-Key`), replay `201`, reserva atômica do
     imóvel (`EM_NEGOCIACAO`) e estado inicial `NOVA`;
  3. Esteira de transições (`PATCH /api/v1/proposals/:id/status`) ao longo de `NOVA`, `ANALISE_CREDITO`,
     `CONTRATO_EMITIDO`, `ASSINADO` e `ATIVO`, além dos encerramentos `CANCELADA` e `REPROVADA` antes de `ATIVO`;
  4. Reflexo transacional no imóvel (`ALUGADO` ao ativar; retorno para `DISPONIVEL` ao cancelar ou reprovar);
  5. Gravação de histórico via trigger na mesma transação (`GET /api/v1/proposals/:id/history`) e publicação pós-commit
     no tópico SNS `rental-proposal-status` com roteamento para as 7 filas SQS por status.
- Preservar a diretriz da [ADR-017](017-simplificacao-readme.md) de não mencionar ADRs ou specs no `README.md`.

## Alternativas consideradas

- Inserir imagem estática (PNG/SVG): dificulta manutenção e revisão em diffs de texto no repositório.
- Manter apenas a descrição textual no `README.md`: menos imediato para visualizar desvios da esteira e efeitos no
  imóvel e na mensageria.

## Consequências

- O `README.md` passa a oferecer visualização imediata e renderizável no GitHub de todo o fluxo funcional e técnico do
  serviço, mantendo o texto enxuto e alinhado às regras da V1.
