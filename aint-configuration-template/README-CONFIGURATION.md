# AINT Configuration Template

This folder contains starter configuration files for deploying your own copy of AINT.

## 1. Configure environment variables

1. Copy `.env.example` to `.env` in the AINT project root (the same folder as `server.js` and `package.json`).
2. Open `.env`.
3. Enter your own MySQL database credentials.
4. Enter at least one AI provider API key (OpenAI, Gemini, Groq, or OpenRouter).
5. Enter your Resend API key if you want AINT's email-based admin login to work.
6. Restart the backend after changing `.env`.

Do not share `.env`, upload it to GitHub, put API keys in `main.html`/`admin.html`/browser JavaScript, or expose it through static hosting. Keep it server-side.

## 2. Database setup

AINT's current `server.js` uses MySQL (`mysql2/promise`) and expects the schema/tables used by the application, including `Admin`, `Sessions`, `tests`, `Questions`, `Students`, `Test_Scores`, and any proctoring table/routes you use.

- Create an empty database in your MySQL service, for example `aint_db`.
- Run your project's `schema.sql` against that database.
- If `schema.sql` does not contain every table used by your version of `server.js`, add the missing table definitions before deploying.
- Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to the database's actual connection values.
- Use a database user with access only to the AINT database, rather than a global root account where possible.
- Your hosting provider may supply a private hostname and port. Use the database connection details intended for your application service.

Example command for local MySQL (run from the project root):

```bash
mysql -h 127.0.0.1 -P 3306 -u aint_user -p aint_db < schema.sql
```

The command prompts for the password. It does not put the password into shell history.

## 3. AI provider selection

The provided `aiProviders.template.js` supports provider failover. AINT tries configured providers in this order: OpenAI, Gemini, Groq, then OpenRouter. It skips providers with no API key.

Set at least one provider key. If you only want to use your own OpenAI key, fill `OPENAI_API_KEY` and leave the other provider keys blank. To use another provider, fill that provider's key instead.

The template uses server-side environment variables. Never send a provider API key from the student's browser to `/api/generate-followup`.

Provider API usage may cost money and may have quotas or rate limits. “Free” provider tiers can change and may have usage limits.

## 4. Important code integration note

Your uploaded `server.js` imports:

```js
import { generateWithFailover } from "./aiProviders.js";
```

It calls `generateWithFailover()` for both follow-up evaluation and final exam grading. Therefore, configuring a key in `.env` only works if the imported `aiProviders.js` reads that key. Your current pasted `aiProviders.js` has Gemini, Groq, and OpenRouter but does not include OpenAI, while your separate `aiguide.js` creates an OpenAI client directly. These are two different AI paths.

To use the template provider list, copy `aiProviders.template.js` over the project's `aiProviders.js` (make a backup first). This preserves the `generateWithFailover(prompt)` export expected by `server.js`.

Avoid running a second standalone `aiguide.js` service unless you intentionally configure and use it. The main `server.js` already exposes `/api/generate-followup`.

## 5. Hosting (Railway/Render/etc.)

For a hosted deployment, add environment variables in the hosting provider's service settings instead of uploading a local `.env` file. Set the database values and at least one AI key there, then redeploy/restart.

For Railway, the application service and MySQL service may have different variables. Copy the MySQL service's connection values into the application service's variables. Do not assume `localhost` points to the MySQL service: inside a deployed container, localhost means that same container.

## 6. Keep secrets safe

- Add `.env` to `.gitignore`.
- Commit `.env.example`, never `.env`.
- Rotate any key that has accidentally been committed, pasted publicly, or exposed in logs.
- Do not log API keys or database passwords.
- Restrict database credentials and use HTTPS for deployed applications.
