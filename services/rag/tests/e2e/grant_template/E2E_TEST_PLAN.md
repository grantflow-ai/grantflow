# E2E Test Plan for Grant Template Pipeline Stages

## Overview

This document outlines the E2E testing strategy for validating Stage 2 (extract_sections) and Stage 3 (generate_metadata) of the grant template pipeline. These tests complement the existing CFP analysis (Stage 1) tests and ensure quality across the entire pipeline.

## Current E2E Test Coverage

### Stage 1: CFP Analysis ✅ IMPLEMENTED
- **Test Files**:
  - `nih_par_25_450_cfp_extraction_test.py`
  - `mra_cfp_extraction_test.py`
  - `israeli_chief_scientist_cfp_extraction_test.py`
  - `nih_remaining_cfps_extraction_test.py`
  - `identify_organization_e2e_test.py`

- **Test Pattern**: Three tests per CFP type:
  1. Stage-specific extraction test (e.g., `test_mra_cfp_extraction_end_to_end`)
  2. Full pipeline test (e.g., `test_mra_cfp_template_generation_pipeline`)
  3. Structure validation test (e.g., `test_mra_cfp_section_structure_validation`)

- **Key Validations**:
  - Organization identification accuracy
  - Content section extraction completeness
  - Requirements analysis quality
  - Constraint extraction accuracy
  - Subject and metadata correctness

## Planned E2E Test Coverage

### Stage 2: Extract Sections 🚧 TO BE IMPLEMENTED

#### Purpose
Validate that the extract_sections stage correctly:
1. Filters and processes hierarchical sections from CFP analysis
2. Matches CFP constraints to section titles (fuzzy matching)
3. Extracts and attaches relevant guidelines to sections
4. Generates concise definitions from guidelines
5. Preserves all CFP constraint data (length_limit, length_source, other_limits)

#### Test Files to Create

**1. `extract_sections_quality_test.py`**
- Tests constraint matching accuracy across different CFP types
- Validates guideline extraction completeness
- Verifies definition generation quality
- Ensures field preservation (length_limit, guidelines, other_limits)

#### Test Structure

```python
@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=600)
async def test_extract_sections_constraint_matching_nih(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_grant_template_with_rag_source: GrantTemplate,
    mock_job_manager: AsyncMock,
) -> None:
    """Test constraint matching for NIH PAR-25-450 CFP."""
    # Run CFP analysis
    cfp_analysis = await handle_cfp_analysis(...)

    # Run extract_sections
    extracted_sections = await handle_extract_sections(
        grant_template=grant_template,
        cfp_analysis=cfp_analysis,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="extract-sections-constraint-test",
    )

    # Validate constraints were matched
    sections_with_constraints = [
        s for s in extracted_sections
        if "length_limit" in s and s["length_limit"] is not None
    ]

    # NIH CFPs typically have constraints for most sections
    assert len(sections_with_constraints) >= 3, \
        f"Should match constraints to sections: {len(sections_with_constraints)}"

    # Validate constraint data completeness
    for section in sections_with_constraints:
        assert "length_source" in section, f"Section missing length_source: {section['title']}"
        assert section["length_source"], f"length_source should not be empty: {section['title']}"

        # Validate constraint value is reasonable (not 0 or negative)
        assert section["length_limit"] > 0, \
            f"Invalid length_limit for {section['title']}: {section['length_limit']}"
```

#### Key Validations for Extract Sections

1. **Constraint Matching Accuracy**
   - ✅ All CFP constraints matched to appropriate sections (100% match rate)
   - ✅ Fuzzy matching threshold (0.6) produces accurate results
   - ✅ Substring matching catches edge cases
   - ✅ Constraint conversion (pages/chars → words) is accurate

2. **Guideline Extraction Completeness**
   - ✅ Long-form sections have guidelines attached
   - ✅ Guidelines contain relevant CFP text excerpts
   - ✅ Guidelines are unique (no duplicates)
   - ✅ Guidelines array length is reasonable (3-10 items typically)

3. **Definition Generation Quality**
   - ✅ Definition field is populated for sections with guidelines
   - ✅ Single guideline: definition equals guideline
   - ✅ 2-3 guidelines: definition uses first guideline
   - ✅ 4+ guidelines: definition includes summary text ("Plus X additional requirements")
   - ✅ Definition length is concise (< 200 chars typically)

4. **Field Preservation**
   - ✅ All ExtractedSectionDTO fields are populated correctly
   - ✅ length_limit, length_source, other_limits are preserved
   - ✅ guidelines array is preserved
   - ✅ definition is preserved

#### Test Data Requirements

**Fixtures Needed** (in `conftest.py`):

```python
@pytest.fixture
def expected_nih_par_25_450_constraints() -> dict[str, dict[str, Any]]:
    """Expected constraints for NIH PAR-25-450 sections."""
    return {
        "Specific Aims": {
            "length_limit": 250,  # 1 page = 250 words
            "length_source": "one-page maximum",
            "constraint_type": "page_limit",
        },
        "Research Strategy": {
            "length_limit": 3000,  # 12 pages = 3000 words
            "length_source": "12-page maximum",
            "constraint_type": "page_limit",
        },
        # ... more sections
    }

@pytest.fixture
def expected_mra_constraints() -> dict[str, dict[str, Any]]:
    """Expected constraints for MRA CFP sections."""
    return {
        "Research Plan": {
            "length_limit": 1500,  # 6 pages
            "length_source": "6-page maximum",
            "constraint_type": "page_limit",
        },
        # ... more sections
    }
```

**Assertion Helpers**:

```python
def validate_constraint_match(
    section: ExtractedSectionDTO,
    expected_constraint: dict[str, Any],
    tolerance: float = 0.1,  # 10% tolerance
) -> None:
    """Validate constraint matches expected values within tolerance."""
    assert "length_limit" in section, f"Section missing length_limit: {section['title']}"

    actual_limit = section["length_limit"]
    expected_limit = expected_constraint["length_limit"]

    # Allow 10% tolerance for conversion differences
    lower_bound = expected_limit * (1 - tolerance)
    upper_bound = expected_limit * (1 + tolerance)

    assert lower_bound <= actual_limit <= upper_bound, \
        f"Constraint mismatch for {section['title']}: expected {expected_limit}, got {actual_limit}"
```

---

### Stage 3: Generate Metadata 🚧 TO BE IMPLEMENTED

#### Purpose
Validate that the generate_metadata stage correctly:
1. Generates LLM metadata (keywords, topics, search_queries, dependencies)
2. Merges ExtractedSectionDTO with SectionMetadata into GrantLongFormSection
3. Preserves both CFP constraints (length_limit) and LLM recommendations (max_words)
4. Detects and logs conflicts between CFP and LLM length values
5. Maintains all enrichment data from extract_sections stage

#### Test Files to Create

**1. `generate_metadata_quality_test.py`**
- Tests LLM metadata generation quality
- Validates section merging preserves all fields
- Verifies conflict detection and logging
- Ensures both max_words and length_limit are populated

#### Test Structure

```python
@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_generate_metadata_field_preservation_nih(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_grant_template_with_rag_source: GrantTemplate,
    mock_job_manager: AsyncMock,
) -> None:
    """Test that generate_metadata preserves all fields from extract_sections."""
    # Run CFP analysis + extract_sections
    cfp_analysis = await handle_cfp_analysis(...)
    extracted_sections = await handle_extract_sections(...)

    # Run generate_metadata
    grant_sections = await handle_generate_grant_template_metadata(
        extracted_sections=extracted_sections,
        cfp_content=cfp_analysis.content,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="generate-metadata-preservation-test",
    )

    # Validate field preservation for each section
    for grant_section in grant_sections:
        if not grant_section.get("long_form"):
            continue

        # Find corresponding extracted section
        extracted = next(
            s for s in extracted_sections
            if s["id"] == grant_section["id"]
        )

        # Validate CFP constraint fields are preserved
        if "length_limit" in extracted and extracted["length_limit"]:
            assert "length_limit" in grant_section, \
                f"length_limit missing for {grant_section['title']}"
            assert grant_section["length_limit"] == extracted["length_limit"], \
                f"length_limit changed: {extracted['length_limit']} → {grant_section['length_limit']}"

        # Validate LLM metadata is present
        assert "max_words" in grant_section, f"max_words missing for {grant_section['title']}"
        assert grant_section["max_words"] > 0, \
            f"max_words should be positive: {grant_section['max_words']}"

        # Validate guidelines are preserved
        if "guidelines" in extracted and extracted["guidelines"]:
            assert "guidelines" in grant_section, \
                f"guidelines missing for {grant_section['title']}"
            assert grant_section["guidelines"] == extracted["guidelines"], \
                f"guidelines changed for {grant_section['title']}"
```

#### Key Validations for Generate Metadata

1. **LLM Metadata Quality**
   - ✅ Keywords are relevant and specific (3-10 keywords per section)
   - ✅ Topics are diverse and comprehensive (3-7 topics per section)
   - ✅ Search queries are actionable (3-7 queries per section)
   - ✅ Dependencies reference valid section IDs
   - ✅ max_words is reasonable for section complexity (50-3000 typical range)

2. **Section Merging Correctness**
   - ✅ All ExtractedSectionDTO fields are preserved in GrantLongFormSection
   - ✅ All SectionMetadata fields are added to GrantLongFormSection
   - ✅ No fields are overwritten or lost during merge
   - ✅ Field types remain consistent (int → int, list → list)

3. **Dual-Field Preservation**
   - ✅ Both max_words (LLM) and length_limit (CFP) are populated when CFP constraint exists
   - ✅ max_words is always populated for long-form sections
   - ✅ length_limit is populated only when CFP specifies constraint
   - ✅ Application generation can use length_limit with max_words fallback

4. **Conflict Detection**
   - ✅ Warns when length_limit < max_words * 0.7 (CFP more restrictive)
   - ✅ Warns when length_limit > max_words * 1.5 (CFP more generous)
   - ✅ Warning logs include section title, both values, and percentage difference
   - ✅ Conflicts are informational, not blocking

#### Test Data Requirements

**Fixtures Needed** (in `conftest.py`):

```python
@pytest.fixture
def expected_nih_metadata_quality() -> dict[str, dict[str, Any]]:
    """Expected metadata quality metrics for NIH sections."""
    return {
        "keywords_count": {"min": 3, "max": 10},
        "topics_count": {"min": 3, "max": 7},
        "search_queries_count": {"min": 3, "max": 7},
        "max_words_range": {"min": 50, "max": 3000},
    }

@pytest.fixture
def expected_conflict_sections() -> list[dict[str, Any]]:
    """Sections expected to have LLM vs CFP length conflicts."""
    return [
        {
            "title": "Specific Aims",
            "expected_max_words": 300,  # LLM recommendation
            "expected_length_limit": 250,  # CFP constraint (1 page)
            "conflict_reason": "CFP more restrictive than LLM",
        },
        # ... more conflicting sections
    ]
```

**Assertion Helpers**:

```python
def validate_metadata_quality(
    section: GrantLongFormSection,
    quality_metrics: dict[str, dict[str, int]],
) -> None:
    """Validate LLM metadata quality meets expected ranges."""
    # Validate keywords
    keywords = section.get("keywords", [])
    assert quality_metrics["keywords_count"]["min"] <= len(keywords) <= quality_metrics["keywords_count"]["max"], \
        f"Unexpected keyword count for {section['title']}: {len(keywords)}"

    # Validate topics
    topics = section.get("topics", [])
    assert quality_metrics["topics_count"]["min"] <= len(topics) <= quality_metrics["topics_count"]["max"], \
        f"Unexpected topic count for {section['title']}: {len(topics)}"

    # Validate max_words
    max_words = section.get("max_words", 0)
    assert quality_metrics["max_words_range"]["min"] <= max_words <= quality_metrics["max_words_range"]["max"], \
        f"Unexpected max_words for {section['title']}: {max_words}"

def validate_dual_field_preservation(
    section: GrantLongFormSection,
    has_cfp_constraint: bool = True,
) -> None:
    """Validate both max_words and length_limit are present when expected."""
    # max_words should always be present for long-form sections
    assert "max_words" in section, f"max_words missing for {section['title']}"
    assert section["max_words"] > 0, f"max_words invalid for {section['title']}"

    if has_cfp_constraint:
        # When CFP specifies constraint, both fields should be present
        assert "length_limit" in section, f"length_limit missing for {section['title']}"
        assert section["length_limit"] > 0, f"length_limit invalid for {section['title']}"
        assert "length_source" in section, f"length_source missing for {section['title']}"
```

---

## Test Execution Strategy

### Test Organization

```
services/rag/tests/e2e/grant_template/
├── conftest.py                              # Shared fixtures
├── E2E_TEST_PLAN.md                         # This document
│
# Stage 1 (CFP Analysis) - ✅ IMPLEMENTED
├── identify_organization_e2e_test.py        # Organization identification
├── nih_par_25_450_cfp_extraction_test.py    # NIH PAR-25-450 CFP analysis
├── mra_cfp_extraction_test.py               # MRA CFP analysis
├── israeli_chief_scientist_cfp_extraction_test.py  # Israeli CFP analysis
├── nih_remaining_cfps_extraction_test.py    # Other NIH CFPs
│
# Stage 2 (Extract Sections) - 🚧 TO BE IMPLEMENTED
├── extract_sections_quality_test.py         # Constraint matching + enrichment
│
# Stage 3 (Generate Metadata) - 🚧 TO BE IMPLEMENTED
├── generate_metadata_quality_test.py        # Metadata generation + merging
│
# Integration (Full Pipeline) - ✅ PARTIALLY IMPLEMENTED
├── nih_par_25_450_cfp_extraction_test.py    # Contains full pipeline test
├── mra_cfp_extraction_test.py               # Contains full pipeline test
```

### Performance Test Categories

- **QUALITY** (`TestExecutionSpeed.QUALITY`): 2-5 minutes
  - Structure validation tests
  - Constraint matching tests
  - Metadata quality tests

- **E2E_FULL** (`TestExecutionSpeed.E2E_FULL`): 10-20 minutes
  - Full pipeline tests
  - Field preservation tests
  - Integration tests

### Test Execution Commands

```bash
# Run all E2E tests for grant template pipeline
E2E_TESTS=1 pytest services/rag/tests/e2e/grant_template/ -v --tb=short

# Run only QUALITY tests (faster feedback)
E2E_TESTS=1 pytest services/rag/tests/e2e/grant_template/ -m "quality_assessment" -v

# Run only E2E_FULL tests (comprehensive)
E2E_TESTS=1 pytest services/rag/tests/e2e/grant_template/ -m "e2e_full" -v

# Run specific stage tests
E2E_TESTS=1 pytest services/rag/tests/e2e/grant_template/extract_sections_quality_test.py -v
E2E_TESTS=1 pytest services/rag/tests/e2e/grant_template/generate_metadata_quality_test.py -v

# Run single test for debugging
E2E_TESTS=1 pytest services/rag/tests/e2e/grant_template/extract_sections_quality_test.py::test_extract_sections_constraint_matching_nih -xvs
```

---

## Implementation Checklist

### Phase 1: Fixtures and Helpers ⬜
- [ ] Add `expected_nih_par_25_450_constraints` fixture
- [ ] Add `expected_mra_constraints` fixture
- [ ] Add `expected_nih_metadata_quality` fixture
- [ ] Add `expected_conflict_sections` fixture
- [ ] Create `validate_constraint_match()` helper
- [ ] Create `validate_metadata_quality()` helper
- [ ] Create `validate_dual_field_preservation()` helper

### Phase 2: Extract Sections Tests ⬜
- [ ] Create `extract_sections_quality_test.py`
- [ ] Implement `test_extract_sections_constraint_matching_nih()`
- [ ] Implement `test_extract_sections_constraint_matching_mra()`
- [ ] Implement `test_extract_sections_guideline_extraction_nih()`
- [ ] Implement `test_extract_sections_definition_generation_nih()`
- [ ] Implement `test_extract_sections_field_preservation_nih()`
- [ ] Validate all tests pass with E2E_TESTS=1

### Phase 3: Generate Metadata Tests ⬜
- [ ] Create `generate_metadata_quality_test.py`
- [ ] Implement `test_generate_metadata_field_preservation_nih()`
- [ ] Implement `test_generate_metadata_field_preservation_mra()`
- [ ] Implement `test_generate_metadata_quality_nih()`
- [ ] Implement `test_generate_metadata_conflict_detection_nih()`
- [ ] Implement `test_generate_metadata_dual_field_preservation_nih()`
- [ ] Validate all tests pass with E2E_TESTS=1

### Phase 4: Documentation and Review ⬜
- [ ] Update conftest.py docstrings
- [ ] Add inline comments for complex assertions
- [ ] Review test coverage with team
- [ ] Add CI integration for new E2E tests
- [ ] Update README with new test documentation

---

## Success Criteria

### Extract Sections Tests
- ✅ Constraint matching accuracy: 100% (all CFP constraints matched to sections)
- ✅ Guideline extraction completeness: >90% (most long-form sections have guidelines)
- ✅ Definition generation quality: 100% (all sections with guidelines have definitions)
- ✅ Field preservation: 100% (all ExtractedSectionDTO fields preserved)

### Generate Metadata Tests
- ✅ Metadata quality: Keywords/topics/queries meet expected ranges
- ✅ Section merging: 100% field preservation during merge
- ✅ Dual-field preservation: Both max_words and length_limit present when expected
- ✅ Conflict detection: Warnings logged for >30% differences

### Overall Pipeline Quality
- ✅ Zero regressions: All existing functionality preserved
- ✅ Test execution time: QUALITY tests <5min, E2E_FULL tests <20min
- ✅ Test reliability: >95% pass rate on CI
- ✅ Coverage: >90% of extract_sections and generate_metadata code paths tested

---

## Notes and Considerations

### CFP Variability
Different CFPs have different constraint patterns:
- **NIH**: Well-defined page limits for most sections
- **MRA**: Fewer constraints, more flexible format
- **Israeli**: HTML-based, may have different constraint format

Tests should account for this variability and validate that constraint matching works across different CFP types.

### Fuzzy Matching Threshold
Current threshold is 0.6. Tests should validate this produces accurate results. If tests reveal issues:
- Consider adjusting threshold (e.g., 0.7 for stricter matching)
- Add logging to track matching confidence scores
- Create test cases for edge cases (partial matches, similar section names)

### LLM Variability
LLM-generated metadata may vary across runs. Tests should:
- Use reasonable ranges rather than exact values
- Focus on quality metrics (relevance, completeness) not exact content
- Allow for variation in keyword/topic selection
- Validate structure and presence of fields, not exact values

### Performance Considerations
E2E tests involve real LLM calls and database operations:
- Use performance_test decorator to track execution time
- Set reasonable timeouts (600-1800s)
- Mock LLM calls in QUALITY tests where appropriate
- Reserve real LLM calls for E2E_FULL tests

---

## Future Enhancements

### Test Coverage Expansion
- [ ] Add tests for edge cases (empty constraints, malformed CFPs)
- [ ] Add tests for different granting institutions (NSF, ERC, NASA)
- [ ] Add regression tests for previously failing CFPs
- [ ] Add stress tests with large CFPs (50+ sections)

### Quality Metrics
- [ ] Track constraint matching accuracy over time
- [ ] Monitor LLM metadata quality trends
- [ ] Measure test execution time and optimize slow tests
- [ ] Create test coverage reports for visualization

### Automation
- [ ] Add pre-commit hooks for E2E tests
- [ ] Create nightly CI job for full E2E suite
- [ ] Generate test reports with quality metrics
- [ ] Alert on test failures or quality degradation
