#!/usr/bin/env node
/**
 * Prepara .env.local: genera la chiave di firma delle sessioni e riporta
 * i valori di .env.example. Non sovrascrive un file esistente.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const TARGET = ".env.local";

if (existsSync(TARGET)) {
  console.log(`${TARGET} esiste già: non lo tocco.`);
  const current = readFileSync(TARGET, "utf8");
  const missing = ["AUTH_SECRET", "ANTHROPIC_API_KEY", "ADMIN_EMAILS"].filter(
    (key) => !new RegExp(`^${key}="?.+"?$`, "m").test(current),
  );
  console.log(missing.length ? `Da compilare ancora: ${missing.join(", ")}` : "Sembra completo.");
  process.exit(0);
}

const template = readFileSync(".env.example", "utf8");
const secret = randomBytes(48).toString("base64");
const filled = template.replace('AUTH_SECRET=""', `AUTH_SECRET="${secret}"`);

writeFileSync(TARGET, filled);
console.log(`Creato ${TARGET} con AUTH_SECRET generato.`);
console.log("Resta da compilare: ANTHROPIC_API_KEY (console.anthropic.com → API keys).");
console.log("Poi:  npm run dev");
