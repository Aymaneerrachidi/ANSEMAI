#!/usr/bin/env node
// One-off push of data/ansem-config.json documents into Supabase (supabase/schema.sql tables).
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
// Run: node scripts/migrate-to-supabase.mjs

import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
  process.exit(1);
}

const configPath = path.join(process.cwd(), "data", "ansem-config.json");
const config = JSON.parse(await readFile(configPath, "utf8"));

const client = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const rows = config.documents.map((doc) => ({ title: doc.title, kind: doc.kind, content: doc.content }));
  const { error, count } = await client.from("ansem_documents").upsert(rows, { onConflict: "title", count: "exact" });

  if (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }

  console.log(`Upserted ${count ?? rows.length} document(s) into ansem_documents.`);
  console.log("Note: embeddings were not generated (no embedding provider configured). Vector search will not work until a job populates the `embedding` column.");
}

main();
