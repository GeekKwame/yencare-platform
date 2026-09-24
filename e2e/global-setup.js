/**
 * Clears fixtures left behind by a crashed run, once, before any worker starts.
 *
 * In-run cleanup is per-worker (see db-helper.js) because tests execute in
 * parallel; a tag-wide wipe mid-run would delete another worker's fixtures.
 * This is the only safe moment for a tag-wide sweep.
 */
export default async function globalSetup() {
  const uri = process.env.E2E_MONGODB_URI;
  if (!uri) return;

  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    const db = client.db();

    if (!/e2e|test/i.test(db.databaseName)) {
      throw new Error(
        `Refusing to sweep fixtures in "${db.databaseName}": name must contain "e2e" or "test"`,
      );
    }

    const stale = await db.collection('appointments')
      .find({ e2eFixture: true })
      .project({ _id: 1 })
      .toArray();
    const ids = stale.map((doc) => doc._id);

    if (ids.length > 0) {
      await db.collection('queue_counters').updateMany(
        { activeAppointmentId: { $in: ids } },
        { $set: { activeAppointmentId: null } },
      );
      await db.collection('appointments').deleteMany({ _id: { $in: ids } });
    }
    await db.collection('time_slots').deleteMany({ e2eFixture: true });

    if (ids.length > 0) {
      console.log(`[e2e] swept ${ids.length} stale fixture appointment(s)`);
    }
  } finally {
    await client.close();
  }
}
