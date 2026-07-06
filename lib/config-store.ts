import { promises as fs } from "fs";
import path from "path";
import { getSupabaseClient } from "@/lib/supabase";
import type { AnsemConfig, KnowledgeDocument } from "@/lib/types";

const configPath = path.join(process.cwd(), "data", "ansem-config.json");

async function loadSupabaseDocuments(): Promise<KnowledgeDocument[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client.from("ansem_documents").select("title, kind, content");
    if (error || !data) return [];
    return data as KnowledgeDocument[];
  } catch {
    return [];
  }
}

export async function getConfig(): Promise<AnsemConfig> {
  const raw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(raw) as AnsemConfig;

  const supabaseDocs = await loadSupabaseDocuments();
  if (supabaseDocs.length === 0) return config;

  const existingTitles = new Set(config.documents.map((doc) => doc.title));
  const merged = [...config.documents, ...supabaseDocs.filter((doc) => !existingTitles.has(doc.title))];
  return { ...config, documents: merged };
}

export async function saveConfig(config: AnsemConfig) {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
