---
priority: medium
---

# Gemini & Claude LLM Integration

**Gemini Flash 2.5 · Claude Sonnet · Structured output · Token optimization**

- Gemini: 1M context window, Flash 2.5 for cost efficiency
- Claude Sonnet: specialized reasoning for complex tasks
- JSON Schema Design (official best practices):
  * Short property names: name, type, source, quote (NOT verbose names)
  * Max 2 levels nesting; flatten arrays where possible
  * 2-6 required fields per object; use NotRequired for optional
  * Object arrays over tuples: [{source, target}] not [[s,t]]
  * Descriptions: 1-2 sentences max in schema; move details to prompts
  * Strategic constraints: minItems/maxItems (3-10), avoid over-constraining
  * Property ordering must match example order in prompts
- Prompt engineering (Gemini guidelines):
  * Clear, concise instructions (say once, no repetition)
  * NO JSON examples in prompts (schema provides structure)
  * Hierarchical: ## headers, numbered lists
  * Target <100 lines complex, <50 lines simple
  * No ALL CAPS, no emoji warnings, no contradictions
  * Use model's thinking mode; don't prescribe chain-of-thought
- Transformation layer: convert optimized schemas to DB format
- Retry logic: exponential backoff, handle rate limits gracefully
