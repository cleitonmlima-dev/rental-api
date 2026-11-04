import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793740000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE SCHEMA IF NOT EXISTS customer;
      CREATE SCHEMA IF NOT EXISTS property;
      CREATE SCHEMA IF NOT EXISTS proposal;

      CREATE TYPE proposal.proposal_status AS ENUM (
        'NOVA', 'ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO', 'ATIVO', 'CANCELADA', 'REPROVADA'
      );

      CREATE TABLE customer.customers (
        id uuid CONSTRAINT pk_customers PRIMARY KEY,
        name varchar(150) NOT NULL CONSTRAINT ck_customer_name CHECK (btrim(name) <> ''),
        cpf text NOT NULL CONSTRAINT ck_customer_cpf CHECK (cpf ~ '^[0-9]+$'),
        email varchar(254) NOT NULL CONSTRAINT ck_customer_email CHECK (btrim(email) <> ''),
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT uq_customers_cpf UNIQUE (cpf)
      );
      CREATE UNIQUE INDEX uq_customers_email_normalized ON customer.customers (lower(btrim(email)));
      CREATE INDEX ix_customers_created ON customer.customers (created_at DESC, id DESC);

      CREATE TABLE property.properties (
        id uuid CONSTRAINT pk_properties PRIMARY KEY,
        owner_id uuid NOT NULL CONSTRAINT fk_properties_owner REFERENCES customer.customers(id)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        address varchar(500) NOT NULL CONSTRAINT ck_property_address CHECK (btrim(address) <> ''),
        type text NOT NULL CONSTRAINT ck_property_type CHECK (type IN ('APARTAMENTO', 'CASA')),
        description varchar(1000),
        status text NOT NULL DEFAULT 'DISPONIVEL' CONSTRAINT ck_property_status
          CHECK (status IN ('DISPONIVEL', 'EM_NEGOCIACAO', 'ALUGADO')),
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
      CREATE INDEX ix_properties_created ON property.properties (created_at DESC, id DESC);
      CREATE INDEX ix_properties_owner ON property.properties (owner_id);

      CREATE TABLE proposal.proposals (
        id uuid CONSTRAINT pk_proposals PRIMARY KEY,
        customer_id uuid NOT NULL CONSTRAINT fk_proposals_customer REFERENCES customer.customers(id)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        property_id uuid NOT NULL CONSTRAINT fk_proposals_property REFERENCES property.properties(id)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        status proposal.proposal_status NOT NULL DEFAULT 'NOVA',
        status_entered_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
      CREATE UNIQUE INDEX uq_proposals_property_occupied ON proposal.proposals (property_id)
        WHERE status NOT IN ('CANCELADA', 'REPROVADA');
      CREATE INDEX ix_proposals_created ON proposal.proposals (created_at DESC, id DESC);
      CREATE INDEX ix_proposals_customer_created ON proposal.proposals (customer_id, created_at DESC, id DESC);
      CREATE INDEX ix_proposals_property_created ON proposal.proposals (property_id, created_at DESC, id DESC);

      CREATE TABLE proposal.status_history (
        id bigint GENERATED ALWAYS AS IDENTITY CONSTRAINT pk_status_history PRIMARY KEY,
        proposal_id uuid NOT NULL CONSTRAINT fk_status_history_proposal REFERENCES proposal.proposals(id)
          ON DELETE RESTRICT ON UPDATE RESTRICT,
        from_status proposal.proposal_status,
        to_status proposal.proposal_status NOT NULL,
        changed_at timestamptz NOT NULL,
        request_id uuid,
        trace_id varchar(32)
      );
      CREATE INDEX ix_history_proposal ON proposal.status_history (proposal_id, id);

      CREATE TABLE proposal.idempotency_requests (
        key varchar(255) CONSTRAINT pk_idempotency_requests PRIMARY KEY,
        request_payload jsonb NOT NULL,
        response_body jsonb,
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT ck_idempotency_key CHECK (btrim(key) <> '')
      );

      CREATE FUNCTION proposal.record_status_history() RETURNS trigger
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
      DECLARE previous_status proposal.proposal_status;
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
          previous_status := OLD.status;
        END IF;
        INSERT INTO proposal.status_history (proposal_id, from_status, to_status, changed_at, request_id, trace_id)
        VALUES (NEW.id, previous_status, NEW.status, NEW.status_entered_at,
          NULLIF(current_setting('app.request_id', true), '')::uuid,
          NULLIF(current_setting('app.trace_id', true), ''));
        RETURN NEW;
      END;
      $$;
      REVOKE ALL ON FUNCTION proposal.record_status_history() FROM PUBLIC;
      CREATE TRIGGER trg_proposal_history AFTER INSERT OR UPDATE ON proposal.proposals
        FOR EACH ROW EXECUTE FUNCTION proposal.record_status_history();

      GRANT USAGE ON SCHEMA customer, property, proposal TO rental_app;
      GRANT SELECT, INSERT ON customer.customers, property.properties, proposal.proposals, proposal.idempotency_requests
        TO rental_app;
      GRANT SELECT ON proposal.status_history TO rental_app;
      GRANT UPDATE (status, updated_at) ON property.properties TO rental_app;
      GRANT UPDATE (status, status_entered_at, updated_at) ON proposal.proposals TO rental_app;
      GRANT UPDATE (response_body) ON proposal.idempotency_requests TO rental_app;
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      DROP TABLE proposal.idempotency_requests;
      DROP TABLE proposal.status_history;
      DROP TABLE proposal.proposals;
      DROP FUNCTION proposal.record_status_history();
      DROP TYPE proposal.proposal_status;
      DROP TABLE property.properties;
      DROP TABLE customer.customers;
    `);
  }
}
