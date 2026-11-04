# SPEC-001 — Documentação de cada desenvolvimento

ADR: [ADR-001](../adr/001-desenvolvimento-com-adr-e-spec.md).  
Status: política vigente; documentação vinculada  
Regra normativa: [seção 15.1 — Regra de desenvolvimento](../especificacao-tecnica.md#151-regra-de-desenvolvimento--definida).

## Objetivo e escopo

Tornar rastreáveis os requisitos, decisões e verificações de cada entrega. Esta spec explicita a política já
definida na seção normativa, sem introduzir uma nova decisão. Ela abrange funcionalidades, correções,
refatorações, testes, configuração, infraestrutura e documentação.

## Requisitos e comportamento esperado

- Criar a ADR e criar ou atualizar a spec correspondente antes da implementação.
- Registrar objetivo, escopo, requisitos, comportamento esperado e critérios verificáveis na spec; contexto,
  decisão, alternativas, consequências e status na ADR.
- Manter links nos dois sentidos e sincronizar os documentos com o escopo e o resultado final da entrega.
- Numerar os pares continuamente desde 001 e manter o catálogo restrito aos registros criados.

## Critérios de aceite e resultado

Uma entrega só está concluída quando ADR e spec acompanham a mudança, possuem links locais válidos entre si e
descrevem o resultado e as verificações efetivamente realizadas. A política está registrada na ADR-001, nesta
spec e na seção normativa, referenciada pelo [AGENTS.md](../../AGENTS.md). A renumeração foi conferida por leitura
e asserções Python de arquivos, vínculos, catálogo e sequência; não depende de execução da aplicação.
