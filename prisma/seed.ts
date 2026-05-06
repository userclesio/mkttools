import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@admin.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Admin";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists:", email);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  await db.user.create({
    data: { email, password: hashed, name, role: "ADMIN" },
  });

  console.log("Admin created:", email);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
