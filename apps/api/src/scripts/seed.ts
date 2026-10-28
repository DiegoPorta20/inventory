import { openScriptContext } from './script-context.js';
import { ensureAdmin, ensureEquipment, ensureTaxonomy } from './seed-data.js';

const { env, db, close } = openScriptContext();

try {
  const taxonomy = await ensureTaxonomy(db);
  const equipment = await ensureEquipment(db);
  const admin = await ensureAdmin(db, env);
  console.log(`Categories ready: ${taxonomy.size}`);
  console.log(`Equipment models ready: ${equipment.size}`);
  console.log(
    admin === 'created' ? `Admin created: ${env.SEED_ADMIN_EMAIL}` : 'Admin already exists',
  );
} finally {
  await close();
}
