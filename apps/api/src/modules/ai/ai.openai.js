import OpenAI from "openai";
import { OPENAI_MODEL } from "./ai.model.js";
import { config } from "#api/config/env.js";
import { logger } from "#api/utils/logger.js";

const DEFAULT_TIMEOUT_MS = 20000;
const RETRY_ATTEMPTS = 2;
const BREAKER_THRESHOLD = 3;
const BREAKER_TIMEOUT_MS = 60000;

let openaiClient;
let resolvedBaseUrl = null;
const breakerState = {
  failures: 0,
  openedAt: null
};

const isBreakerOpen = () => {
  if (!breakerState.openedAt) return false;
  const elapsed = Date.now() - breakerState.openedAt;
  if (elapsed > BREAKER_TIMEOUT_MS) {
    breakerState.failures = 0;
    breakerState.openedAt = null;
    return false;
  }
  return true;
};

const recordFailure = () => {
  breakerState.failures += 1;
  if (breakerState.failures >= BREAKER_THRESHOLD) {
    breakerState.openedAt = Date.now();
  }
};

const recordSuccess = () => {
  breakerState.failures = 0;
  breakerState.openedAt = null;
};

export const resetCircuitBreaker = () => {
  breakerState.failures = 0;
  breakerState.openedAt = null;
};

const withTimeout = (promise, timeoutMs) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("OpenAI request timed out"));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
};

export function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY.trim();
    const options = { apiKey };
    if (config.ai?.baseUrl) {
      options.baseURL = config.ai.baseUrl;
    } else if (apiKey.startsWith("sk-or-")) {
      options.baseURL = "https://openrouter.ai/api/v1";
      logger.warn("Detected OpenRouter key. Using OpenRouter base URL.");
    }
    resolvedBaseUrl = options.baseURL || "https://api.openai.com/v1";
    logger.info(
      { baseURL: resolvedBaseUrl, model: config.ai?.model || OPENAI_MODEL },
      "OpenAI client configured"
    );
    openaiClient = new OpenAI(options);
  }
  return openaiClient;
}

export async function healthCheck() {
  const prompt = "Return JSON: {\"status\":\"ok\",\"explanation\":\"health check\",\"reasoning\":\"n/a\"}";
  const schema = {
    type: "object",
    properties: {
      status: { type: "string" },
      explanation: { type: "string" },
      reasoning: { type: "string" }
    },
    required: ["status", "explanation", "reasoning"],
    additionalProperties: false
  };
  const result = await structuredJSONResponse({
    prompt,
    schema,
    timeoutMs: 8000
  });
  const ok = result?.data?.status === "ok";
  if (ok) resetCircuitBreaker();
  return ok;
}

const extractContent = (response) => {
  const choice = response?.choices?.[0]?.message?.content;
  if (choice) return choice;
  return response?.output_text || "";
};

export async function generateResponse({
  prompt,
  schema,
  model = config.ai?.model || OPENAI_MODEL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  ignoreBreaker = false
}) {
  if (!ignoreBreaker && isBreakerOpen()) {
    throw new Error("OpenAI circuit breaker open");
  }

  // Ensure the client (and resolvedBaseUrl) is initialized before checking
  const client = createOpenAIClient();
  let lastError;
  // OpenRouter doesn't support json_schema strict mode, but DOES support json_object
  const isOpenRouter = !!(resolvedBaseUrl && resolvedBaseUrl.includes("openrouter"));
  const allowJsonSchema = !isOpenRouter;

  // When we cannot enforce the schema via json_schema mode, embed it in the system message
  // so the model knows EXACTLY which field names and types to use.
  const schemaInstruction = (schema && !allowJsonSchema)
    ? `\n\nYou MUST return a JSON object with EXACTLY these fields (no other fields):\n${JSON.stringify(schema, null, 2)}`
    : "";
  const messages = [
    {
      role: "system",
      content: `You are a helpful AI assistant. Return ONLY valid JSON — no markdown fences, no extra text, no explanations outside the JSON object.${schemaInstruction}`
    },
    { role: "user", content: prompt }
  ];

  for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await withTimeout(
        client.chat.completions.create({
          model,
          messages,
          response_format: allowJsonSchema && schema
            ? { type: "json_schema", json_schema: { name: "response", strict: true, schema } }
            : { type: "json_object" }
        }),
        timeoutMs
      );

      recordSuccess();
      const text = extractContent(response);
      return {
        text,
        usageMetadata: {
          totalTokenCount: response?.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      const status = error?.status || error?.code;
      if (status === 401) {
        resetCircuitBreaker();
        logger.error("OpenAI API key rejected (401). Check OPENAI_API_KEY and base URL.");
        throw new Error("Invalid OpenAI API key");
      }
      // Fallback for providers that do not support json_schema response format
      if (schema && status === 400 && allowJsonSchema) {
        try {
          const fallback = await withTimeout(
            client.chat.completions.create({
              model,
              messages: [
                ...messages,
                {
                  role: "system",
                  content: "Return ONLY valid JSON for the requested schema."
                }
              ],
              response_format: { type: "json_object" }
            }),
            timeoutMs
          );
          recordSuccess();
          const text = extractContent(fallback);
          return {
            text,
            usageMetadata: {
              totalTokenCount: fallback?.usage?.total_tokens || 0
            }
          };
        } catch (fallbackError) {
          lastError = fallbackError;
          recordFailure();
          const delay = 500 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      lastError = error;
      recordFailure();
      const delay = 500 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logger.error({ error: lastError?.message }, "OpenAI generate failed");
  throw lastError || new Error("OpenAI generate failed");
}

export async function structuredJSONResponse({
  prompt,
  schema,
  model = config.ai?.model || OPENAI_MODEL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  ignoreBreaker = false
}) {
  const result = await generateResponse({ prompt, schema, model, timeoutMs, ignoreBreaker });
  const text = result.text;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    // Attempt to salvage JSON from mixed output.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch {
        throw new Error("Invalid JSON returned from OpenAI");
      }
    } else {
      throw new Error("Invalid JSON returned from OpenAI");
    }
  }

  return {
    data: parsed,
    usageMetadata: result.usageMetadata
  };
}

export function tokenEstimator(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(String(text).length / 4));
}
