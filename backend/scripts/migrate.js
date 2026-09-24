import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { COLLECTION_SPECS, findConflictingIndexes } from '../src/db/collections.js';
import { ACTIVE_SLOT_STATUSES } from '../src/db/constants.js';

const SLOT_STATUS_RANK = Object.freeze({
  CALLED: 4,
  WAITING: 3,
  CHECKED_IN: 2,
  BOOKED: 1,
  COMPLETED: 0,
});

const DUPLICATE_SLOT_CANCEL_REASON = 'Duplicate clinician slot resolved by migration';

export function pickActiveSlotKeeper(docs) {
  return [...docs].sort((a, b) => {
    const rankDiff = (SLOT_STATUS_RANK[b.status] ?? -1) - (SLOT_STATUS_RANK[a.status] ?? -1);
    if (rankDiff !== 0) return rankDiff;
    const createdDiff = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    if (createdDiff !== 0) return createdDiff;
    return String(a._id).localeCompare(String(b._id));
  })[0];
}

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
    try {
      await db.createCollection(spec.name, {
        validator,
        validationLevel: 'moderate',
        validationAction: 'error',
      });
      console.log(`[migrate] created ${spec.name}`);
      return;
    } catch (err) {
      if (err?.code !== 48 && err?.codeName !== 'NamespaceExists') {
        throw err;
      }
      // The collection was created concurrently; fall through to update its validator.
    }
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

export async function resolveDuplicateActiveSlots(db, { dryRun = false } = {}) {
  const existing = await db.listCollections({ name: 'appointments' }).toArray();
  if (existing.length === 0) {
    return { groups: 0, cancelled: 0 };
  }

  const collection = db.collection('appointments');
  const groups = await collection
    .aggregate([
      { $match: { status: { $in: [...ACTIVE_SLOT_STATUSES] } } },
      {
        $group: {
          _id: {
            clinicianId: '$clinicianId',
            appointmentDate: '$appointmentDate',
            appointmentTime: '$appointmentTime',
          },
          count: { $sum: 1 },
          docs: {
            $push: {
              _id: '$_id',
              referenceCode: '$referenceCode',
              status: '$status',
              createdAt: '$createdAt',
            },
          },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (groups.length === 0) {
    return { groups: 0, cancelled: 0 };
  }

  let cancelled = 0;
  const now = new Date();

  for (const group of groups) {
    const keeper = pickActiveSlotKeeper(group.docs);
    const extras = group.docs.filter((doc) => String(doc._id) !== String(keeper._id));
    const extraIds = extras.map((doc) => doc._id);
    const extraRefs = extras.map((doc) => doc.referenceCode || String(doc._id)).join(', ');

    if (dryRun) {
      console.log(
        `[migrate] would cancel duplicate slots ${extraRefs} (kept ${keeper.referenceCode || keeper._id})`,
      );
      cancelled += extraIds.length;
      continue;
    }

    const result = await collection.updateMany(
      { _id: { $in: extraIds }, status: { $in: [...ACTIVE_SLOT_STATUSES] } },
      {
        $set: {
          status: 'CANCELLED',
          cancelReason: DUPLICATE_SLOT_CANCEL_REASON,
          cancelledTime: now,
        },
      },
    );
    cancelled += result.modifiedCount;
    console.log(
      `[migrate] cancelled ${result.modifiedCount} duplicate slot(s) ${extraRefs} (kept ${keeper.referenceCode || keeper._id})`,
    );
  }

  return { groups: groups.length, cancelled };
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

  const duplicates = await resolveDuplicateActiveSlots(db, { dryRun: false });
  if (duplicates.cancelled > 0) {
    console.log(
      `[migrate] resolved ${duplicates.cancelled} duplicate active slot(s) across ${duplicates.groups} group(s)`,
    );
  }

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
