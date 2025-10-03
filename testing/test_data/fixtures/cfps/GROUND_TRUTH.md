# CFP Ground Truth - Expected Section Counts

This document defines the expected number of sections for each test CFP to ensure extraction consistency.

## Methodology

Sections are defined as major organizational units in the CFP. These typically correspond to:
- Different award types
- Major requirement categories (eligibility, budget, submission)
- Distinct research areas or topics
- Application process stages

We aim for **granularity that captures all distinct information** without excessive fragmentation.

## Test CFPs

### Melanoma Research Alliance (MRA)

**File**: `testing/test_data/fixtures/cfps/melanoma_alliance.md`

**Expected Sections**: 12-15

**Logical Structure**:
1. Request for Proposals Overview
2. MRA Dermatology Career Development Award
3. Proposal Research Areas (Prevention, Detection, Treatment)
4. General Eligibility and Application Guidelines
5. Young Investigator Awards
6. Team Science Awards
7. Academic-Industry Partnership Award (for Teams)
8. Pilot Awards
9. Special Opportunity Awards - Acral Melanoma
10. Special Opportunity Awards - Brain Metastasis
11. Special Opportunity Awards - Dermatology Technologies
12. Special Opportunity Awards - Immunology
13. Special Opportunity Awards - Radiation Oncology (ASTRO)
14. Special Opportunity Awards - Uveal Melanoma
15. Special Opportunity Awards - UK/Israel
16. Application Process and Requirements
17. Budget Requirements
18. Required Documents
19. Review Process
20. Award Terms and Conditions

**Validation Criteria**:
- Minimum: 12 sections
- Target: 15-18 sections
- Maximum: 25 sections

---

### NIH PAR-25-450

**Expected Sections**: TBD (needs analysis)

---

### Israeli Chief Scientist

**Expected Sections**: TBD (needs analysis)

---

## Consistency Requirements

To ensure reliable extraction:

1. **Minimum Threshold**: If extraction yields < 50% of target, retry with more specific instructions
2. **Iterative Approach**: Up to 3 attempts with progressively more detailed prompts
3. **Quality Validation**: Check that section titles are meaningful and distinct
4. **Completeness Check**: Verify all major topics from CFP are represented
