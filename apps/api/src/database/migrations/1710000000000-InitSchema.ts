import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE campaigns (
        id uuid PRIMARY KEY,
        slug text NOT NULL UNIQUE,
        translations jsonb NOT NULL,
        goal_minor bigint NOT NULL CHECK (goal_minor > 0),
        raised_minor bigint NOT NULL DEFAULT 0 CHECK (raised_minor >= 0),
        perch_count integer NOT NULL DEFAULT 40 CHECK (perch_count > 0),
        deadline timestamptz NOT NULL,
        whatsapp_number text NOT NULL,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE donations (
        id uuid PRIMARY KEY,
        campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        reference_code text NOT NULL UNIQUE,
        donor_name text CHECK (char_length(donor_name) <= 120),
        amount_minor bigint NOT NULL CHECK (amount_minor BETWEEN 100 AND 1000000000),
        message text CHECK (char_length(message) <= 500),
        status text NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'confirmed', 'declined')),
        created_at timestamptz NOT NULL DEFAULT now(),
        confirmed_at timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_donations_campaign_status_created"
        ON donations (campaign_id, status, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_donations_confirmed_created"
        ON donations (campaign_id, created_at DESC) WHERE status = 'confirmed'
    `);

    await queryRunner.query(`
      CREATE TABLE admin_users (
        id uuid PRIMARY KEY,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS admin_users`);
    await queryRunner.query(`DROP TABLE IF EXISTS donations`);
    await queryRunner.query(`DROP TABLE IF EXISTS campaigns`);
  }
}
