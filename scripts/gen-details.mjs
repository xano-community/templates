#!/usr/bin/env node
// Writes details/<name>.json for every template in templates.json: what Xano
// Studio shows on a template's detail page. Everything is read from the
// template's own repository, so run it again whenever a template changes.
//
//   node scripts/gen-details.mjs            # clones each template (shallow) into a temp folder
//   node scripts/gen-details.mjs --src DIR  # reads DIR/<name> instead of cloning
//
// The canvas keeps the shape xano.com/templates draws (`canvas.graph` in
// xano-community-hub's gen-registry.mjs), read from a Xano SDK project
// (`xano/`, TypeScript) instead of XanoScript:
//
//   app ─► API ─────────┐
//                       ├─► Business logic ─► Data
//   agents ─► Agent tools┘                 └─► External services
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** A card lists this many lines, the last being "+N more" when there are more. */
const CAP = 7;
const capList = (items) =>
  items.length > CAP ? [...items.slice(0, CAP - 1), `+${items.length - CAP + 1} more`] : items;

/** The services a backend variable's name stands for, by its prefix. */
const VENDORS = [
  ["ANTHROPIC_", "Anthropic"],
  ["GEMINI_", "Google Gemini"],
  ["OPENAI_", "OpenAI"],
  ["RESEND_", "Resend"],
  ["SENDGRID_", "SendGrid"],
  ["STRIPE_", "Stripe"],
  ["TWILIO_", "Twilio"],
  ["SLACK_", "Slack"],
];

const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir).toSorted()) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Each API group with how many endpoints it has, largest first, from `xano/routes.gen.ts`. */
function apiGroups(dir) {
  const counts = new Map();
  const routes = read(path.join(dir, "xano/routes.gen.ts")) ?? "";
  for (const [, group] of routes.matchAll(/verb: "[A-Z]+", path: "\/api:([^/"]+)/g)) {
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return [...counts].toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** The tables the template declares itself (`table({ name: "…" })` under `xano/table`). */
function tableNames(dir) {
  const names = [];
  for (const file of walk(path.join(dir, "xano/table"))) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
    for (const [, name] of fs.readFileSync(file, "utf8").matchAll(/\btable\(\{\s*name:\s*"([^"]+)"/g)) {
      names.push(name);
    }
  }
  return names.toSorted();
}

/** The areas of `xano/function`, one folder each. */
function logicAreas(dir) {
  const root = path.join(dir, "xano/function");
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((entry) => fs.statSync(path.join(root, entry)).isDirectory())
    .toSorted();
}

/** The outside services the backend's variables name (`workspaceConfig({ env })`). */
function externalServices(dir) {
  const workspace = read(path.join(dir, "xano/workspace.ts")) ?? "";
  return VENDORS.filter(([prefix]) => new RegExp(`\\b${prefix}[A-Z_]+:`).test(workspace)).map(
    ([, name]) => name,
  );
}

/** `39 tables · 186 endpoints · 15 screens`, the line the README states them on. */
function readmeCounts(readme) {
  const line = readme.match(/^`(\d+) tables · (\d+) endpoints · (\d+) screens/m);
  return line === null
    ? null
    : { tables: Number(line[1]), endpoints: Number(line[2]), screens: Number(line[3]) };
}

/** The README's first paragraph after its picture, as plain text. */
function readmeAbout(readme) {
  const intro = readme.split(/\n## /)[0] ?? "";
  const afterPicture = intro.split(/\n!\[[^\n]*\n/)[1] ?? "";
  const paragraph = afterPicture.trim().split(/\n\s*\n/)[0] ?? "";
  const plain = paragraph
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain === "" ? null : plain;
}

function canvasGraph({ name, screens, groups, tools, areas, tables, services }) {
  const nodes = [];
  const edges = [];
  const node = (id, label, type, col, row, lines) =>
    nodes.push({ id, label, type, col, row, sublabel: capList(lines).join("\n") });
  // A screen with a parameter (`/tasks/:id`) is reached from one without.
  const topScreens = screens.filter((screen) => !screen.path.includes(":")).map((s) => s.name);
  const hasLogic = areas.length > 0 || services.length > 0;
  const entries = [];

  node("client", `${name} app`, "transform", 0, 0, topScreens.length > 0 ? topScreens : ["Web · mobile"]);
  node("api", "API", "entry", 1, 0, groups.map(([group]) => group));
  edges.push({ from: "client", to: "api" });
  entries.push("api");
  if (tools.length > 0) {
    node("agents", "Your agents", "transform", 0, 1, ["Claude · ChatGPT", "any MCP client"]);
    node("tools", "Agent tools", "entry", 1, 1, tools);
    edges.push({ from: "agents", to: "tools" });
    entries.push("tools");
  }
  if (hasLogic) {
    node("logic", "Business logic", "transform", 2, 0, areas);
    for (const entry of entries) edges.push({ from: entry, to: "logic" });
  }
  node("data", "Data", "store", 3, 0, tables);
  if (hasLogic) edges.push({ from: "logic", to: "data" });
  else for (const entry of entries) edges.push({ from: entry, to: "data" });
  if (services.length > 0) {
    node("external", "External services", "external", 4, 0, services);
    edges.push({ from: "logic", to: "external" });
  }
  return { nodes, edges };
}

function detail(entry, dir) {
  const slug = entry.repo.split("/").at(-1);
  const raw = (file) => `https://raw.githubusercontent.com/${entry.repo}/HEAD/${file}`;
  const template = JSON.parse(read(path.join(dir, "template.json")) ?? "{}");
  const readme = read(path.join(dir, "README.md")) ?? "";
  const screens = template.screens ?? [];
  const groups = apiGroups(dir);
  const tables = tableNames(dir);
  const light = [template.preview, "docs/screenshot-light.png"].find(
    (file) => typeof file === "string" && fs.existsSync(path.join(dir, file)),
  );
  const dark = fs.existsSync(path.join(dir, "docs/screenshot-dark.png")) ? "docs/screenshot-dark.png" : light;
  return {
    repo: entry.repo,
    about: readmeAbout(readme),
    screenshot: light === undefined ? null : raw(light),
    screenshotDark: dark === undefined ? null : raw(dark),
    // The README counts what installed modules add too; the fallback counts the template's own.
    counts: readmeCounts(readme) ?? {
      tables: tables.length,
      endpoints: groups.reduce((sum, [, count]) => sum + count, 0),
      screens: screens.length,
    },
    canvas: {
      graph: canvasGraph({
        name: entry.name ?? template.name ?? slug,
        screens,
        groups,
        tools: template.agentTools ?? [],
        areas: logicAreas(dir),
        tables,
        services: externalServices(dir),
      }),
    },
  };
}

function main() {
  const srcFlag = process.argv.indexOf("--src");
  const src = srcFlag === -1 ? fs.mkdtempSync(path.join(os.tmpdir(), "templates-")) : path.resolve(process.argv[srcFlag + 1]);
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, "templates.json"), "utf8"));
  fs.mkdirSync(path.join(ROOT, "details"), { recursive: true });
  for (const entry of index) {
    const slug = entry.repo.split("/").at(-1);
    const dir = path.join(src, slug);
    if (!fs.existsSync(dir)) {
      execFileSync("git", ["clone", "--quiet", "--depth", "1", `https://github.com/${entry.repo}.git`, dir], { stdio: "inherit" });
    }
    const out = detail(entry, dir);
    fs.writeFileSync(path.join(ROOT, "details", `${slug}.json`), `${JSON.stringify(out, null, 2)}\n`);
    const { nodes } = out.canvas.graph;
    console.log(`details/${slug}.json: ${nodes.length} cards, ${out.counts.tables} tables, ${out.counts.endpoints} endpoints`);
  }
}

main();
