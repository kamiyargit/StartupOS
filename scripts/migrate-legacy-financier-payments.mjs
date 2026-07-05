/**
 * One-time migration for financier sub-payments.
 *
 * Safe order (handles all cases automatically):
 *   node scripts/migrate-legacy-financier-payments.mjs
 *   npx prisma db push
 *   npx prisma generate
 *
 * If isPaid=true rows exist, this script creates the payment table (when missing),
 * copies legacy paid shares into payment rows, then drops isPaid.
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function tableExists(tableName) {
  const rows = await prisma.$queryRaw`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${tableName}
    LIMIT 1
  `;
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const rows = await prisma.$queryRaw`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    LIMIT 1
  `;
  return Array.isArray(rows) && rows.length > 0;
}

async function ensurePaymentTable() {
  const exists = await tableExists("ExpenseFinancierSharePayment");
  if (exists) return;

  console.log("Creating ExpenseFinancierSharePayment table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE "ExpenseFinancierSharePayment" (
      "id" TEXT NOT NULL,
      "financierShareId" TEXT NOT NULL,
      "amount" DECIMAL(15,0) NOT NULL,
      "paymentDate" DATE NOT NULL,
      "attachmentId" TEXT,
      "createdByUserId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ExpenseFinancierSharePayment_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseFinancierSharePayment_attachmentId_key"
    ON "ExpenseFinancierSharePayment"("attachmentId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ExpenseFinancierSharePayment_financierShareId_idx"
    ON "ExpenseFinancierSharePayment"("financierShareId")
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ExpenseFinancierSharePayment"
    ADD CONSTRAINT "ExpenseFinancierSharePayment_financierShareId_fkey"
    FOREIGN KEY ("financierShareId") REFERENCES "ExpenseFinancierShare"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ExpenseFinancierSharePayment"
    ADD CONSTRAINT "ExpenseFinancierSharePayment_attachmentId_fkey"
    FOREIGN KEY ("attachmentId") REFERENCES "ExpenseAttachment"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ExpenseFinancierSharePayment"
    ADD CONSTRAINT "ExpenseFinancierSharePayment_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
  `);
}

async function migratePaidShares() {
  const hasIsPaid = await columnExists("ExpenseFinancierShare", "isPaid");
  if (!hasIsPaid) {
    console.log("isPaid column not found — no legacy rows to migrate.");
    return 0;
  }

  const paidShares = await prisma.$queryRaw`
    SELECT s.id, s.amount, s."updatedAt", e."addedByUserId"
    FROM "ExpenseFinancierShare" s
    INNER JOIN "Expense" e ON e.id = s."expenseId"
    WHERE s."isPaid" = true
  `;

  let migrated = 0;
  for (const share of paidShares) {
    const existing = await prisma.$queryRaw`
      SELECT 1
      FROM "ExpenseFinancierSharePayment"
      WHERE "financierShareId" = ${share.id}
      LIMIT 1
    `;
    if (Array.isArray(existing) && existing.length > 0) continue;

    const paymentDate = share.updatedAt ?? new Date();
    await prisma.$executeRaw`
      INSERT INTO "ExpenseFinancierSharePayment" (
        "id",
        "financierShareId",
        "amount",
        "paymentDate",
        "createdByUserId",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${share.id},
        ${share.amount},
        ${paymentDate}::date,
        ${share.addedByUserId},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;
    migrated += 1;
  }

  if (hasIsPaid) {
    console.log("Dropping legacy isPaid column...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ExpenseFinancierShare" DROP COLUMN IF EXISTS "isPaid"
    `);
  }

  return migrated;
}

async function main() {
  const paymentTableExists = await tableExists("ExpenseFinancierSharePayment");
  const hasIsPaid = await columnExists("ExpenseFinancierShare", "isPaid");

  if (!paymentTableExists && !hasIsPaid) {
    console.log("Schema already up to date. Run: npx prisma db push");
    return;
  }

  await ensurePaymentTable();
  const migrated = await migratePaidShares();

  console.log(`Migrated ${migrated} legacy paid financier share(s).`);
  console.log("Next: npx prisma db push && npx prisma generate");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
