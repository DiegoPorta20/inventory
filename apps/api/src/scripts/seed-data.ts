import { eq, inArray } from 'drizzle-orm';
import type { Env } from '../config/env.js';
import { Role } from '../shared/domain/auth.js';
import type { Database } from '../shared/infrastructure/database/database.service.js';
import { categories, equipmentModels, users } from '../shared/infrastructure/database/schema.js';
import { ScryptPasswordHasher } from '../modules/users/infrastructure/scrypt-password-hasher.js';
import { EQUIPMENT_SEEDS } from './excel/equipment-links.js';
import { CATEGORY_TREE } from './excel/taxonomy.js';

export async function ensureTaxonomy(db: Database): Promise<Map<string, number>> {
  const ids = new Map<string, number>();

  const upsert = async (slug: string, name: string, parentId: number | null, sortOrder: number) => {
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    if (existing) return existing.id;
    const [result] = await db.insert(categories).values({ slug, name, parentId, sortOrder });
    return result.insertId;
  };

  let order = 0;
  for (const root of CATEGORY_TREE) {
    const rootId = await upsert(root.slug, root.name, null, order++);
    ids.set(root.slug, rootId);
    let childOrder = 0;
    for (const child of root.children ?? []) {
      ids.set(child.slug, await upsert(child.slug, child.name, rootId, childOrder++));
    }
  }
  return ids;
}

export async function ensureEquipment(db: Database): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const seed of EQUIPMENT_SEEDS) {
    const [existing] = await db
      .select({ id: equipmentModels.id })
      .from(equipmentModels)
      .where(eq(equipmentModels.name, seed.name))
      .limit(1);
    if (existing) {
      ids.set(seed.name, existing.id);
      continue;
    }
    const [legacy] = seed.legacyNames?.length
      ? await db
          .select({ id: equipmentModels.id })
          .from(equipmentModels)
          .where(inArray(equipmentModels.name, seed.legacyNames))
          .limit(1)
      : [];
    if (legacy) {
      await db
        .update(equipmentModels)
        .set({ name: seed.name, description: seed.description })
        .where(eq(equipmentModels.id, legacy.id));
      ids.set(seed.name, legacy.id);
      continue;
    }
    const [result] = await db
      .insert(equipmentModels)
      .values({ name: seed.name, description: seed.description });
    ids.set(seed.name, result.insertId);
  }
  return ids;
}

export async function ensureAdmin(db: Database, env: Env): Promise<'created' | 'exists'> {
  const [existing] = await db.select({ id: users.id }).from(users).limit(1);
  if (existing) return 'exists';
  await db.insert(users).values({
    email: env.SEED_ADMIN_EMAIL.toLowerCase(),
    name: env.SEED_ADMIN_NAME,
    passwordHash: await new ScryptPasswordHasher().hash(env.SEED_ADMIN_PASSWORD),
    role: Role.ADMIN,
  });
  return 'created';
}
