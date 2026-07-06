#!/usr/bin/env node
// Local curation tool for data/ansem-config.json.
// No external API required: paste text from an official tweet/Telegram/Discord post
// or doc, and it gets appended as a cited source the assistant can answer from.
//
// Usage:
//   node scripts/manage-config.mjs add-doc --title "..." --kind announcement --content "..."
//   node scripts/manage-config.mjs add-announcement-source --label "..." --type x --url "..."
//   node scripts/manage-config.mjs add-official-link --label "..." --url "..."
//   node scripts/manage-config.mjs add-trusted-account --handle "..." --label "..." --url "..."
//   node scripts/manage-config.mjs list

import { readFile, writeFile } from "fs/promises";
import path from "path";

const configPath = path.join(process.cwd(), "data", "ansem-config.json");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
      args[key] = value;
      if (value !== "true") i += 1;
    }
  }
  return args;
}

async function loadConfig() {
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw);
}

async function saveConfig(config) {
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function requireArgs(args, keys) {
  const missing = keys.filter((key) => !args[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required arguments: ${missing.map((key) => `--${key}`).join(", ")}`);
  }
}

async function addDoc(args) {
  requireArgs(args, ["title", "kind", "content"]);
  const config = await loadConfig();
  config.documents.push({ title: args.title, kind: args.kind, content: args.content });
  await saveConfig(config);
  console.log(`Added document "${args.title}" (${args.kind}). Total documents: ${config.documents.length}`);
}

async function addAnnouncementSource(args) {
  requireArgs(args, ["label", "type", "url"]);
  const validTypes = ["x", "telegram", "discord", "website", "other"];
  if (!validTypes.includes(args.type)) {
    throw new Error(`--type must be one of: ${validTypes.join(", ")}`);
  }
  const config = await loadConfig();
  config.announcementSources.push({ label: args.label, type: args.type, url: args.url });
  await saveConfig(config);
  console.log(`Added announcement source "${args.label}". Total sources: ${config.announcementSources.length}`);
}

async function addOfficialLink(args) {
  requireArgs(args, ["label", "url"]);
  const config = await loadConfig();
  config.officialLinks.push({ label: args.label, url: args.url });
  await saveConfig(config);
  console.log(`Added official link "${args.label}". Total links: ${config.officialLinks.length}`);
}

async function addTrustedAccount(args) {
  requireArgs(args, ["handle", "label", "url"]);
  const config = await loadConfig();
  config.trustedXAccounts.push({ handle: args.handle, label: args.label, url: args.url });
  await saveConfig(config);
  console.log(`Added trusted account @${args.handle}. Total accounts: ${config.trustedXAccounts.length}`);
}

async function list() {
  const config = await loadConfig();
  console.log(`Documents (${config.documents.length}):`);
  config.documents.forEach((doc, i) => console.log(`  ${i + 1}. [${doc.kind}] ${doc.title}`));
  console.log(`\nAnnouncement sources (${config.announcementSources.length}):`);
  config.announcementSources.forEach((source, i) => console.log(`  ${i + 1}. [${source.type}] ${source.label} -> ${source.url}`));
  console.log(`\nOfficial links (${config.officialLinks.length}):`);
  config.officialLinks.forEach((link, i) => console.log(`  ${i + 1}. ${link.label} -> ${link.url}`));
  console.log(`\nTrusted X accounts (${config.trustedXAccounts.length}):`);
  config.trustedXAccounts.forEach((account, i) => console.log(`  ${i + 1}. @${account.handle} (${account.label})`));
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  switch (command) {
    case "add-doc":
      return addDoc(args);
    case "add-announcement-source":
      return addAnnouncementSource(args);
    case "add-official-link":
      return addOfficialLink(args);
    case "add-trusted-account":
      return addTrustedAccount(args);
    case "list":
      return list();
    default:
      console.log(
        [
          "Usage:",
          '  node scripts/manage-config.mjs add-doc --title "..." --kind announcement --content "..."',
          '  node scripts/manage-config.mjs add-announcement-source --label "..." --type x --url "..."',
          '  node scripts/manage-config.mjs add-official-link --label "..." --url "..."',
          '  node scripts/manage-config.mjs add-trusted-account --handle "..." --label "..." --url "..."',
          "  node scripts/manage-config.mjs list"
        ].join("\n")
      );
      if (command) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
