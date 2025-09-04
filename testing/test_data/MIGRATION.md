# Test Data Migration

This directory has been reorganized from UUID-based to semantic naming for better maintainability.

## Old Structure (DEPRECATED)
```
testing/test_data/
├── sources/application_sources/
│   ├── 43b4aed5-8549-461f-9290-5ee9a630ac9a/  # Melanoma research
│   ├── 8b5e85e4-f962-418e-bdb0-6780edce3247/  # Lampel drug synthesis
│   └── f9e68907-5dd9-4802-b8c0-56cf98140b19/  # Asaf DNA synthesis
├── fixtures/
│   ├── 43b4aed5-8549-461f-9290-5ee9a630ac9a/
│   ├── 8b5e85e4-f962-418e-bdb0-6780edce3247/
│   └── f9e68907-5dd9-4802-b8c0-56cf98140b19/
```

## New Structure (ACTIVE)
```
testing/test_data/scenarios/
├── melanoma_alliance_baseline/
│   ├── metadata.yaml
│   ├── melanoma_alliance_cfp.md
│   ├── sources/       # From 43b4aed5-8549-461f-9290-5ee9a630ac9a
│   └── fixtures/
├── erc_poc_drug_synthesis/
│   ├── metadata.yaml
│   ├── erc_poc_2025.md
│   ├── sources/       # From 8b5e85e4-f962-418e-bdb0-6780edce3247
│   └── fixtures/
└── erc_poc_dna_synthesis/
    ├── metadata.yaml
    ├── erc_poc_2025.md
    ├── sources/       # From f9e68907-5dd9-4802-b8c0-56cf98140b19
    └── fixtures/
```

## Benefits
- **Self-documenting**: Scenario names clearly indicate the research focus
- **Discoverable**: New developers can understand test coverage immediately
- **Maintainable**: Adding new scenarios doesn't require UUID lookup
- **Structured**: metadata.yaml contains all scenario configuration in one place

## Usage
```python
from testing.scenarios.base import load_scenario

scenario = load_scenario("erc_poc_dna_synthesis")
print(scenario.metadata.researcher)  # "Asaf"
print(scenario.get_source_files())   # List of research papers
```

## Migration Date
September 4, 2025