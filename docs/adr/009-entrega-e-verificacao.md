# ADR-009 — Entrega reproduzível e verificação real

Status: aceita; ferramental revisado pelas ADRs 010 e 011; execução pendente  
Data: 03/11/2026  
Spec: [SPEC-009](../specs/009-entrega-e-verificacao.md).

## Contexto e decisão

O responsável pediu executar toda a V1 com implementação mínima, legível e sem camadas sem uso. Preparar os incrementos em sequência, sem bloquear a escrita do código pelas limitações desta sessão. O aceite continua condicionado à execução dos checks reais; código pronto não vira etapa validada.

Usar node:test, fetch e conexões PostgreSQL independentes. Um PostgreSQL temporário isolado evita apagar o banco de desenvolvimento. O perfil original `tools` foi substituído por `test` na [ADR-010](010-legibilidade-orm-contratos-e-mensageria.md); comandos npm agora executam no host, sem tooling/cache Docker, e a [ADR-011](011-testes-apenas-integracao.md) manteve apenas as suítes de integração. Concorrência usa locks/barreiras de pg_locks, sem sleeps para provocar disputa. Redis usa chaves únicas e expiração explícita nos testes.

CI exige lockfile real, instalação limpa, tipos/lint/build e integração. Não fabricar um lockfile ou fazer CI ignorar sua ausência. README descreve a jornada e os checks ainda não executados. Dados sintéticos são opcionais e inseridos pelos endpoints.

## Alternativas e consequências

SQLite/mocks não demonstram exclusividade transacional. Introduzir um framework E2E, repositórios ou classes ORM não utilizadas não é necessário. Remover apenas artefatos sem função na entrega; manter PDF, requisitos e ADRs históricos.

Publicação no GitHub e envio ao recrutador continuam ações posteriores do responsável. A ADR-010 acrescenta SNS/SQS com LocalStack local; auth, outbox, consumidor/worker, integração financeira real e promessa de capacidade continuam fora do escopo.
