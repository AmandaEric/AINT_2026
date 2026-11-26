// ----------------------------------------------------------
// config.js – the ONE place deployment settings are read.
// Every college deploys its own copy and only edits .env.
// Nothing else in the codebase should read process.env directly
// or hardcode a URL, domain, college name or database host.
// ----------------------------------------------------------

import "dotenv/config";

const env = (name, fallback = "") => String(process.env[name] ?? fallback).trim();
const list = (name) =>
    env(name)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

const isProduction = env("NODE_ENV") === "production";

const config = {
    institution: {
        name: env("INSTITUTION_NAME", "AINT"),
        shortName: env("INSTITUTION_SHORT_NAME", env("INSTITUTION_NAME", "AINT")),
        logoUrl: env("INSTITUTION_LOGO_URL"),
        primaryColor: env("INSTITUTION_PRIMARY_COLOR", "#1a56db"),
        supportEmail: env("SUPPORT_EMAIL"),
    },

    server: {
        port: Number(env("PORT", env("AI_PORT", "3001"))),
        // Public base URL of THIS college's deployment, no trailing slash.
        // e.g. https://exams.riverbend.edu
        publicUrl: env("PUBLIC_URL", "http://localhost:3000").replace(/\/+$/, ""),
        // Where the AI service lives, if it runs separately from the main server.
        aiServiceUrl: env("AI_SERVICE_URL", "http://localhost:3001").replace(/\/+$/, ""),
        // Optional: Python TTS service (kokoro_server.py)
        ttsServiceUrl: env("TTS_SERVICE_URL", "http://localhost:5005").replace(/\/+$/, ""),
    },

    cors: {
        allowedOrigins: list("ALLOWED_ORIGINS"),
    },

    database: {
        // Either a single connection string...
        url: env("DATABASE_URL"),
        // ...or individual parts.
        host: env("DB_HOST", "localhost"),
        port: Number(env("DB_PORT", "0")) || undefined,
        name: env("DB_NAME"),
        user: env("DB_USER"),
        password: env("DB_PASSWORD"),
        ssl: env("DB_SSL") === "true",
    },

    ai: {
        // aiProviders.js still reads its own provider keys from env;
        // this is only used for validation and the health check.
        hasAnyKey: Boolean(
            env("GEMINI_API_KEY") || env("GROQ_API_KEY") || env("OPENROUTER_API_KEY")
        ),
    },

    isProduction,
};

// ----------------------------------------------------------
// Validation: fail loudly at startup, not at 2am during an exam.
// ----------------------------------------------------------
const problems = [];
const hasDb = config.database.url || (config.database.name && config.database.user);

if (!hasDb) problems.push("Database not configured (set DATABASE_URL or DB_NAME + DB_USER + DB_PASSWORD).");
if (!config.ai.hasAnyKey) problems.push("No AI provider key set (GEMINI_API_KEY, GROQ_API_KEY or OPENROUTER_API_KEY).");

if (isProduction) {
    if (!process.env.PUBLIC_URL) problems.push("PUBLIC_URL is required in production.");
    if (!config.cors.allowedOrigins.length) problems.push("ALLOWED_ORIGINS is required in production.");
    if (!config.server.publicUrl.startsWith("https://")) problems.push("PUBLIC_URL must use https:// in production.");
}

if (problems.length) {
    const message = "Configuration problems:\n - " + problems.join("\n - ");
    if (isProduction) throw new Error(message);
    console.warn("\n[config] " + message + "\n[config] (continuing because NODE_ENV is not production)\n");
}

// ----------------------------------------------------------
// Values that are safe to send to browsers and the extension.
// NEVER put keys, passwords or database settings in here.
// ----------------------------------------------------------
export function publicConfig() {
    return {
        institution: config.institution,
        apiBase: config.server.publicUrl,
        aiBase: config.server.aiServiceUrl,
        ttsBase: config.server.ttsServiceUrl,
    };
}

// Serve this from server.js at GET /config.js, then add
// <script src="/config.js"></script> before your other scripts.
export function configScriptBody() {
    const json = JSON.stringify(publicConfig()).replace(/</g, "\\u003c");
    return `window.AINT_CONFIG = ${json};`;
}

export default config;