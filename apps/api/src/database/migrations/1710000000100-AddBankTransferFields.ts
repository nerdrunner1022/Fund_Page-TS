import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankTransferFields1710000000100 implements MigrationInterface {
  name = 'AddBankTransferFields1710000000100';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "donations" ADD COLUMN "bank_ref" text`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_donations_bank_ref"
      ON "donations" ("bank_ref") WHERE "bank_ref" IS NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE "donations" ADD COLUMN "slip_url" text`);
    await queryRunner.query(`ALTER TABLE "donations" ADD COLUMN "donated_on" date`);
    await queryRunner.query(`ALTER TABLE "donations" ADD COLUMN "verified_by" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_donations_bank_ref"`);
    await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "verified_by"`);
    await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "donated_on"`);
    await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "slip_url"`);
    await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "bank_ref"`);
  }
}
