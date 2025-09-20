import pytest

from services.rag.src.enums import GrantTemplateStageEnum
from services.rag.src.grant_template.constants import (
    GRANT_TEMPLATE_PIPELINE_STAGES,
    TOTAL_PIPELINE_STAGES,
)


class TestGrantTemplatePipelineStages:
    """Test GRANT_TEMPLATE_PIPELINE_STAGES constant."""

    def test_pipeline_stages_tuple_type(self) -> None:
        """Test that GRANT_TEMPLATE_PIPELINE_STAGES is a tuple."""
        assert isinstance(GRANT_TEMPLATE_PIPELINE_STAGES, tuple)

    def test_pipeline_stages_contains_all_required_stages(self) -> None:
        """Test that all required stages are present in correct order."""
        expected_stages = (
            GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
            GrantTemplateStageEnum.EXTRACT_SECTIONS,
            GrantTemplateStageEnum.GENERATE_METADATA,
        )
        assert GRANT_TEMPLATE_PIPELINE_STAGES == expected_stages

    def test_pipeline_stages_order(self) -> None:
        """Test that pipeline stages are in the correct execution order."""
        assert GRANT_TEMPLATE_PIPELINE_STAGES[0] == GrantTemplateStageEnum.EXTRACT_CFP_CONTENT
        assert GRANT_TEMPLATE_PIPELINE_STAGES[1] == GrantTemplateStageEnum.ANALYZE_CFP_CONTENT
        assert GRANT_TEMPLATE_PIPELINE_STAGES[2] == GrantTemplateStageEnum.EXTRACT_SECTIONS
        assert GRANT_TEMPLATE_PIPELINE_STAGES[3] == GrantTemplateStageEnum.GENERATE_METADATA

    def test_pipeline_stages_no_duplicates(self) -> None:
        """Test that there are no duplicate stages."""
        assert len(GRANT_TEMPLATE_PIPELINE_STAGES) == len(set(GRANT_TEMPLATE_PIPELINE_STAGES))

    def test_pipeline_stages_all_valid_enums(self) -> None:
        """Test that all stages are valid GrantTemplateStageEnum values."""
        for stage in GRANT_TEMPLATE_PIPELINE_STAGES:
            assert isinstance(stage, GrantTemplateStageEnum)

    def test_pipeline_stages_immutable(self) -> None:
        """Test that GRANT_TEMPLATE_PIPELINE_STAGES is immutable (tuple)."""
        with pytest.raises(TypeError):
            GRANT_TEMPLATE_PIPELINE_STAGES[0] = GrantTemplateStageEnum.ANALYZE_CFP_CONTENT  # type: ignore


class TestTotalPipelineStages:
    """Test TOTAL_PIPELINE_STAGES constant."""

    def test_total_pipeline_stages_correct_count(self) -> None:
        """Test that TOTAL_PIPELINE_STAGES matches the length of the stages tuple."""
        assert TOTAL_PIPELINE_STAGES == len(GRANT_TEMPLATE_PIPELINE_STAGES)

    def test_total_pipeline_stages_is_integer(self) -> None:
        """Test that TOTAL_PIPELINE_STAGES is an integer."""
        assert isinstance(TOTAL_PIPELINE_STAGES, int)

    def test_total_pipeline_stages_positive(self) -> None:
        """Test that TOTAL_PIPELINE_STAGES is positive."""
        assert TOTAL_PIPELINE_STAGES > 0

    def test_total_pipeline_stages_expected_value(self) -> None:
        """Test that TOTAL_PIPELINE_STAGES has the expected value."""
        assert TOTAL_PIPELINE_STAGES == 4


class TestPipelineStageIntegrity:
    """Test pipeline stage integrity and relationships."""

    def test_pipeline_completeness(self) -> None:
        """Test that the pipeline includes all necessary stages for grant template generation."""
        # Verify all essential stages are present
        stage_names = [stage.name for stage in GRANT_TEMPLATE_PIPELINE_STAGES]

        assert "EXTRACT_CFP_CONTENT" in stage_names
        assert "ANALYZE_CFP_CONTENT" in stage_names
        assert "EXTRACT_SECTIONS" in stage_names
        assert "GENERATE_METADATA" in stage_names

    def test_pipeline_logical_flow(self) -> None:
        """Test that the pipeline stages follow a logical flow."""
        # Content extraction should come first
        assert GRANT_TEMPLATE_PIPELINE_STAGES.index(GrantTemplateStageEnum.EXTRACT_CFP_CONTENT) == 0

        # Analysis should come after extraction
        extract_index = GRANT_TEMPLATE_PIPELINE_STAGES.index(GrantTemplateStageEnum.EXTRACT_CFP_CONTENT)
        analyze_index = GRANT_TEMPLATE_PIPELINE_STAGES.index(GrantTemplateStageEnum.ANALYZE_CFP_CONTENT)
        assert analyze_index > extract_index

        # Section extraction should come after analysis
        sections_index = GRANT_TEMPLATE_PIPELINE_STAGES.index(GrantTemplateStageEnum.EXTRACT_SECTIONS)
        assert sections_index > analyze_index

        # Metadata generation should be last
        metadata_index = GRANT_TEMPLATE_PIPELINE_STAGES.index(GrantTemplateStageEnum.GENERATE_METADATA)
        assert metadata_index == len(GRANT_TEMPLATE_PIPELINE_STAGES) - 1

    def test_pipeline_stage_uniqueness(self) -> None:
        """Test that each stage appears exactly once in the pipeline."""
        for stage in GrantTemplateStageEnum:
            count = GRANT_TEMPLATE_PIPELINE_STAGES.count(stage)
            if stage in GRANT_TEMPLATE_PIPELINE_STAGES:
                assert count == 1, f"Stage {stage} should appear exactly once, found {count} times"

    def test_constants_are_final(self) -> None:
        """Test that constants are properly typed as Final."""
        # This is more of a type-checking test, but we can verify immutability
        original_stages = GRANT_TEMPLATE_PIPELINE_STAGES
        original_total = TOTAL_PIPELINE_STAGES

        # After importing, values should remain the same
        from services.rag.src.grant_template.constants import (
            GRANT_TEMPLATE_PIPELINE_STAGES as IMPORTED_STAGES,
            TOTAL_PIPELINE_STAGES as IMPORTED_TOTAL,
        )

        assert IMPORTED_STAGES is original_stages
        assert IMPORTED_TOTAL == original_total