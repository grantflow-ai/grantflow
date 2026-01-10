# 2. Remove Real Grant Application Data from Test Fixtures

Date: 2026-01-10

## Status

Accepted

## Context

The GrantFlow repository contained approximately 240MB of real grant application data embedded within test fixtures. This data included:

- Melanoma research grant applications
- European Research Council (ERC) grant proposals
- National Institutes of Health (NIH) grant applications
- Israeli Call for Proposals (CFP) submissions
- Source documents and raw data

While this data was valuable for comprehensive E2E testing and ensuring realistic document processing behavior, retaining it in a public open-source repository creates significant compliance and legal risks:

1. **Data Privacy**: Real applicants' personal information and institutional data may be included
2. **Intellectual Property**: Grant proposals contain proprietary research and methodology
3. **Institutional Liability**: Universities and research institutions may not have consented to public data sharing
4. **Regulatory Compliance**: Potential violations of data protection regulations (GDPR, institutional policies)
5. **Open Source Commitment**: Preparing the project for broader open-source adoption requires removing sensitive data

## Decision

We are removing all real grant application data from test fixtures and E2E tests. This involves:

1. **Deleting Source Data**: Remove all real grant documents, applications, and source files from the repository
2. **Disabling E2E Tests**: Temporarily disable E2E tests that depend on real data (approximately 11+ test cases)
3. **Removing Test Scenarios**: Delete 3 complete test scenarios that relied on real grant data
4. **Future Approach**: Replace with synthetic, anonymized, or redacted test data when E2E testing is re-enabled

## Consequences

### Positive Consequences

- **Compliance Risk Eliminated**: Removes significant legal and regulatory exposure
- **Open Source Ready**: Repository is now safer for public distribution and community contributions
- **Data Privacy**: Respects the privacy of real grant applicants and institutions
- **IP Protection**: Prevents disclosure of proprietary research methodologies
- **Sustainable**: Creates a model for sustainable E2E testing without sensitive data

### Negative Consequences

- **Reduced Test Coverage**: E2E tests are temporarily disabled, reducing confidence in end-to-end workflows
- **Realism Loss**: Synthetic test data may not catch edge cases present in real grant documents
- **Development Velocity**: Engineers must create synthetic fixtures instead of using real examples
- **Debugging Difficulty**: Reproducing issues found in production becomes harder without real data samples

### Risks

- **Hidden Data**: Remnants of sensitive data may exist in git history or backups
- **Incomplete Removal**: Some sensitive data patterns may not be fully identified and removed
- **Future Regression**: Team members may accidentally commit similar data in the future

## Alternatives Considered

### Alternative 1: Data Anonymization

**Description**: Keep the real data but thoroughly anonymize applicant information, institutions, and proprietary content.

**Pros**:
- Maintains realistic document structure and complexity
- Allows comprehensive E2E testing
- More edge cases can be tested

**Cons**:
- Anonymization can be incomplete (metadata, writing style, research topics could identify participants)
- Significant effort required for thorough anonymization
- Ongoing risk of accidental de-anonymization
- Still exposes intellectual property and methodologies

**Why rejected**: Incomplete anonymization still poses compliance risk and is difficult to audit. Complete removal is clearer and safer.

### Alternative 2: Private Data Repository

**Description**: Move sensitive test data to a private repository and reference it conditionally.

**Pros**:
- Keeps real data for testing purposes
- Doesn't affect public repository

**Cons**:
- Maintains compliance risk in private repository
- Adds complexity to test infrastructure
- Requires separate access controls and management
- Doesn't solve the underlying data ownership issue

**Why rejected**: Transfers rather than solves the compliance problem. Doesn't align with open-source principles.

### Alternative 3: Keep Data with Warnings

**Description**: Keep the real data but add clear warnings in documentation.

**Pros**:
- Preserves test coverage
- No immediate migration effort

**Cons**:
- Warnings don't eliminate legal liability
- Violates data privacy principles
- Incompatible with open-source goals
- Does not address lack of consent from data sources

**Why rejected**: Warnings are insufficient for compliance. Retention of the data itself is the problem.

## Implementation Notes

**Removed Components**:

1. **Test Scenarios** (3 total):
   - Melanoma research grant processing workflow
   - ERC grant multi-language document extraction
   - NIH/Israeli CFP competitive analysis scenario

2. **E2E Tests** (11+ tests):
   - Document parsing accuracy tests
   - Multi-section extraction validation
   - Budget analysis workflow tests
   - Deadline extraction from complex grant documents
   - Metadata enrichment tests
   - Cross-document comparison tests
   - Grant eligibility matching tests
   - And additional supporting tests

3. **Source Documents**:
   - Real grant applications and PDFs
   - Raw data files and structured extracts
   - Supplementary research documents
   - Supporting materials and appendices

**Migration Path** (future):

1. Create synthetic grant document generators
2. Build realistic but entirely fictional test data sets
3. Implement parametrized tests with synthetic data variants
4. Re-enable E2E tests with new synthetic fixtures
5. Consider test data generation strategies for edge cases

**Timeline**:
- This ADR marks the decision to remove
- Removal should be completed and verified before public release
- E2E tests remain disabled until synthetic replacements are implemented

## References

- [GDPR Regulations](https://gdpr-info.eu/)
- [Data Privacy Best Practices](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5995407/)
- [Open Source Data Governance](https://opensource.org/licenses/)
- Related ADR: [001-shared-testing-package.md](./001-shared-testing-package.md)
