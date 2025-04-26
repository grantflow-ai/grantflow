from typing import Final

from services.backend.src.utils.prompt_template import PromptTemplate

ORGANIZATION_GUIDELINES_FRAGMENT: Final[PromptTemplate] = PromptTemplate(
    name="organization_fragment",
    template="""
The grant application is for a funding opportunity offered by the ${organization_full_name} (${organization_abbreviation}):

These are retrieval results for the organization application writing guidelines from our database:

### Organization Guidelines
    <rag_results>
    ${rag_results}
    </rag_results>

If these guidelines are available (non-empty JSON array):
- Treat them as the PRIMARY and AUTHORITATIVE source
- Use the announcement content for additional context only
- Organization guidelines take precedence over CFP in case of conflicts
- Pay special attention to:
  - Organization-specific section naming conventions
  - Required section hierarchies and dependencies
  - Mandatory sections that must be included
  - Special formatting or content requirements
  - Organization-specific terminology for workplan sections

If no organization guidelines are available, use the CFP as the primary source for guidelines.

Remember that different funding organizations often use different terminology for the same concepts (e.g., "Research Strategy" at NIH vs "Research Plan" at NSF). Correctly map these equivalent sections despite terminology differences.
""",
)
