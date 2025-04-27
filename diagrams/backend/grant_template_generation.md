# Grant Template Generation Flow

This flowchart represents the process of generating a grant template based on extracted CFP data.
It covers extracting, validating, enriching sections, creating the final template, and handling possible errors at each step.

```mermaid
flowchart TD
    A(Start: grant_template_generation_pipeline_handler) --> B(Extract CFP Data)
    B --> C{Organization Found?}
    B --> M(Error: CFP Extraction)

    C -- Yes --> D(Fetch Organization Metadata)
    C -- No --> E(Proceed Without Organization Context)

    D --> F(Extract & Enrich Sections)
    E --> F(Extract & Enrich Sections)

    F --> G(Extract Grant Sections from CFP)

    G --> H(Generate Metadata for Long-Form Sections)
    G --> N(Error: Section Extraction)

    H --> I(Combine Structure + Metadata)
    H --> O(Error: Metadata Generation)

    I --> J(Create GrantTemplate Object)

    J --> K(Insert GrantTemplate into DB)

    K --> L(Return GrantTemplate)
    K --> P(Error: Database Insertion)
```
