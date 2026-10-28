// aiProviders.js - AINT AI provider configuration with failover.
// Uses server-side environment variables. Never put API keys in browser code.

const REQUEST_TIMEOUT_MS = 20_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const env = (name) => (process.env[name] || "").trim();

function httpError(status, body) {
    const err = new Error(`HTTP ${status}: ${String(body).slice(0, 200)}`);
    err.status = status;
    return err;
}

async function withRetry(fn, tries = 3) {
    for (let i = 0; i < tries; i++) {
        try {
            return await fn();
        } catch (err) {
            const retryable =
                RETRYABLE_STATUS.has(err.status) ||
                err.name === "TimeoutError" ||
                err.name === "AbortError";
            if (!retryable || i === tries - 1) throw err;
            await new Promise((resolve) =>
                setTimeout(resolve, 1000 * (2 ** i) + Math.random() * 300)
            );
        }
    }
}

async function callOpenAICompatible({ url, apiKey, model, prompt, provider }) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "system",
                    content: "Follow the user's instructions. When asked for JSON, return only valid JSON.",
                },
                { role: "user", content: prompt },
            ],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) throw httpError(response.status, await response.text());
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
        throw new Error(`${provider} returned an empty response`);
    }
    return text;
}

function callOpenAI(prompt) {
    return withRetry(() =>
        callOpenAICompatible({
            url: "https://api.openai.com/v1/chat/completions",
            apiKey: env("OPENAI_API_KEY"),
            model: env("OPENAI_MODEL") || "gpt-4o-mini",
            prompt,
            provider: "OpenAI",
        })
    );
}

async function callGeminiModel(model, prompt) {
    if (!model) throw new Error("Gemini model is not configured");
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
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
    if (!text.trim()) throw new Error("Gemini returned an empty response");
    return text;
}

function callGemini(prompt) {
    return withRetry(() =>
        callGeminiModel(env("GEMINI_MODEL") || "gemini-2.5-flash", prompt)
    );
}

function callGeminiFallback(prompt) {
    return withRetry(() => callGeminiModel(env("GEMINI_FALLBACK_MODEL"), prompt));
}

function callGroq(prompt) {
    return withRetry(() =>
        callOpenAICompatible({
            url: "https://api.groq.com/openai/v1/chat/completions",
            apiKey: env("GROQ_API_KEY"),
            model: env("GROQ_MODEL") || "openai/gpt-oss-120b",
            prompt,
            provider: "Groq",
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
            provider: "OpenRouter",
        })
    );
}

export function getProviders() {
    const providers = [];

    if (env("OPENAI_API_KEY")) {
        providers.push({ name: "OpenAI", call: callOpenAI });
    }
    if (env("GEMINI_API_KEY")) {
        providers.push({ name: "Gemini", call: callGemini });
        if (env("GEMINI_FALLBACK_MODEL")) {
            providers.push({ name: "Gemini (fallback model)", call: callGeminiFallback });
        }
    }
    if (env("GROQ_API_KEY")) {
        providers.push({ name: "Groq", call: callGroq });
    }
    if (env("OPENROUTER_API_KEY")) {
        providers.push({ name: "OpenRouter", call: callOpenRouter });
    }

    return providers;
}

export async function generateWithFailover(prompt) {
    const providers = getProviders();
    if (providers.length === 0) {
        throw new Error(
            "No AI provider is configured. Set OPENAI_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY."
        );
    }

    const errors = [];
    for (const provider of providers) {
        try {
            const text = await provider.call(prompt);
            console.log(`AI answered using: ${provider.name}`);
            return { text, provider: provider.name };
        } catch (err) {
            console.warn(`${provider.name} failed: ${err.message}`);
            errors.push(`${provider.name}: ${err.message}`);
        }
    }

    throw new Error("All configured AI providers failed. " + errors.join(" | "));
}
