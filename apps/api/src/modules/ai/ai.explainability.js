export function buildExplainability({
  reasoning = null,
  keySignals = [],
  dataQuality = "medium",
  dataScope = {}
} = {}) {
  return {
    reasoning,
    keySignals,
    dataQuality,
    dataScope
  };
}
