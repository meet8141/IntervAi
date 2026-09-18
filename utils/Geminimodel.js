import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} from "@google/generative-ai";

// ── API Key Pool ──────────────────────────────────────────────────────
const keyPool = (() => {
    const multi = process.env.NEXT_PUBLIC_GEMINI_API_KEYS;
    if (multi) {
        return multi.split(",").map((k) => k.trim()).filter(Boolean);
    }
    const single = process.env.NEXT_PUBLIC_KEY_GEMINI;
    if (single) {
        return single.split(",").map((k) => k.trim()).filter(Boolean);
    }
    return [];
})();

if (keyPool.length === 0) {
    console.error(
        "[Gemini] No API keys found. Set NEXT_PUBLIC_GEMINI_API_KEYS or NEXT_PUBLIC_KEY_GEMINI in your .env file."
    );
}

let currentKeyIndex = 0;

// ── Model fallback chain ──────────────────────────────────────────────
// If the primary model's quota is exhausted across ALL keys, fall back
// to cheaper / higher-quota models automatically.
const MODEL_FALLBACK_CHAIN = [
    "gemini-2.0-flash",
    "gemini-flash-latest",
    
];

const PRIMARY_MODEL = "gemini-2.0-flash";

// ── Shared config ─────────────────────────────────────────────────────
const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
];

// ── Helpers ───────────────────────────────────────────────────────────
/**
 * Sleep for ms milliseconds.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns true when the error indicates the API key is expired,
 * quota is exhausted, or the key is otherwise invalid.
 */
function isKeyExhaustedOrInvalid(error) {
    const msg = (error?.message || "").toLowerCase();
    const status = error?.status || error?.code || error?.httpCode;

    if (status === 400) return true;
    if (status === 429) return true;
    if (status === 403) return true;

    if (
        msg.includes("resource has been exhausted") ||
        msg.includes("resource_exhausted") ||
        msg.includes("quota") ||
        msg.includes("rate limit") ||
        msg.includes("api key not valid") ||
        msg.includes("api key expired") ||
        msg.includes("api_key_invalid") ||
        msg.includes("permission denied") ||
        msg.includes("billing") ||
        msg.includes("429")
    ) {
        return true;
    }

    return false;
}

/**
 * Returns true if the error is specifically a rate-limit (429) that
 * might succeed after a short wait (as opposed to a daily quota).
 */
function isTransientRateLimit(error) {
    const msg = (error?.message || "").toLowerCase();
    return (
        msg.includes("429") ||
        msg.includes("rate limit") ||
        msg.includes("resource has been exhausted")
    );
}

/**
 * Build a fresh ChatSession for a given API key and model.
 */
function buildChatSession(apiKey, modelName = PRIMARY_MODEL) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    return model.startChat({ generationConfig, safetySettings });
}

// ── Primary export: resilient sendMessage with auto-key-rotation ──────
/**
 * Send a prompt to Gemini with:
 *   1. Key rotation across all API keys
 *   2. One retry with a short delay for transient 429s
 *   3. Model fallback chain when all keys are exhausted on a model
 *
 * @param {string} prompt
 * @returns {Promise<import("@google/generative-ai").GenerateContentResult>}
 */
export async function sendMessage(prompt) {
    const totalKeys = keyPool.length;
    if (totalKeys === 0) {
        throw new Error("[Gemini] No API keys configured.");
    }

    let lastError;

    // Try each model in the fallback chain
    for (const modelName of MODEL_FALLBACK_CHAIN) {
        // Reset to spread load
        const startKeyIndex = currentKeyIndex;
        let keysAttempted = 0;

        while (keysAttempted < totalKeys) {
            const key = keyPool[currentKeyIndex];
            try {
                console.log(`[Gemini] Trying model=${modelName}, key #${currentKeyIndex + 1}`);
                const session = buildChatSession(key, modelName);
                const result = await session.sendMessage(prompt);
                return result;
            } catch (error) {
                lastError = error;
                console.warn(
                    `[Gemini] model=${modelName} key #${currentKeyIndex + 1} failed: ${error?.message ?? error}`
                );

                if (isKeyExhaustedOrInvalid(error)) {
                    // For transient rate limits, wait briefly and retry the SAME key once
                    if (isTransientRateLimit(error) && keysAttempted === 0) {
                        console.info("[Gemini] Transient 429 — waiting 5s before retry…");
                        await sleep(5000);
                        try {
                            const retrySession = buildChatSession(key, modelName);
                            const retryResult = await retrySession.sendMessage(prompt);
                            return retryResult;
                        } catch (retryError) {
                            console.warn("[Gemini] Retry after delay also failed.");
                            lastError = retryError;
                        }
                    }

                    // Rotate to next key
                    currentKeyIndex = (currentKeyIndex + 1) % totalKeys;
                    keysAttempted++;
                    console.info(
                        `[Gemini] Rotating to key #${currentKeyIndex + 1} (${totalKeys} total)`
                    );
                    continue;
                }

                // Non-rotatable error — throw immediately
                throw error;
            }
        }

        // All keys exhausted for this model — try next model in chain
        console.warn(`[Gemini] All keys exhausted for model=${modelName}, trying next fallback…`);
    }

    // All models + all keys exhausted
    console.error("[Gemini] All API keys and fallback models exhausted.");
    throw lastError;
}

// ── Backward-compatible legacy export ─────────────────────────────────
export const chatSession = keyPool.length > 0
    ? buildChatSession(keyPool[0], PRIMARY_MODEL)
    : null;
  