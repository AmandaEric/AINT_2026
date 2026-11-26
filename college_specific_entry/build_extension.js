// ----------------------------------------------------------
// scripts/build-extension.js
// Produces dist/extension/ configured for ONE college, from .env.
//
//   npm run build:extension
//
// Then zip dist/extension and publish/distribute that zip.
// Assumes a Manifest V3 extension in ./aint-extension.
// ----------------------------------------------------------

import fs from "fs";
import path from "path";
import config, { publicConfig } from "../config.js";

const SRC = "aint-extension";
const OUT = path.join("dist", "extension");

const origin = new URL(config.server.publicUrl).origin;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// Copy everything except old zips
fs.cpSync(SRC, OUT, {
    recursive: true,
    filter: (src) => !src.endsWith(".zip"),
});

// Patch the manifest so the extension only talks to this college's domain
const manifestPath = path.join(OUT, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

manifest.name = `${manifest.name} – ${config.institution.shortName}`;
manifest.host_permissions = [`${origin}/*`];

if (manifest.externally_connectable) {
    manifest.externally_connectable.matches = [`${origin}/*`];
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// Runtime config for the extension's scripts.
// In background.js (service worker):  importScripts("config.generated.js");
// then read self.AINT_CONFIG.apiBase instead of a hardcoded URL.
const generated = `self.AINT_CONFIG = ${JSON.stringify(publicConfig())};\n`;
fs.writeFileSync(path.join(OUT, "config.generated.js"), generated);

console.log(`Extension built for ${config.institution.name}`);
console.log(`  API origin: ${origin}`);
console.log(`  Output:     ${OUT}`);
console.log("  Next: zip the folder and distribute it.");