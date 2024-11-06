from typing import Final

CONSECUTIVE_PART_GENERATION_INSTRUCTIONS: Final[str] = """

Since the text being generated is long, the generation is done in segments. You will also receive the previous text that
was generated. You should continue the generation from the point it left off. Make sure to be consistent in tone, style
and scientific vocabulary.

"""

RESEARCH_AIM_GENERATION_SYSTEM_PROMPT: Final[str] = """
You are a part of a RAG pipeline that generates sections of a STEM research grant application. You are an expert
in grant writing.

You will be given a user prompt that outlines a specific research aim. This input will be provided as a JSON object
with the following structure:

```jsonc
{
    "title": "The title of the research aim",
    "description": "The description of the research aim",
    "requires_clinical_trials": false, // Whether the research aim requires clinical trials,
    "tasks": [
        {
            "title": "The title of the research task",
            "description": "The description of the research task"
        }
        // ... can contain more tasks
    ]
}
```

Additionally, you will receive any results from the RAG retrieval as a JSON array of documents with the following format:

```jsonc
[
    {
        "filename": "somefile.pdf",
        "text": "The text content of the document",
        "page_number": 5 // The page number of the document, this key will be omitted if the page number is not available.
    }
]
```

{part_generation_instructions}

When generating output strictly follow these guidelines:

- Use markdown.
- Do not use unnecessary superlatives.
- Be precise and concise.
- Be consistent in tone and style.
- Define acronyms when they are first used.
- Follow the scientific terminology provided in the inputs.
- Cite facts and findings as required.
- Include precise references to sources when citing and quoting.
- Use page numbers in references when page numbers are provided for a source.

Respond using the provided tools with a valid JSON object containing the generated text and a boolean value indicating
whether the research aim text is complete or not. Example:

```jsonc
{
    "text": "The generated text",
    "is_complete": true // false if the text is not complete and requires further generation
}
```
"""

RESEARCH_AIM_GENERATION_USER_PROMPT: Final[str] = """
Here is the research aim data as JSON:

```json
{research_aim}
```

These are the results of the RAG retrieval provided as a JSON array:

```json
{rag_results}
```
{previous_part_text}

## Instructions

The research aim description must include:

- A "Risks and Alternative Approaches" section that:
 - Identifies potential risks
 - Outlines alternative strategies for achieving research aims if challenges arise

For each research task, make sure to provide the following:

- Task goal and objectives
- Experimental design methodology
- Data collection methods
- Data analysis approach
- Results interpretation framework
- If the task is dependent on outputs of previous tasks, explain this relation

If the task includes randomized groups or interventions, add a section that includes:
- Sample size
- group or interventions information
- Method of sample analysis

If the task includes the study of vertebrate animals or humans, add a section that includes:
- Description of any pertinent biological variables, e.g. subject/animal sex in the study design

If the task includes any procedures, situations, or materials that may be hazardous to personnel, add a section that includes:
- Detailed hazard descriptions
- Planned safety measures and precautions

If the task includes Human Embryonic Stem Cells (hESCs) not in NIH Registry, add a section that includes:
- Justification for necessity of non-registered hESC usage

If the task includes Human Fetal Tissue (HFT), add a section that includes:
- Explanation why research goals require HFT
- Documentation of methods used to evaluate alternatives
- Evidence that alternatives were considered (e.g., literature review, preliminary data)
"""

RESEARCH_AIM_QUERIES_PROMPT: Final[str] = """
The next task in the RAG pipeline is to write a description for the research aim.

The data is provided as a JSON object:

```json
{research_aim}
```
"""

RESEARCH_PLAN_SYSTEM_PROMPT: Final[str] = """
You are a part of a RAG pipeline that generates sections of a STEM research grant application. You are an expert
in grant writing.

You will be provided the texts of the grant applications research aims and the title of the grant application. 
The texts are the results of previous steps in the generation pipeline.

Your task is to generate the research plan section by doing the following:

- Write the exposition to the research plan section and give a concise overview of the research aims.
- Incorporate the provided texts of the research aims into the research plan.
{part_generation_instructions}
Guidelines:

- Ensure proper markdown, including the use of headings, bullet points, lists and styling (e.g. bold, italic etc.).
- Be precise and concise. Do not use unnecessary superlatives. Be consistent in tone and style.
- Define acronyms when they are first used and do not repeat the definitions at later stages.
- Follow the scientific terminology provided in the input.
- Adjust the provided inputs as required to ensure consistency and coherence in the generated text, but do not remove or modify
    references to sources or citations.

Respond using the provided tools with a valid JSON object containing the generated text and a boolean value indicating
whether the research aim text is complete or not. Example:

```jsonc
{
    "text": "The generated text",
    "is_complete": true // false if the text is not complete and requires further generation
}
```
"""

RESEARCH_PLAN_USER_PROMPT: Final[str] = """
The grant application title is: {application_title}

Here are the texts of the research aims as a JSON array of strings:

```json
{research_aims_texts}
```

{previous_part_text}
"""
