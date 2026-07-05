import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import jalaliday from "jalaliday";

dayjs.extend(jalaliday);

const prisma = new PrismaClient();

function defaultMinJalaliYear(): number {
  return dayjs().calendar("jalali").year() - 1;
}

function wantsFreshSeedData(): boolean {
  return (
    process.argv.includes("--fresh-seed-data") ||
    process.env.FRESH_SEED_DATA === "1" ||
    process.env.FRESH_SEED_DATA === "true"
  );
}

async function main() {
  const freshSeed = wantsFreshSeedData();
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const email = process.env.ADMIN_EMAIL ?? "admin@cuty.center";
  const password = process.env.ADMIN_PASSWORD ?? "change-me-on-first-deploy";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      username,
      passwordHash,
      fullName: "مدیر سیستم",
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      username,
      email,
      passwordHash,
      fullName: "مدیر سیستم",
      role: Role.ADMIN,
      isActive: true,
    },
  });

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      minJalaliYear: defaultMinJalaliYear(),
    },
  });

  if (freshSeed) {
    const defaultTypes: { name: string; color: string }[] = [
      { name: "Host", color: "#059669" },
      { name: "SMS-Panel", color: "#0891b2" },
      { name: "mapAPI", color: "#6366f1" },
    ];
    for (const { name, color } of defaultTypes) {
      await prisma.costFactorType.upsert({
        where: { name },
        update: { color },
        create: { name, color },
      });
    }
    console.log("Seed completed (with sample cost types).");
  } else {
    console.log("Seed completed (essential data only; use --fresh-seed-data for sample cost types).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
