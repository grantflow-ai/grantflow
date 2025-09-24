from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective

TEST_DATA_FOLDER = Path(__file__).parent.parent / "test_data"


@dataclass(slots=True)
class ScenarioMetadata:
    name: str
    researcher: str
    grant_type: str
    research_domain: str
    description: str


@dataclass(slots=True)
class CFPMapping:
    file: str
    grant_type: str
    sections: list[str]


class BaseScenario:
    def __init__(self, scenario_name: str) -> None:
        self.scenario_name = scenario_name
        self.scenario_path = TEST_DATA_FOLDER / "scenarios" / scenario_name
        self._metadata: dict[str, Any] | None = None

        if not self.scenario_path.exists():
            raise ValueError(f"Scenario directory does not exist: {self.scenario_path}")

    @property
    def metadata_file(self) -> Path:
        return self.scenario_path / "metadata.yaml"

    @property
    def sources_dir(self) -> Path:
        return self.scenario_path / "sources"

    @property
    def fixtures_dir(self) -> Path:
        return self.scenario_path / "fixtures"

    def _load_metadata(self) -> dict[str, Any]:
        if self._metadata is None:
            with self.metadata_file.open() as f:
                self._metadata = yaml.safe_load(f)
        return self._metadata

    @property
    def metadata(self) -> ScenarioMetadata:
        data = self._load_metadata()
        scenario_data = data["scenario"]
        return ScenarioMetadata(
            name=scenario_data["name"],
            researcher=scenario_data["researcher"],
            grant_type=scenario_data["grant_type"],
            research_domain=scenario_data["research_domain"],
            description=scenario_data["description"],
        )

    @property
    def research_objectives(self) -> list[ResearchObjective]:
        data = self._load_metadata()
        return data["research_objectives"]  # type: ignore[no-any-return]

    @property
    def form_inputs(self) -> ResearchDeepDive:
        data = self._load_metadata()
        return data["form_inputs"]  # type: ignore[no-any-return]

    @property
    def cfp_mapping(self) -> CFPMapping:
        data = self._load_metadata()
        cfp_data = data["cfp_mapping"]
        return CFPMapping(
            file=cfp_data["file"],
            grant_type=cfp_data["grant_type"],
            sections=cfp_data["sections"],
        )

    @property
    def cfp_file(self) -> Path:
        return self.scenario_path / self.cfp_mapping.file

    def get_source_files(self) -> list[Path]:
        if not self.sources_dir.exists():
            return []
        return list(self.sources_dir.rglob("*"))

    def get_fixture_files(self) -> list[Path]:
        if not self.fixtures_dir.exists():
            return []
        return list(self.fixtures_dir.rglob("*.json"))


class ERCScenario(BaseScenario):
    @property
    def grant_type(self) -> str:
        return "ERC Proof of Concept"

    @property
    def expected_sections(self) -> list[str]:
        return [
            "Section 1a: The idea - Breakthrough Innovation potential",
            "Section 1b: Approach and Methodology",
        ]


class MelanomaAllianceScenario(BaseScenario):
    @property
    def grant_type(self) -> str:
        return "Melanoma Alliance Research Grant"

    @property
    def expected_sections(self) -> list[str]:
        return [
            "Research Plan",
            "Specific Aims",
            "Background and Significance",
        ]


def load_scenario(scenario_name: str) -> BaseScenario:
    if scenario_name.startswith("erc_"):
        return ERCScenario(scenario_name)
    if scenario_name.startswith("melanoma_"):
        return MelanomaAllianceScenario(scenario_name)
    return BaseScenario(scenario_name)


def list_available_scenarios() -> list[str]:
    scenarios_dir = TEST_DATA_FOLDER / "scenarios"
    if not scenarios_dir.exists():
        return []

    return [d.name for d in scenarios_dir.iterdir() if d.is_dir() and (d / "metadata.yaml").exists()]
