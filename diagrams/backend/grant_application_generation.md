# Grant Application Text Generation Flow

This flowchart describes the pipeline for generating grant application texts.
It includes stages for retrieving, validating, generating, and assembling the full application text, along with error handling at each critical point.

```mermaid
flowchart TD
    A(Start: grant_application_text_generation_pipeline_handler) --> B(Retrieve Grant Application)
    B --> C(Validate Grant Template & Research Objectives)
    B --> Z2(Error: Missing Application or Template)

    C --> D{Workplan Section Present?}
    C --> Z3(Error: Invalid Template Structure)

    D -- Yes --> E(Generate Work Plan Text)
    D -- No --> Z1(Error: Missing Workplan Section)

    E --> F(Extract Relationships)
    F --> G(Enrich Objectives and Tasks)
    G --> H(Generate Text for Objectives and Tasks)
    H --> I(Build Workplan Text)

    I --> J(Generate Other Grant Section Texts)

    J --> K(Assemble Full Application Text)
    J --> Z4(Error: Section Generation Failed)

    K --> L(Save Application Text to DB)

    L --> M(Return Application Text)
    L --> Z5(Error: Database Write Failure)
```
