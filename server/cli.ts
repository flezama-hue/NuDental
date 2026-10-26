import 'dotenv/config';
import { connectDb, migrate } from './db.js';
import { seedLocal } from './seed.js';
const db = await connectDb();
try {
  await migrate(db);
  if (process.argv.includes('seed')) {
    if (!process.env.LOCAL_DEMO_PASSWORD) throw new Error('Define LOCAL_DEMO_PASSWORD en tu .env antes de crear usuarios ficticios.');
    const result = await seedLocal(db,process.env.LOCAL_DEMO_PASSWORD);
    console.log('Usuarios locales preparados (sin modificar contraseñas de usuarios existentes):', result.emails.join(', '));
  } else console.log('Migración aplicada o ya existente.');
} finally { await db.close(); }
