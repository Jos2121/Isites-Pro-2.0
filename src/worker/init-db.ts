import "dotenv/config";
import postgres from "postgres";

async function initDb() {
  console.log("Inicializando base de datos...");
  
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL no está definida en las variables de entorno.");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER,
        subscription_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'other',
        status VARCHAR(20) DEFAULT 'confirmed',
        transaction_reference VARCHAR(100),
        payment_date TIMESTAMPTZ DEFAULT NOW(),
        payment_type VARCHAR(50) DEFAULT 'new_subscription',
        is_platform_income BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log("Tabla 'payments' verificada/creada exitosamente.");
    process.exit(0);
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
    process.exit(1);
  }
}

initDb();