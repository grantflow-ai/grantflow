import pytest
from litestar.datastructures import UploadFile
from litestar.exceptions import ValidationException

from src.api.sockets.grant_applications import (
    ApplicationSetupInput,
    ResearchDeepDiveInput,
    ResearchObjectiveInput,
    ResearchPlanInput,
    ResearchTask,
    TemplateReviewInput,
)


class TestApplicationSetupInput:
    def test_valid_input_with_file(self) -> None:
        # Use MagicMock instead of trying to create a real UploadFile
        from unittest.mock import MagicMock

        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test.pdf"

        input_data = ApplicationSetupInput(
            title="Test Application",
            cfp_file=mock_file,
        )
        assert input_data.title == "Test Application"
        assert input_data.cfp_file == mock_file
        assert input_data.cfp_url is None

    def test_valid_input_with_url(self) -> None:
        input_data = ApplicationSetupInput(
            title="Test Application",
            cfp_url="https://example.com/cfp",
        )
        assert input_data.title == "Test Application"
        assert input_data.cfp_file is None
        assert input_data.cfp_url == "https://example.com/cfp"

    def test_validation_error_no_title(self) -> None:
        with pytest.raises(ValidationException, match="Application title is required"):
            ApplicationSetupInput(
                title="",
                cfp_url="https://example.com/cfp",
            )

    def test_validation_error_no_cfp(self) -> None:
        with pytest.raises(ValidationException, match="Either a CFP file or URL is required"):
            ApplicationSetupInput(
                title="Test Application",
            )


class TestResearchTask:
    def test_valid_task(self) -> None:
        task = ResearchTask(
            title="Research Task With Valid Length",
            description="Task description",
        )
        assert task.title == "Research Task With Valid Length"
        assert task.description == "Task description"

    def test_validation_error_short_title(self) -> None:
        with pytest.raises(ValidationException, match="Each task must have a title of at least 10 characters"):
            ResearchTask(
                title="Too Short",
            )

    def test_validation_error_empty_title(self) -> None:
        with pytest.raises(ValidationException, match="Each task must have a title of at least 10 characters"):
            ResearchTask(
                title="",
            )


class TestResearchObjectiveInput:
    def test_valid_objective(self) -> None:
        task = ResearchTask(
            title="Research Task With Valid Length",
            description="Task description",
        )
        objective = ResearchObjectiveInput(
            title="Research Objective With Valid Length",
            description="Objective description",
            research_tasks=[task],
        )
        assert objective.title == "Research Objective With Valid Length"
        assert objective.description == "Objective description"
        assert len(objective.research_tasks) == 1
        assert objective.research_tasks[0] == task

    def test_validation_error_short_title(self) -> None:
        task = ResearchTask(
            title="Research Task With Valid Length",
        )
        with pytest.raises(ValidationException, match="Each objective must have a title of at least 10 characters"):
            ResearchObjectiveInput(
                title="Short",
                research_tasks=[task],
            )

    def test_validation_error_no_tasks(self) -> None:
        with pytest.raises(ValidationException, match="Each objective must have at least one research task"):
            ResearchObjectiveInput(
                title="Research Objective With Valid Length",
                research_tasks=[],
            )


class TestResearchPlanInput:
    def test_valid_plan(self) -> None:
        task = ResearchTask(
            title="Research Task With Valid Length",
        )
        objective = ResearchObjectiveInput(
            title="Research Objective With Valid Length",
            research_tasks=[task],
        )
        plan = ResearchPlanInput(
            research_objectives=[objective],
        )
        assert len(plan.research_objectives) == 1
        assert plan.research_objectives[0] == objective

    def test_validation_error_no_objectives(self) -> None:
        with pytest.raises(ValidationException, match="At least one research objective is required"):
            ResearchPlanInput(
                research_objectives=[],
            )


class TestTemplateReviewInput:
    def test_valid_template(self) -> None:
        template = TemplateReviewInput(
            grant_template={"grant_sections": [{"title": "Test Section"}]},
            funding_organization_id="org-123",
        )
        assert template.grant_template == {"grant_sections": [{"title": "Test Section"}]}
        assert template.funding_organization_id == "org-123"

    def test_validation_error_no_template(self) -> None:
        with pytest.raises(ValidationException, match="Grant template data is required"):
            TemplateReviewInput(
                grant_template={},
                funding_organization_id="org-123",
            )

    def test_optional_funding_organization(self) -> None:
        template = TemplateReviewInput(
            grant_template={"grant_sections": [{"title": "Test Section"}]},
        )
        assert template.grant_template == {"grant_sections": [{"title": "Test Section"}]}
        assert template.funding_organization_id is None


class TestResearchDeepDiveInput:
    def test_default_empty_dict(self) -> None:
        deep_dive = ResearchDeepDiveInput()
        assert deep_dive.research_deep_dive == {}

    def test_with_data(self) -> None:
        data = {"significance": "Research significance", "innovation": "Innovation details"}
        deep_dive = ResearchDeepDiveInput(research_deep_dive=data)
        assert deep_dive.research_deep_dive == data
