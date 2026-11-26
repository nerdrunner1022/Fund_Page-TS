import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencyConversion1710000000200 implements MigrationInterface {
  name = 'AddCurrencyConversion1710000000200';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donations"
      ADD COLUMN "currency" text NOT NULL DEFAULT 'LKR'
    `);
    await queryRunner.query(`
      ALTER TABLE "donations" ADD COLUMN "source_amount_minor" bigint
    `);
    await queryRunner.query(`
      UPDATE "donations"
      SET "source_amount_minor" = "amount_minor"
      WHERE "source_amount_minor" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "donations"
      ALTER COLUMN "source_amount_minor" SET DEFAULT '0',
      ALTER COLUMN "source_amount_minor" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "donations" ADD COLUMN "fx_rate" text
    `);
    await queryRunner.query(`
      UPDATE "donations" SET "fx_rate" = '1' WHERE "fx_rate" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "donations"
      ALTER COLUMN "fx_rate" SET DEFAULT '1',
      ALTER COLUMN "fx_rate" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "donations"
      ADD CONSTRAINT "CHK_donations_currency"
      CHECK ("currency" IN (
        'LKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR',
        'QAR', 'CAD', 'AUD', 'INR', 'MYR', 'SGD'
      ))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donations" DROP CONSTRAINT "CHK_donations_currency"
    `);
    await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "fx_rate"`);
    await queryRunner.query(
      `ALTER TABLE "donations" DROP COLUMN "source_amount_minor"`,
    );
    await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "currency"`);
  }
}
