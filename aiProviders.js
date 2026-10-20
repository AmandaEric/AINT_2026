const REQUEST_TIMEOUT_MS = 20000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// Read an env var, trimmed, so a stray space or newline can't break a key
const env = (name) => (process.env[name] || "").trim();

function httpError(status, body) {
    const err = new Error(`HTTP ${status}: ${body.slice(0, 200)}`);
    err.status = status;
    return err;
}

// Retry temporary failures (overload, rate limit, timeout) with a short backoff
async function withRetry(fn, tries = 3) {
    for (let i = 0; i < tries; i++) {
        try {
            return await fn();
        } catch (err) {
            const retryable = RETRYABLE_STATUS.has(err.status) || err.name === "TimeoutError";
            if (!retryable || i === tries - 1) throw err;
            await new Promise((r) => setTimeout(r, 1000 * 2 ** i + Math.random() * 300));
        }
    }
}

async function callGeminiModel(model, prompt) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": env("GEMINI_API_KEY"),
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" },
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
    );

    if (!response.ok) throw httpError(response.status, await response.text());

    const data = await response.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
        .map((part) => part.text || "")
        .join("");
    if (!text) throw new Error("Empty response from Gemini");
    return text;
}

function callGemini(prompt) {
    const model = env("GEMINI_MODEL") || "gemini-3.8-flash";
    return withRetry(() => callGeminiModel(model, prompt));
}

// Only used if GEMINI_FALLBACK_MODEL is set
function callGeminiFallback(prompt) {
    return withRetry(() => callGeminiModel(env("GEMINI_FALLBACK_MODEL"), prompt));
}

async function callOpenAICompatible({ url, apiKey, model, prompt }) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) throw httpError(response.status, await response.text());

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response from provider");
    return text;
}

function callGroq(prompt) {
    return withRetry(() =>
        callOpenAICompatible({
            url: "https://api.groq.com/openai/v1/chat/completions",
            apiKey: env("GROQ_API_KEY"),
            model: env("GROQ_MODEL") || "llama-3.3-70b-versatile",
            prompt,
        })
    );
}

function callOpenRouter(prompt) {
    return withRetry(() =>
        callOpenAICompatible({
            url: "https://openrouter.ai/api/v1/chat/completions",
            apiKey: env("OPENROUTER_API_KEY"),
            model: env("OPENROUTER_MODEL") || "openrouter/free",
            prompt,
        })
    );
}

export function getProviders() {
    return [
        { name: "Gemini", key: env("GEMINI_API_KEY"), call: callGemini },
        {
            name: "Gemini (fallback model)",
            key: env("GEMINI_FALLBACK_MODEL") ? env("GEMINI_API_KEY") : "",
            call: callGeminiFallback,
        },
        { name: "Groq", key: env("GROQ_API_KEY"), call: callGroq },
        { name: "OpenRouter", key: env("OPENROUTER_API_KEY"), call: callOpenRouter },
    ];
}

export async function generateWithFailover(prompt) {
    const errors = [];
    for (const provider of getProviders()) {
        if (!provider.key) {
            errors.push(`${provider.name}: no API key set, skipped`);
            continue;
        }
        try {
            const text = await provider.call(prompt);
            console.log(`AI answered using: ${provider.name}`);
            return { text, provider: provider.name };
        } catch (err) {
            console.warn(`${provider.name} failed: ${err.message}`);
            errors.push(`${provider.name}: ${err.message}`);
        }
    }
    throw new Error("All AI providers failed. " + errors.join(" | "));
}