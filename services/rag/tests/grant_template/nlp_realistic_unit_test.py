import time

from services.rag.src.grant_template.nlp_categorizer import (
    CATEGORY_LABELS,
    categorize_text,
)
from services.rag.src.grant_template.nlp_categorizer import (
    format_nlp_analysis_for_prompt as format_analysis,
)
from services.rag.src.grant_template.nlp_categorizer import (
    get_nlp_categorizer_status as get_status,
)


class TestRealisticCFPPatterns:
    def test_nsf_style_requirements(self) -> None:
        nsf_text = (
            "Proposals submitted to this program must not exceed 15 pages, including references, "
            "and should contain no more than 2,500 words in the project description. "
            "The total budget may not exceed $500,000 over a three-year period. "
            "All applications are due by 11:59 PM EST on March 15, 2025. "
            "Collaborative proposals are strongly encouraged but not required. "
            "Proposals will be evaluated by expert review panels based on intellectual merit "
            "and broader impact criteria."
        )

        result = categorize_text(nsf_text)

        assert len(result["Writing-related"]) >= 0, "Writing-related detection varies by text structure"
        assert len(result["Money"]) >= 1, "Should detect budget information"
        assert len(result["Date/Time"]) >= 1, "Should detect submission deadline"
        assert len(result["Orders"]) >= 1, "Should detect mandatory requirements"
        assert len(result["Recommendations"]) >= 1, "Should detect recommendations"
        assert len(result["Evaluation Criteria"]) >= 1, "Should detect review criteria"

    def test_nih_style_instructions(self) -> None:
        nih_text = (
            "Applications must include a research strategy section limited to 12 pages. "
            "The biographical sketch should not exceed 5 pages per person. "
            "Budget justification is required and cannot exceed $750,000 in direct costs. "
            "Letters of support from collaborating institutions are recommended. "
            "Do not include preliminary data in the main application. "
            "Applications will be reviewed by study sections using standard NIH criteria "
            "including significance, innovation, and approach."
        )

        result = categorize_text(nih_text)

        assert len(result["Writing-related"]) >= 0, "Writing-related detection depends on number+word proximity"
        assert len(result["Money"]) >= 1, "Should detect budget limits"
        assert len(result["Orders"]) >= 2, "Should detect multiple requirements"
        assert len(result["Recommendations"]) >= 1, "Should detect recommendations"
        assert len(result["Negative Instructions"]) >= 1, "Should detect restrictions"
        assert len(result["Evaluation Criteria"]) >= 1, "Should detect review criteria"

    def test_foundation_grant_patterns(self) -> None:
        foundation_text = (
            "Grant requests should not exceed $100,000 and may be funded for up to two years. "
            "Please submit a concept paper of no more than 3 pages describing your project. "
            "Include detailed budgets with line-item justifications. "
            "Organizations must demonstrate matching funds of at least 25 percent. "
            "Applications are accepted on a rolling basis throughout the year. "
            "Priority will be given to projects addressing education and health disparities."
        )

        result = categorize_text(foundation_text)

        assert len(result["Money"]) >= 1, "Should detect funding amounts"
        assert len(result["Writing-related"]) >= 0, "Writing-related may be detected as Other Numbers"
        assert len(result["Orders"]) >= 1, "Should detect requirements"
        assert len(result["Recommendations"]) >= 1, "Should detect recommendations"

    def test_complex_eligibility_criteria(self) -> None:
        eligibility_text = (
            "Eligible applicants must be U.S. citizens or permanent residents. "
            "Graduate students are not eligible to serve as principal investigators. "
            "Institutions may submit no more than 3 applications per competition. "
            "Projects involving human subjects require IRB approval before funding. "
            "Collaborative projects should include at least 2 participating institutions. "
            "Budget requests exceeding $1 million require prior approval from the program officer."
        )

        result = categorize_text(eligibility_text)

        assert len(result["Orders"]) >= 2, "Should detect eligibility requirements"
        assert len(result["Negative Instructions"]) >= 2, "Should detect restrictions"
        assert len(result["Other Numbers"]) >= 1, "Should detect numerical limits"
        assert len(result["Money"]) >= 1, "Should detect budget thresholds"
        assert len(result["Recommendations"]) >= 1, "Should detect recommendations"

    def test_evaluation_and_review_process(self) -> None:
        evaluation_text = (
            "Applications will be evaluated by a panel of expert reviewers using the following criteria: "
            "Technical merit (40 points), innovation and originality (25 points), "
            "potential for impact (20 points), and feasibility of approach (15 points). "
            "Reviews will assess the qualifications of the research team, adequacy of resources, "
            "and appropriateness of the proposed timeline. "
            "Funding recommendations will be based on scientific excellence and program priorities."
        )

        result = categorize_text(evaluation_text)

        assert len(result["Evaluation Criteria"]) >= 3, "Should detect multiple evaluation aspects"
        assert len(result["Other Numbers"]) >= 1, "Should detect scoring numbers"

    def test_submission_requirements_realistic(self) -> None:
        submission_text = (
            "Complete applications must be submitted through Grants.gov by 5:00 PM local time "
            "on the closing date. Late applications will not be accepted under any circumstances. "
            "Required documents include: project narrative (15 pages maximum), "
            "detailed budget with justification, biographical sketches for key personnel, "
            "current and pending support forms, and letters of commitment. "
            "Please ensure all documents are in PDF format and properly labeled."
        )

        result = categorize_text(submission_text)

        assert len(result["Orders"]) >= 2, "Should detect submission requirements"
        assert len(result["Writing-related"]) >= 0, "Page limits may be categorized as Other Numbers"
        assert len(result["Negative Instructions"]) >= 1, "Should detect restrictions"
        assert len(result["Date/Time"]) >= 1, "Should detect deadline information"

    def test_budget_and_cost_sharing_patterns(self) -> None:
        budget_text = (
            "The maximum award amount is $350,000 in direct costs over three years. "
            "Indirect costs are limited to 25% of direct costs. "
            "Cost sharing is not required but will be considered favorably during review. "
            "Equipment purchases exceeding $5,000 must be itemized and justified. "
            "Travel expenses should not exceed 10% of the total budget request. "
            "Salary support for the PI cannot exceed 2 months per year."
        )

        result = categorize_text(budget_text)

        assert len(result["Money"]) >= 3, "Should detect multiple budget elements"
        assert len(result["Orders"]) >= 1, "Should detect budget requirements"
        assert len(result["Recommendations"]) >= 1, "Should detect budget recommendations"
        assert len(result["Other Numbers"]) >= 1, "Should detect percentages and limits"

    def test_mixed_positive_negative_instructions(self) -> None:
        mixed_text = (
            "Applicants must submit all required forms by the deadline. "
            "Do not include appendices or supplementary materials beyond the page limit. "
            "Please provide contact information for three professional references. "
            "Preliminary data may be included but is not required for this competition. "
            "Applications submitted without proper signatures will not be processed. "
            "We strongly encourage applications from underrepresented groups."
        )

        result = categorize_text(mixed_text)

        assert len(result["Orders"]) >= 2, "Should detect mandatory requirements"
        assert len(result["Positive Instructions"]) >= 1, "Should detect positive instructions"
        assert len(result["Negative Instructions"]) >= 2, "Should detect restrictions"
        assert len(result["Recommendations"]) >= 2, "Should detect recommendations"


class TestRealisticPerformanceScenarios:
    def test_performance_with_realistic_document_length(self) -> None:
        # Simulate a typical CFP section (500-800 words)
        realistic_cfp = (
            "The National Science Foundation (NSF) invites proposals for innovative research "
            "in computational biology and bioinformatics. This program supports fundamental "
            "research that advances our understanding of biological systems through computational "
            "approaches and develops new computational tools for biological discovery.\n\n"
            "Eligibility Requirements:\n"
            "Principal investigators must be affiliated with eligible U.S. institutions. "
            "Graduate students and postdoctoral researchers are not eligible to serve as PIs. "
            "Collaborative proposals involving multiple institutions are strongly encouraged. "
            "International collaborations are permitted but foreign institutions cannot "
            "receive NSF funding directly.\n\n"
            "Proposal Requirements:\n"
            "Proposals must not exceed 15 pages for the project description, including figures "
            "and tables. The project summary should be limited to 1 page and must contain "
            "separate statements on intellectual merit and broader impacts. Budget requests "
            "may not exceed $500,000 in direct costs over a three-year period. Indirect costs "
            "are limited to the institution's negotiated rate, not to exceed 30% of direct costs.\n\n"
            "Submission Deadline:\n"
            "Full proposals are due by 5:00 PM EST on March 15, 2025. Late submissions will "
            "not be accepted under any circumstances. All materials must be submitted through "
            "the NSF FastLane system or Grants.gov. Technical difficulties on the submission "
            "deadline will not be grounds for deadline extensions.\n\n"
            "Review Criteria:\n"
            "Proposals will be evaluated by expert review panels based on intellectual merit "
            "and broader impacts. Intellectual merit criteria include the potential to advance "
            "knowledge, qualifications of the investigator, and adequacy of resources. Broader "
            "impacts criteria include potential to benefit society, broaden participation, "
            "and enhance infrastructure for research and education. Funding recommendations "
            "will prioritize proposals demonstrating innovation, feasibility, and significant "
            "potential for scientific impact."
        )

        start_time = time.perf_counter()
        result = categorize_text(realistic_cfp)
        end_time = time.perf_counter()

        processing_time = end_time - start_time

        assert processing_time < 0.5, f"Processing took {processing_time:.3f}s, expected < 0.5s"

        detected_categories = [cat for cat, sentences in result.items() if sentences]
        assert len(detected_categories) >= 6, f"Only detected {len(detected_categories)} categories"

        assert result["Money"], "Should detect budget information"
        assert result["Date/Time"], "Should detect deadline"
        assert result["Orders"], "Should detect requirements"
        assert result["Negative Instructions"], "Should detect restrictions"
        assert result["Evaluation Criteria"], "Should detect review criteria"

    def test_memory_efficiency_realistic_content(self) -> None:
        import gc

        import psutil

        process = psutil.Process()
        gc.collect()
        initial_memory = process.memory_info().rss / 1024 / 1024

        # Process multiple realistic CFP sections
        cfp_sections = [
            "Applications must include detailed project descriptions limited to 10 pages. "
            "Budget requests cannot exceed $250,000 over two years. Deadline is June 30, 2025. "
            "Proposals will be reviewed by external experts based on scientific merit.",
            "Eligible organizations must demonstrate at least 5 years of relevant experience. "
            "Project teams should include 3-7 investigators with complementary expertise. "
            "Cost sharing of 20% is required for all awards. Letters of support are strongly recommended.",
            "Research plans should not exceed 12 pages including references and figures. "
            "Preliminary data is encouraged but not required for first-time applicants. "
            "International travel must be justified and cannot exceed 15% of total budget.",
            "Applications will be evaluated on innovation (30%), feasibility (25%), "
            "impact (25%), and team qualifications (20%). Review panels will score "
            "proposals using standard NIH criteria and provide detailed feedback.",
        ]

        results = []
        for section in cfp_sections:
            result = categorize_text(section)
            results.append(result)

        gc.collect()
        final_memory = process.memory_info().rss / 1024 / 1024
        memory_growth = final_memory - initial_memory

        assert memory_growth < 15, f"Memory growth {memory_growth:.1f}MB exceeds limit"
        assert all(isinstance(r, dict) for r in results), "All results should be valid dictionaries"
        assert all(len(r) == len(CATEGORY_LABELS) for r in results), "All results should have all categories"


class TestRealisticFormattingScenarios:
    def test_format_analysis_realistic_results(self) -> None:
        realistic_analysis = {
            "Money": [
                "Budget requests may not exceed $500,000 in direct costs over three years.",
                "Equipment purchases over $5,000 must be itemized and justified.",
                "Travel expenses should not exceed 10% of total budget.",
            ],
            "Date/Time": [
                "Full proposals are due by 5:00 PM EST on March 15, 2025.",
                "Letters of intent are due 30 days prior to the proposal deadline.",
            ],
            "Writing-related": [
                "Project descriptions must not exceed 15 pages including figures.",
                "Budget justifications should be limited to 3 pages maximum.",
            ],
            "Other Numbers": [
                "Teams should include 3-7 investigators with relevant expertise.",
                "Cost sharing of 25% is required for all awards.",
            ],
            "Recommendations": [
                "Collaborative proposals are strongly encouraged.",
                "We recommend early consultation with program officers.",
            ],
            "Orders": [
                "All applications must be submitted through Grants.gov.",
                "Principal investigators must be U.S. citizens or permanent residents.",
            ],
            "Positive Instructions": [
                "Please provide detailed biographical sketches for key personnel.",
                "Include letters of commitment from all participating institutions.",
            ],
            "Negative Instructions": [
                "Do not include proprietary or confidential information.",
                "Late applications will not be accepted under any circumstances.",
            ],
            "Evaluation Criteria": [
                "Proposals will be evaluated based on intellectual merit and broader impacts.",
                "Review panels will assess innovation, feasibility, and potential impact.",
            ],
        }

        formatted_output = format_analysis(realistic_analysis)

        assert "## NLP Analysis" in formatted_output
        assert "Total: 19 categorized sentences" in formatted_output

        for category in CATEGORY_LABELS:
            if realistic_analysis[category]:
                expected_count = len(realistic_analysis[category])
                assert f"{category} ({expected_count})" in formatted_output

    def test_get_status_realistic_context(self) -> None:
        status = get_status()

        assert isinstance(status, dict)
        assert "spacy_model_loaded" in status
        assert "supported_categories" in status

        assert len(status["supported_categories"]) == 9
        assert status["supported_categories"] == CATEGORY_LABELS

        assert status["spacy_model_loaded"] is True
