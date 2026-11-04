import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessViews1793741000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE VIEW proposal.property_counts AS
      SELECT states.status, count(p.id) AS total
      FROM (VALUES ('DISPONIVEL'), ('EM_NEGOCIACAO'), ('ALUGADO')) AS states(status)
      LEFT JOIN property.properties p ON p.status = states.status GROUP BY states.status;

      CREATE VIEW proposal.proposal_counts AS
      SELECT states.status, count(p.id) AS total
      FROM (VALUES
        ('NOVA'), ('ANALISE_CREDITO'), ('CONTRATO_EMITIDO'), ('ASSINADO'), ('ATIVO'), ('CANCELADA'), ('REPROVADA')
      ) AS states(status)
      LEFT JOIN proposal.proposals p ON p.status = states.status::proposal.proposal_status GROUP BY states.status;

      CREATE VIEW proposal.property_registrations AS SELECT created_at FROM property.properties;

      CREATE VIEW proposal.stage_durations AS
      WITH intervals AS (
        SELECT to_status::text AS status, changed_at AS entered_at,
          lead(changed_at) OVER (PARTITION BY proposal_id ORDER BY id) AS exited_at
        FROM proposal.status_history
      )
      SELECT status, entered_at, exited_at, extract(epoch FROM exited_at - entered_at)::double precision AS seconds
      FROM intervals
      WHERE exited_at IS NOT NULL AND status IN ('NOVA', 'ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO');

      CREATE VIEW proposal.closures AS
      SELECT to_status::text AS status, changed_at FROM proposal.status_history
      WHERE to_status IN ('CANCELADA', 'REPROVADA');

      CREATE VIEW proposal.open_stages AS
      SELECT status::text AS status, status_entered_at AS entered_at FROM proposal.proposals
      WHERE status IN ('NOVA', 'ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO');

      GRANT USAGE ON SCHEMA proposal TO rental_observer;
      GRANT SELECT ON proposal.property_counts, proposal.proposal_counts, proposal.property_registrations,
        proposal.stage_durations, proposal.closures, proposal.open_stages TO rental_observer;
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      DROP VIEW proposal.open_stages, proposal.closures, proposal.stage_durations,
        proposal.property_registrations, proposal.proposal_counts, proposal.property_counts;
    `);
  }
}
