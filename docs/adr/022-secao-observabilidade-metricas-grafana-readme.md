# ADR-022 — Seção de Observabilidade e Métricas do Grafana no README.md

Data: 04/11/2026  
Status: aceita; aplicada  
Spec: [SPEC-022](../specs/022-secao-observabilidade-metricas-grafana-readme.md).  
Base: [ADR-008](008-observabilidade.md), [ADR-017](017-simplificacao-readme.md).

## Contexto

A aplicação entrega três dashboards provisionados automaticamente no Grafana (`Rental — Negócio`, `Rental — Esteira` e
`Rental — Técnico`), combinando views analíticas no PostgreSQL (com papel `rental_observer` sem acesso a PII) e
telemetria OpenTelemetry (Prometheus, Loki e Tempo). Destacar essas métricas no `README.md` evidencia a entrega de valor
de negócio, produto e engenharia logo na leitura inicial do repositório.

## Decisão

- Adicionar ao `README.md` a seção `## Observabilidade e Métricas no Grafana`, detalhando o valor entregue pelos três
  dashboards provisionados e listando todas as métricas e indicadores de negócio, esteira e saúde técnica disponíveis.
- Manter a diretriz da [ADR-017](017-simplificacao-readme.md) de não mencionar ADRs ou specs no `README.md`.

## Alternativas consideradas

- Citar apenas a URL do Grafana na tabela de serviços: oculta do avaliador/usuário a riqueza de indicadores de negócio,
  SLA de esteira e telemetria transacional já prontos para uso.

## Consequências

- O `README.md` passa a evidenciar claramente os indicadores executivos, operacionais e técnicos entregues no Grafana.
