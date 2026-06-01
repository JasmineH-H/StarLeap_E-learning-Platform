#!/usr/bin/env node
/**
 * Export all collections from the configured MongoDB database to JSON files.
 * Writes files to ./db-dump-json/<collection>.json
 * Usage: node scripts/exportAllCollections.js
 */
import fs from 'fs/promises';
import path from 'path';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/curiocampauth';
// derive DB name: prefer MONGO_DB, otherwise extract from URI if present
let dbName = process.env.MONGO_DB;
if (!dbName) {
  const m = uri.match(/\/([^/?]+)(\?|$)/);
  dbName = (m && m[1]) || 'curiocamp';
}
const outDir = path.resolve(process.cwd(), 'db-dump-json');

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  await fs.mkdir(outDir, { recursive: true });

  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const name = c.name;
    // Skip refresh token collection for security/privacy
    if (String(name).toLowerCase() === 'refreshtokens') {
      console.log('Skipping collection', name);
      continue;
    }
    console.log('Exporting', name);
    const docs = await db.collection(name).find({}).toArray();
    // convert ObjectId/date to JSON-friendly values
    const serialized = docs.map((doc) => JSON.parse(JSON.stringify(doc)));
    await fs.writeFile(path.join(outDir, `${name}.json`), JSON.stringify(serialized, null, 2));
  }

  await client.close();
  console.log('Done exporting to', outDir);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
