import { executeAI } from "./ai.service.js";
import { buildExplainability } from "./ai.explainability.js";

export async function generateSummary({
  tenantId,
  userId,
  entityType,
  entityId,
  data,
  feature = "summary"
}) {
  const prompt = `Summarize the following ${entityType} data in 3-5 bullets.`;
  const schema = {
    type: "object",
    properties: {
      bullets: { type: "array", items: { type: "string" } }
    },
    required: ["bullets"]
  };

  return executeAI({
    tenantId,
    userId,
    type: `${entityType}.summary`,
    feature,
    prompt,
    contextData: data,
    schema,
    storeInsight: true,
    entityType,
    entityId,
    metadata: {
      explainability: buildExplainability({
        reasoning: "Summary generated from tenant data",
        dataScope: { entityType }
      })
    }
  });
}
