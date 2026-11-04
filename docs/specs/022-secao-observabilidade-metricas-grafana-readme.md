# SPEC-022 — Seção de Observabilidade e Métricas do Grafana no README.md

ADR: [ADR-022](../adr/022-secao-observabilidade-metricas-grafana-readme.md).  
Status: concluída  
Base: [SPEC-008](008-observabilidade.md), [SPEC-017](017-simplificacao-readme.md).

## Objetivo e escopo

Incluir no `README.md` uma seção dedicada às métricas e dashboards disponíveis no Grafana (`http://localhost:3001`),
destacando o valor de negócio, operacional e técnico entregue pela observabilidade do projeto.

## Requisitos e comportamento esperado

- Apresentar os 3 dashboards provisionados automaticamente (`Rental — Negócio`, `Rental — Esteira` e `Rental — Técnico`).
- Listar as views analíticas do PostgreSQL e os instrumentos OpenTelemetry/Prometheus, explicando o que cada métrica
  mede e qual decisão/diagnóstico ela viabiliza.
- Destacar a proteção de dados pessoais (papel `rental_observer` restrito às views) e a correlação entre Logs (Loki) e
  Traces (Tempo) via `traceId`/`requestId`.
- Não mencionar ADRs ou specs no `README.md`.

## Critérios de aceite

| ID | Evidência necessária |
| --- | --- |
| S22-01 | `README.md` possui seção dedicada listando os 3 dashboards e todas as métricas de negócio, esteira e técnicas. |
| S22-02 | `README.md` permanece sem referências a ADRs. |

## Resultado e verificação

Seção adicionada ao `README.md` e documentos sincronizados.
