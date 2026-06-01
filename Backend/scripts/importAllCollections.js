#!/usr/bin/env node
/**
 * Import JSON files from ./db-dump-json into the configured MongoDB database.
 * WARNING: this will replace collections with the same name.
 * Usage: node scripts/importAllCollections.js
 */
import fs from "fs/promises";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/starleapauth";
let dbName = process.env.MONGO_DB;
// if (!dbName) {
//   const m = uri.match(/\/([^/?]+)(\?|$)/);
//   dbName = (m && m[1]) || 'starleap';
// }
const inDir = path.resolve(process.cwd(), "db-dump-json");

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // read files in directory
  const files = await fs.readdir(inDir);
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const colName = path.basename(f, ".json");
    // skip refresh tokens for privacy/security
    // if (String(colName).toLowerCase() === 'refreshtokens') {
    //   console.log('Skipping collection', colName);
    //   continue;
    // }
    console.log("Importing", colName);
    const content = await fs.readFile(path.join(inDir, f), "utf8");
    let docs = JSON.parse(content);

    // convert common stringified ObjectId fields back to ObjectId
    const convertValue = (val) => {
      // EJSON style { $oid: '...' }
      if (val && typeof val === "object" && "$oid" in val) {
        return new ObjectId(val.$oid);
      }
      // plain 24-hex string -> ObjectId (for _id and *Id fields)
      if (typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val)) {
        return new ObjectId(val);
      }
      return val;
    };

    const normalize = (item) => {
      if (Array.isArray(item)) {
        return item.map(normalize);
      }
      if (item && typeof item === "object") {
        const out = {};
        for (const [k, v] of Object.entries(item)) {
          // Attempt to convert common id fields
          if (k === "_id" || k.toLowerCase().endsWith("id")) {
            out[k] = convertValue(v);
          } else if (
            k === "createdAt" ||
            k === "updatedAt" ||
            k === "expiresAt"
          ) {
            // convert ISO date strings to Date
            if (typeof v === "string" && !isNaN(Date.parse(v))) {
              out[k] = new Date(v);
            } else {
              out[k] = normalize(v);
            }
          } else {
            out[k] = normalize(v);
          }
        }
        return out;
      }
      return item;
    };

    docs = normalize(docs);
    // replace collection
    const coll = db.collection(colName);
    await coll.deleteMany({});
    if (Array.isArray(docs) && docs.length > 0) {
      await coll.insertMany(docs);
    } else if (
      docs &&
      typeof docs === "object" &&
      Object.keys(docs).length > 0
    ) {
      // single doc case
      await coll.insertOne(docs);
    }
  }

  await client.close();
  console.log("Done importing from", inDir);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
