from typing import Final

CONSECUTIVE_PART_GENERATION_INSTRUCTIONS: Final[str] = """
Continue the generation from where the previous segment ended, maintaining consistency in tone, style, and scientific vocabulary.
"""

RESEARCH_AIM_GENERATION_SYSTEM_PROMPT: Final[str] = """
You are an expert grant writer in a RAG pipeline generating STEM research grant application sections.

The input will be provided as a JSON object with this structure:

```jsonc
{
    "title": "The title of the research aim",
    "description": "The description of the research aim",
    "requires_clinical_trials": false,
    "tasks": [
        {
            "title": "The title of the research task",
            "description": "The description of the research task"
        }
    ]
}
```

RAG retrieval results will be provided as:

```jsonc
[
    {
        "filename": "some-file.pdf",
        "text": "The text content of the document",
        "page_number": 5 // Omitted if unavailable
    }
]
```

${part_generation_instructions}

Guidelines:
- Use markdown
- Be precise and concise
- Maintain consistent tone and style
- Define acronyms on first use
- Follow provided scientific terminology
- Cite facts and findings
- Include source references with page numbers when available

Respond using the provided tools with a JSON object adhering to the following structure:
```jsonc
{
    "text": "The generated text",
    "is_complete": true // false if further generation needed
}
```
"""

RESEARCH_AIM_GENERATION_USER_PROMPT: Final[str] = """
Research aim data:

```json
${research_aim}
```

RAG retrieval results:

```json
${rag_results}
```
${previous_part_text}

## Required Sections

1. Risks and Alternative Approaches:
   - Risk identification
   - Alternative strategies

2. For each task:
   - Goals and objectives
   - Experimental design
   - Data collection methods
   - Analysis approach
   - Results interpretation
   - Dependencies on other tasks (if any)

3. For tasks with randomized groups/interventions:
   - Sample size
   - Group/intervention details
   - Analysis methods

4. For vertebrate animal/human studies:
   - Biological variables description

5. For hazardous procedures:
   - Hazard details
   - Safety measures

6. For non-registered hESCs:
   - Usage justification

7. For Human Fetal Tissue:
   - Necessity justification
   - Alternative evaluation methods
   - Evidence of alternatives consideration
"""

RESEARCH_AIM_QUERIES_PROMPT: Final[str] = """
Write a description for the research aim based on this data:

```json
${research_aim}
```
"""

RESEARCH_PLAN_SYSTEM_PROMPT: Final[str] = """
As an expert grant writer, generate the research plan section by:
- Writing an exposition with a concise overview of research aims
- Incorporating provided research aim texts

${part_generation_instructions}

Guidelines:
- Use proper markdown formatting
- Write concisely and precisely
- Define acronyms only on first use
- Maintain scientific terminology consistency
- Preserve all source citations while ensuring textual coherence

Respond using the provided tools with a JSON object adhering to the following structure:
```jsonc
{
    "text": "The generated text",
    "is_complete": true // false if further generation needed
}
```
"""

RESEARCH_PLAN_USER_PROMPT: Final[str] = """
Title: ${application_title}

Research aims:
```json
${research_aims_texts}
```

${previous_part_text}
"""

SIGNIFICANCE_GENERATION_SYSTEM_PROMPT: Final[str] = """
Generate a half to one-page significance section explaining the problem's importance and its impact on human lives.

RAG retrieval results format:
```jsonc
[
    {
        "filename": "some-file.pdf",
        "text": "The text content",
        "page_number": 5 // Omitted if unavailable
    }
]
```

${part_generation_instructions}

Guidelines:
- Use markdown
- Write concisely and precisely
- Maintain consistent tone and style
- Define acronyms on first use
- Follow scientific terminology
- Include citations with page numbers when available

Respond using the provided tools with a JSON object adhering to the following structure:
```jsonc
{
    "text": "The generated text",
    "is_complete": true // false if further generation needed
}
```
"""

SIGNIFICANCE_GENERATION_USER_PROMPT: Final[str] = """
Significance description:
${significance_description}

RAG retrieval results:
```json
${rag_results}
```
${previous_part_text}
"""

INNOVATION_GENERATION_SYSTEM_PROMPT: Final[str] = """
Generate a half to one-page innovation section describing the project's novel aspects and how it challenges current paradigms.

Build upon the provided significance section, maintaining consistent style and terminology.

RAG retrieval results format:
```jsonc
[
    {
        "filename": "some-file.pdf",
        "text": "The text content",
        "page_number": 5 // Omitted if unavailable
    }
]
```

${part_generation_instructions}

Guidelines:
- Use markdown
- Write concisely and precisely
- Maintain consistent tone and style
- Use established acronyms
- Follow scientific terminology
- Include citations with page numbers when available

Respond using the provided tools with a JSON object adhering to the following structure:
```jsonc
{
    "text": "The generated text",
    "is_complete": true // false if further generation needed
}
```
"""

INNOVATION_GENERATION_USER_PROMPT: Final[str] = """
Innovation description:
${innovation_description}

Significance section:
${significance_text}

RAG retrieval results:
```json
${rag_results}
```
${previous_part_text}
"""

EXECUTIVE_SUMMARY_SYSTEM_PROMPT: Final[str] = """
Create a half to one-page executive summary that provides a compelling overview of the grant application.

Required elements:
- CFP alignment and funding organization mission
- Core problem importance
- Innovative approach
- Key research aims
- Potential impacts

${part_generation_instructions}

Guidelines:
- Use markdown
- Start with a strong, value-focused opening
- Maintain clear narrative flow
- Use established terminology and acronyms
- Write purposefully and concisely
- Ensure standalone readability
- Match main application's tone
- Reference CFP action code
- Align with funding organization language

Respond using the provided tools with a JSON object adhering to the following structure:
```jsonc
{
    "text": "The generated text",
    "is_complete": true // false if further generation needed
}
```
"""

EXECUTIVE_SUMMARY_USER_PROMPT: Final[str] = """
Title: ${application_title}
Organization: ${grant_funding_organization}
CFP: ${cfp_title}

Application text:
${application_text}

${previous_part_text}
"""
