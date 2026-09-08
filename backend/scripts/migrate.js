import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { COLLECTION_SPECS, findConflictingIndexes } from '../src/db/collections.js';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

export { COLLECTION_SPECS, findConflictingIndexes };

async function ensureCollection(db, spec, { dryRun }) {
  const existing = await db.listCollections({ name: spec.name }).toArray();
  const validator = {
    $jsonSchema: spec.validator.$jsonSchema,
  };

  if (dryRun) {
    console.log(`[migrate] ${existing.length ? 'would update' : 'would create'} ${spec.name}`);
    return;
  }

  if (existing.length === 0) {
    await db.createCollection(spec.name, {
      validator,
      validationLevel: 'moderate',
      validationAction: 'error',
    });
    console.log(`[migrate] created ${spec.name}`);
    return;
  }

  await db.command({
    collMod: spec.name,
    validator,
    validationLevel: 'moderate',
    validationAction: 'error',
  });
  console.log(`[migrate] updated validator on ${spec.name}`);
}

async function ensureIndexes(db, spec, { dryRun }) {
  const collection = db.collection(spec.name);
  for (const { keys, options } of spec.indexes) {
    if (dryRun) {
      console.log(`[migrate] would ensure index ${options.name} on ${spec.name}`);
      continue;
    }
    await collection.createIndex(keys, options);
    console.log(`[migrate] ensured index ${options.name} on ${spec.name}`);
  }
}

export async function migrate({ dryRun = false } = {}) {
  const conflicts = findConflictingIndexes(COLLECTION_SPECS);
  if (conflicts.length > 0) {
    throw new Error(`Index conflicts:\n${conflicts.join('\n')}`);
  }

  if (dryRun) {
    for (const spec of COLLECTION_SPECS) {
      console.log(`[migrate] dry-run ${spec.name} (${spec.indexes.length} indexes)`);
      for (const { options } of spec.indexes) {
        console.log(`[migrate] would ensure index ${options.name} on ${spec.name}`);
      }
    }
    return { ok: true, dryRun: true, collections: COLLECTION_SPECS.map((s) => s.name) };
  }

  const connection = await connectDb();
  const db = connection.db;

  for (const spec of COLLECTION_SPECS) {
    await ensureCollection(db, spec, { dryRun: false });
    await ensureIndexes(db, spec, { dryRun: false });
  }

  return { ok: true, dryRun: false, collections: COLLECTION_SPECS.map((s) => s.name) };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const dryRun = process.argv.includes('--dry-run');
  try {
    const result = await migrate({ dryRun });
    console.log('[migrate] done', result);
    if (!dryRun) await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error('[migrate] failed', err);
    if (!dryRun) await disconnectDb();
    process.exit(1);
  }
}
