const REQUEST_TIMEOUT_MS = 20000;

async function callGemini(prompt) {
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": process.env.GEMINI_API_KEY,
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" },
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
    );

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
        .map((part) => part.text || "")
        .join("");
    if (!text) throw new Error("Empty response from Gemini");
    return text;
}

async function callOpenAICompatible({ url, apiKey, model, prompt }) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response from provider");
    return text;
}

function callGroq(prompt) {
    return callOpenAICompatible({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        prompt,
    });
}

function callOpenRouter(prompt) {
    return callOpenAICompatible({
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || "openrouter/free",
        prompt,
    });
}

export function getProviders() {
    return [
        { name: "Gemini",     key: process.env.GEMINI_API_KEY,     call: callGemini },
        { name: "Groq",       key: process.env.GROQ_API_KEY,       call: callGroq },
        { name: "OpenRouter", key: process.env.OPENROUTER_API_KEY, call: callOpenRouter },
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
