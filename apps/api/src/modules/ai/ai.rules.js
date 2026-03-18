import { AI_LIMITS } from "./ai.model.js";

const SYSTEM_PROMPT = `You are an enterprise AI operating inside a multi-tenant SaaS.
You are not a general chatbot.
You only use provided structured tenant data.
If data missing, respond with insufficient_data.
Never hallucinate.
Always return valid JSON.
Always include fields: status, data, explanation, reasoning.
Always include explanation field.
Always include reasoning field.`;

const DISALLOWED_PATTERNS = [
  /\bpolitic(s|al)?\b/i,
  /\bmedical\b/i,
  /\bdiagnos(e|is)\b/i,
  /\bwho\s+is\b/i,
  /\bwhat\s+is\b/i,
  /\bcapital\s+of\b/i,
  /\bpresident\s+of\b/i,
  /\bprime\s+minister\b/i,
  /\bcelebrity\b/i
];

const PII_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /\b(?:\d[ -]*?){13,16}\b/g,
  /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?){1}\d{3}[-.\s]?\d{4}/g
];

export function sanitizePrompt(prompt) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Invalid prompt");
  }
  return prompt.trim().slice(0, AI_LIMITS.maxPromptChars);
}

export function redactPII(text) {
  if (!text || typeof text !== "string") return text;
  let redacted = text;
  for (const pattern of PII_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted;
}

export function redactPIIInObject(value) {
  if (typeof value === "string") return redactPII(value);
  if (Array.isArray(value)) return value.map(redactPIIInObject);
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, val] of Object.entries(value)) {
      next[key] = redactPIIInObject(val);
    }
    return next;
  }
  return value;
}

export function isDisallowedQuery(query) {
  if (!query) return false;
  return DISALLOWED_PATTERNS.some((pattern) => pattern.test(query));
}

export function buildSystemPrompt() {
  return SYSTEM_PROMPT;
}

const compactValue = (value) => {
  if (typeof value === "string") return value.slice(0, 1000);
  if (Array.isArray(value)) return value.slice(0, 50).map(compactValue);
  if (value && typeof value === "object") {
    const limited = {};
    for (const [key, val] of Object.entries(value).slice(0, 50)) {
      limited[key] = compactValue(val);
    }
    return limited;
  }
  return value;
};

export function buildPrompt({ query, contextData }) {
  const compact = compactValue(contextData || {});
  const contextJson = JSON.stringify(compact);
  return `${SYSTEM_PROMPT}\n\nUSER_QUERY:\n${query}\n\nTENANT_DATA:\n${contextJson}\n\nMaximum token limit: ${AI_LIMITS.maxTokensPerRequest}\nReturn JSON only.`;
}

export function ensureTenantContext({ contextData }) {
  if (!contextData || (typeof contextData === "object" && Object.keys(contextData).length === 0)) {
    return {
      allowed: false,
      reason: "insufficient_data"
    };
  }
  return { allowed: true };
}
