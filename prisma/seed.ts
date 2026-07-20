import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
import { isCloudMode } from "../lib/deployment";

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
  const skipAdmin = isCloudMode() || process.env.SKIP_ADMIN_SEED === "1";

  if (!skipAdmin) {
    const username = process.env.ADMIN_USERNAME ?? "admin";
    const email = process.env.ADMIN_EMAIL ?? "admin@kartin.local";
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
  }

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      minJalaliYear: defaultMinJalaliYear(),
      appName: "Kartin",
      appNameShort: "Kartin",
      appNameFa: "کارتین",
      tagline: "سیستم مدیریت هوشمند کسب‌وکار",
      logoUrl: "/logo.svg",
      iconUrl: "/icons/icon-512.png",
      themeColor: "#534AB7",
    },
  });

  const taskLabels = ["فوری", "همکاری", "مالی"];
  for (const name of taskLabels) {
    await prisma.taskLabel.upsert({
      where: { name },
      update: {},
      create: { name, color: "#534AB7" },
    });
  }

  const incomeCategories = [
    { name: "فروش محصول", color: "#2563eb" },
    { name: "خدمات", color: "#0891b2" },
    { name: "مشاوره", color: "#6366f1" },
  ];
  for (const { name, color } of incomeCategories) {
    await prisma.incomeCategory.upsert({
      where: { name },
      update: { color },
      create: { name, color },
    });
  }

  if (freshSeed) {
    const defaultTypes: { name: string; color: string }[] = [
      { name: "Host", color: "#534AB7" },
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
