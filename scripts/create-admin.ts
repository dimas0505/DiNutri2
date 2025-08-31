import "dotenv/config";
import bcrypt from "bcrypt";
import { storage } from "../server/storage.js";

const SALT_ROUNDS = 10;

async function createFirstAdmin() {
  // Verificar se a DATABASE_URL está configurada
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL não está configurada no arquivo .env");
    console.log("📝 Verifique se o arquivo .env existe na raiz do projeto");
    console.log("Current working directory:", process.cwd());
    process.exit(1);
  }

  console.log("🔌 DATABASE_URL encontrada:", process.env.DATABASE_URL?.substring(0, 50) + "...");

  const email = process.env.ADMIN_EMAIL || "admin@dinutri.com";
  const password = process.env.ADMIN_PASSWORD || "admin123456";
  const firstName = process.env.ADMIN_FIRST_NAME || "Administrador";
  const lastName = process.env.ADMIN_LAST_NAME || "Sistema";

  try {
    console.log("🔌 Conectando ao banco de dados...");
    
    // Verifica se já existe um admin
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      console.log("⚠️  Usuário administrador já existe:", email);
      console.log("👤 Role:", existingUser.role);
      return;
    }

    console.log("🔐 Criando hash da senha...");
    // Cria o hash da senha
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    console.log("👤 Criando usuário administrador...");
    // Cria o usuário administrador
    const admin = await storage.upsertUser({
      email,
      firstName,
      lastName,
      hashedPassword,
      role: "admin",
    });

    console.log("\n✅ Usuário administrador criado com sucesso!");
    console.log("📧 Email:", email);
    console.log("🔑 Senha:", password);
    console.log("👤 Nome:", `${firstName} ${lastName}`);
    console.log("🔐 Role:", admin.role);
    console.log("\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!");

  } catch (error) {
    console.error("❌ Erro ao criar usuário administrador:", error);
    process.exit(1);
  }
}

createFirstAdmin();