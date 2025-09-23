# CFP Analysis Pipeline Architecture

## Overview

The CFP (Call for Proposals) analysis pipeline transforms grant CFP documents into structured templates with metadata for the frontend.

## Pipeline Flow

```
Full CFP Text (79K+ chars)
    ↓
1. NLP Semantic Analysis (spaCy)
    ↓
2. CFP Analysis (Gemini)
   → Sections, Requirements, Length Constraints, Evaluation Criteria
    ↓
3. Section Extraction (Claude)
   → Template Structure with Hierarchy
    ↓
4. Metadata Generation (Gemini)
   → Keywords, Topics, Instructions, Search Queries
    ↓
Frontend JSON Response
```

## Critical Requirements

### 1. Full Text Input
**CRITICAL**: CFP analyzer MUST receive full CFP text, NOT summaries.

```python
# ✅ CORRECT
cfp_full_text = cfp_file_path.read_text(encoding="utf-8")
cfp_analysis = await handle_analyze_cfp(
    full_cfp_text=cfp_full_text,
    trace_id=trace_id,
)

# ❌ WRONG - Summary text loses section details
cfp_summary = "\n".join(
    f"{content['title']}: {' '.join(content['subtitles'])}"
    for content in extraction["content"]
)
```

### 2. CFP Analysis as Primary Source
Section structure comes from CFP analysis, not generic extraction.

```python
# Use CFP analysis sections as PRIMARY source
cfp_required_sections = [
    {
        "section_name": section["section_name"],
        "requirements": section["requirements"],
        "requirement_count": len(section["requirements"])
    }
    for section in cfp_analysis["required_sections"]
]
```

## Data Schema

### CFP Analysis Output
```python
{
    "required_sections": [
        {
            "section_name": "Project Description",
            "requirements": [
                {
                    "requirement": "5 pages maximum",
                    "category": "formatting",
                    "quote": "Project Description: 5 pages maximum..."
                }
            ]
        }
    ],
    "length_constraints": [
        {
            "section": "Project Description",
            "constraint": "5 pages maximum",
            "quote": "Project Description: 5 pages maximum..."
        }
    ],
    "evaluation_criteria": [
        {
            "criterion": "Overall Scientific and Clinical Importance",
            "weight": "33%",
            "description": "..."
        }
    ]
}
```

### Frontend Response Schema
```typescript
interface GrantSection {
  id: string;
  title: string;
  order: number;
  parent_id: string | null;
  is_long_form: boolean;
  is_title_only: boolean;
  is_detailed_research_plan: boolean;
  cfp_source: string;

  // Metadata (for long-form sections only)
  max_words?: number;
  length_constraint_source?: string;
  keywords?: string[];
  topics?: string[];
  generation_instructions?: string;
  search_queries?: string[];
  depends_on?: string[];
  cfp_requirements_addressed?: Array<{
    requirement: string;
    category: string;
    quote: string;
  }>;
}

interface GrantTemplate {
  grant_sections: GrantSection[];
}
```

## Metadata Generation Schema

### Gemini Schema (CRITICAL)
The `cfp_requirements_addressed` field MUST have complete properties:

```python
{
    "type": "object",
    "properties": {
        "max_words": {"type": "integer"},
        "keywords": {
            "type": "array",
            "items": {"type": "string"}
        },
        "topics": {
            "type": "array",
            "items": {"type": "string"}
        },
        "generation_instructions": {"type": "string"},
        "search_queries": {
            "type": "array",
            "items": {"type": "string"}
        },
        "depends_on": {
            "type": "array",
            "items": {"type": "string"}
        },
        "cfp_requirements_addressed": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "requirement": {"type": "string"},
                    "category": {"type": "string"},
                    "quote": {"type": "string"}
                },
                "required": ["requirement", "category", "quote"]
            }
        },
        "length_constraint_source": {"type": "string"}
    },
    "required": ["max_words", "keywords", "topics", "generation_instructions"]
}
```

## Length Constraint Conversion

### Pages to Words
- **Times New Roman 12pt**: 415 words/page
- **Arial 11pt**: 500 words/page
- **Figure adjustment**: Multiply by 0.875 if excluding figures

```python
def convert_page_constraint_to_words(pages: int, exclude_figures: bool = False) -> int:
    words_per_page = 437.5  # Average of TNR and Arial
    words = int(pages * words_per_page)
    if exclude_figures:
        words = int(words * 0.875)
    return words

# Example: "5 pages maximum" → 2,188 words (with figure exclusion)
```

### Characters to Words
```python
def convert_char_constraint_to_words(chars: int) -> int:
    return chars // 7.5  # Average word length + space

# Example: "2,000 characters" → 266 words
```

## Prompt Templates

### Section Extraction Prompt
```python
CFP_BASED_SECTION_EXTRACTION_PROMPT = PromptTemplate(
    template="""
    <cfp_required_sections>${cfp_required_sections}</cfp_required_sections>

    CRITICAL: Use these CFP sections as your PRIMARY source for structure.

    For each CFP required section:
    1. Create matching template sections
    2. Use exact section names from CFP
    3. Preserve requirement relationships
    4. Mark research-plan sections appropriately
    """
)
```

### Metadata Generation Prompt
```python
CFP_BASED_METADATA_PROMPT = PromptTemplate(
    template="""
    <cfp_analysis>
    Required Sections: ${cfp_required_sections}
    Length Constraints: ${length_constraints}
    Evaluation Criteria: ${evaluation_criteria}
    </cfp_analysis>

    For each section, generate metadata using CFP analysis:
    - max_words: From CFP length constraints
    - keywords: From CFP evaluation criteria
    - topics: From CFP requirements
    - generation_instructions: With CFP quotes and criteria
    - cfp_requirements_addressed: Array of {requirement, category, quote}
    """
)
```

## Example Results

### MRA CFP Analysis
- **Full CFP Text**: 79,663 characters
- **NLP Sentences**: 2,060 sentences analyzed
- **CFP Sections Found**: 30 sections
- **Total Requirements**: 74 requirements
- **Length Constraints**: 8 constraints
- **Evaluation Criteria**: 3 criteria (33% each)

### Template Sections Generated
- **Total Sections**: 25 sections
- **Long-Form Sections**: 7 sections (require metadata)
- **Title-Only Sections**: 3 sections (organizational)
- **Non-Long-Form Sections**: 15 sections (forms, uploads)

### Long-Form Sections with Metadata
1. **LOI Document** (500 words, 1 page from CFP)
2. **Data and Renewable Reagent Sharing Plan** (750 words)
3. **Abstracts and Keywords** (266 words, 2,000 chars from CFP)
4. **Budget Summary and Justification** (500 words, 2,000 chars from CFP)
5. **Project Description** (2,188 words, 5 pages from CFP)
6. **Clinical Trial Protocol Synopsis** (1,000 words)
7. **Statement of Fit Within MRA's Research Program** (600 words)

## Implementation Checklist

- [ ] Use full CFP text (not summary) for analysis
- [ ] Pass CFP analysis to section extraction
- [ ] Pass CFP analysis to metadata generation
- [ ] Include complete Gemini schema for cfp_requirements_addressed
- [ ] Convert page/character constraints to words
- [ ] Include CFP source quotes for verification
- [ ] Mark research-plan sections appropriately
- [ ] Preserve section hierarchy from CFP