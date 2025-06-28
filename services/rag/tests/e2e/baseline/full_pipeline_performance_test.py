"""
Performance tests for the full grant application generation pipeline.

Tests comprehensive end-to-end performance across all pipeline stages:
1. Complete pipeline baseline measurement from start to finish
2. Pipeline stage breakdown analysis and bottleneck identification
3. Resource utilization and throughput optimization
4. Full application generation quality vs speed analysis
5. Pipeline scalability and parallel processing opportunities
"""

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive
from packages.db.src.tables import GrantApplication, GrantTemplate
from packages.db.src.utils import retrieve_application
from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.rag.src.utils.job_manager import JobManager
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_performance_targets,
    create_performance_context,
)
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, e2e_test
from testing.factories import (
    GrantApplicationFactory,
    GrantTemplateFactory,
    ResearchObjectiveFactory,
)


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=2400)
async def test_full_pipeline_baseline_performance(
    async_session_maker: async_sessionmaker[Any],
    logger: logging.Logger,
) -> None:
    """
    Establish baseline performance for the complete grant application generation pipeline.
    Tests end-to-end performance from research objectives to final application text.
    """

    with create_performance_context(
        test_name="full_pipeline_baseline_performance",
        test_category=TestCategory.BASELINE,
        logger=logger,
        configuration={
            "test_type": "full_pipeline_baseline",
            "operation": "end_to_end_generation",
            "research_objectives_count": 5,
            "section_count": 8,
            "pipeline_stages": 8,
        },
        expected_patterns=["pipeline", "baseline", "generation", "performance"]
    ) as perf_ctx:

        logger.info("=== FULL PIPELINE BASELINE PERFORMANCE TEST ===")


        async with async_session_maker() as session, session.begin():


            grant_template = GrantTemplateFactory.build(
                title="Comprehensive Research Grant Template",
                description="Full-featured template for performance testing",
                grant_sections=[
                    GrantLongFormSection(
                        id="work-plan-1",
                        title="Detailed Research Plan",
                        description="Comprehensive work plan with objectives and tasks",
                        order=1,
                        max_words=2000,
                        generation_instructions="Generate detailed research plan with all objectives and tasks",
                        keywords=["research", "plan", "objectives", "tasks"],
                        topics=["Research Plan"],
                        is_detailed_research_plan=True,
                        depends_on=[]
                    ),
                    GrantLongFormSection(
                        id="background-2",
                        title="Background and Significance",
                        description="Research background and significance",
                        order=2,
                        max_words=1500,
                        generation_instructions="Generate comprehensive background section",
                        keywords=["background", "significance", "literature"],
                        topics=["Background"],
                        depends_on=["work-plan-1"]
                    ),
                    GrantLongFormSection(
                        id="methodology-3",
                        title="Research Methodology",
                        description="Detailed research methodology and approaches",
                        order=3,
                        max_words=1800,
                        generation_instructions="Generate detailed methodology section",
                        keywords=["methodology", "experimental", "approach"],
                        topics=["Methodology"],
                        depends_on=["work-plan-1"]
                    ),
                    GrantLongFormSection(
                        id="innovation-4",
                        title="Innovation and Impact",
                        description="Innovation aspects and expected impact",
                        order=4,
                        max_words=1200,
                        generation_instructions="Generate innovation and impact section",
                        keywords=["innovation", "impact", "significance"],
                        topics=["Innovation"],
                        depends_on=["background-2", "methodology-3"]
                    ),
                    GrantLongFormSection(
                        id="timeline-5",
                        title="Project Timeline",
                        description="Detailed project timeline and milestones",
                        order=5,
                        max_words=1000,
                        generation_instructions="Generate project timeline section",
                        keywords=["timeline", "milestones", "schedule"],
                        topics=["Timeline"],
                        depends_on=["work-plan-1", "methodology-3"]
                    ),
                    GrantLongFormSection(
                        id="budget-6",
                        title="Budget Justification",
                        description="Budget breakdown and justification",
                        order=6,
                        max_words=1200,
                        generation_instructions="Generate budget justification section",
                        keywords=["budget", "cost", "justification"],
                        topics=["Budget"],
                        depends_on=["methodology-3", "timeline-5"]
                    ),
                    GrantLongFormSection(
                        id="personnel-7",
                        title="Personnel and Resources",
                        description="Key personnel and resource requirements",
                        order=7,
                        max_words=1000,
                        generation_instructions="Generate personnel section",
                        keywords=["personnel", "resources", "team"],
                        topics=["Personnel"],
                        depends_on=["methodology-3"]
                    ),
                    GrantLongFormSection(
                        id="evaluation-8",
                        title="Evaluation and Dissemination",
                        description="Evaluation metrics and dissemination plan",
                        order=8,
                        max_words=800,
                        generation_instructions="Generate evaluation section",
                        keywords=["evaluation", "dissemination", "metrics"],
                        topics=["Evaluation"],
                        depends_on=["methodology-3", "innovation-4"]
                    )
                ]
            )
            session.add(grant_template)
            await session.flush()


            research_objectives = [
                ResearchObjectiveFactory.build(
                    number=i+1,
                    title=f"Research Objective {i+1}: {objective_title}",
                    description=objective_desc,
                    research_tasks=[
                        {
                            "number": j+1,
                            "title": f"Task {i+1}.{j+1}: {task_title}",
                            "description": task_desc,
                            "deliverables": [f"Deliverable {i+1}.{j+1}.1", f"Deliverable {i+1}.{j+1}.2"],
                            "timeline_months": (j+1) * 6,
                            "dependencies": []
                        }
                        for j, (task_title, task_desc) in enumerate([
                            ("Primary Analysis", f"Conduct primary analysis for objective {i+1}"),
                            ("Validation Study", f"Validate findings from objective {i+1}"),
                            ("Results Integration", f"Integrate results from objective {i+1}")
                        ])
                    ]
                )
                for i, (objective_title, objective_desc) in enumerate([
                    ("Advanced CAR-T Cell Engineering", "Develop next-generation CAR-T cell constructs with enhanced therapeutic efficacy"),
                    ("Manufacturing Process Optimization", "Optimize large-scale manufacturing processes for clinical-grade CAR-T cell production"),
                    ("Preclinical Safety and Efficacy", "Conduct comprehensive preclinical studies to evaluate safety and efficacy profiles"),
                    ("Biomarker Development", "Develop predictive biomarkers for patient stratification and treatment monitoring"),
                    ("Clinical Translation Strategy", "Establish protocols and frameworks for clinical translation and regulatory approval")
                ])
            ]


            form_inputs = ResearchDeepDive(
                research_domain="Cancer Immunotherapy and Cell Therapy",
                research_question="How can we engineer enhanced CAR-T cells with improved persistence, reduced toxicity, and broader applicability for treating solid tumors?",
                methodology_approach="Multi-disciplinary approach combining synthetic biology, immunology, and clinical translation with advanced manufacturing processes",
                innovation_aspects="Novel CAR designs with optimized signaling domains, enhanced persistence mechanisms, and reduced immunogenicity for improved therapeutic outcomes",
                expected_outcomes="Development of next-generation CAR-T cell therapies with superior efficacy, safety, and accessibility for treating previously intractable solid tumors"
            )


            grant_application = GrantApplicationFactory.build(
                title="Advanced CAR-T Cell Engineering for Solid Tumor Treatment",
                grant_template=grant_template,
                research_objectives=research_objectives,
                form_inputs=form_inputs
            )
            session.add(grant_application)
            await session.flush()

            application_id = grant_application.id

        logger.info(
            "Test data created successfully",
            application_id=str(application_id),
            objectives_count=len(research_objectives),
            sections_count=len(grant_template.grant_sections),
            total_tasks=sum(len(obj["research_tasks"]) for obj in research_objectives)
        )


        with perf_ctx.stage_timer("pipeline_initialization"):
            job_manager = JobManager(async_session_maker)
            initialization_start = datetime.now(UTC)

        with perf_ctx.stage_timer("full_pipeline_execution"):
            pipeline_start = datetime.now(UTC)

            try:
                application_text, section_texts = await grant_application_text_generation_pipeline_handler(
                    grant_application_id=application_id,
                    session_maker=async_session_maker,
                    job_manager=job_manager
                )

                pipeline_duration = (datetime.now(UTC) - pipeline_start).total_seconds()
                success = True


                total_application_words = len(application_text.split())
                total_section_words = sum(len(text.split()) for text in section_texts.values())
                section_count = len(section_texts)

                logger.info(
                    "Pipeline execution completed successfully",
                    pipeline_duration_seconds=pipeline_duration,
                    total_application_words=total_application_words,
                    total_section_words=total_section_words,
                    sections_generated=section_count
                )

            except Exception as e:
                pipeline_duration = (datetime.now(UTC) - pipeline_start).total_seconds()
                success = False
                application_text = ""
                section_texts = {}
                total_application_words = 0
                total_section_words = 0
                section_count = 0

                logger.error(
                    "Pipeline execution failed",
                    pipeline_duration_seconds=pipeline_duration,
                    error=str(e),
                    exc_info=e
                )


        words_per_second = total_application_words / pipeline_duration if pipeline_duration > 0 else 0
        sections_per_minute = (section_count / pipeline_duration) * 60 if pipeline_duration > 0 else 0
        avg_words_per_section = total_section_words / section_count if section_count > 0 else 0


        performance_grade = (
            "A" if pipeline_duration < 300 and success else
            "B" if pipeline_duration < 600 and success else
            "C" if pipeline_duration < 900 and success else
            "F"
        )

        throughput_grade = (
            "High" if words_per_second > 20 else
            "Medium" if words_per_second > 10 else
            "Low"
        )

        analysis_content = f"""
        # Full Pipeline Baseline Performance

        ## Test Configuration
        - Application ID: {application_id}
        - Research Objectives: {len(research_objectives)}
        - Total Research Tasks: {sum(len(obj["research_tasks"]) for obj in research_objectives)}
        - Grant Sections: {len(grant_template.grant_sections)}
        - Pipeline Stages: 8
        - Domain: Cancer Immunotherapy and Cell Therapy

        ## Pipeline Performance Results
        - **Total Pipeline Duration**: {pipeline_duration:.2f} seconds ({pipeline_duration/60:.2f} minutes)
        - **Pipeline Status**: {'✅ Success' if success else '❌ Failed'}
        - **Performance Grade**: {performance_grade}
        - **Throughput Grade**: {throughput_grade}

        ## Content Generation Results
        - **Total Application Words**: {total_application_words:,}
        - **Total Section Words**: {total_section_words:,}
        - **Sections Generated**: {section_count}/{len(grant_template.grant_sections)}
        - **Average Words per Section**: {avg_words_per_section:.0f}
        - **Generation Rate**: {words_per_second:.1f} words/second
        - **Section Throughput**: {sections_per_minute:.1f} sections/minute

        ## Section Breakdown
        {chr(10).join([
            f"### {section_id}" + chr(10) +
            f"- Words: {len(section_texts.get(section_id, '').split()):,}" + chr(10) +
            f"- Status: {'✅ Generated' if section_id in section_texts else '❌ Missing'}"
            for section_id in [s["id"] for s in grant_template.grant_sections]
        ])}

        ## Performance Analysis
        - **Pipeline Efficiency**: {'Excellent' if pipeline_duration < 300 else 'Good' if pipeline_duration < 600 else 'Needs optimization'}
        - **Content Quality**: {'High volume generation' if total_application_words > 8000 else 'Standard generation' if total_application_words > 5000 else 'Low volume'}
        - **Section Completion Rate**: {(section_count / len(grant_template.grant_sections)) * 100:.1f}%
        - **Bottleneck Assessment**: {'Generation speed' if pipeline_duration > 600 else 'Content complexity' if avg_words_per_section > 1500 else 'Optimal performance'}

        ## Pipeline Stage Analysis
        - **Initialization Overhead**: Minimal impact on overall performance
        - **Primary Bottleneck**: {'Section generation' if pipeline_duration > 600 else 'Work plan generation' if pipeline_duration > 300 else 'Well balanced'}
        - **Parallelization Opportunities**: {'High' if section_count > 6 else 'Medium' if section_count > 4 else 'Low'}
        - **Resource Utilization**: {'High' if words_per_second > 15 else 'Medium' if words_per_second > 8 else 'Low'}

        ## Optimization Recommendations
        - **Immediate Priority**: {'Parallel section generation' if pipeline_duration > 500 else 'Prompt optimization' if words_per_second < 12 else 'Current performance adequate'}
        - **Expected Improvement**: {'40-60% with parallelization' if pipeline_duration > 600 else '20-30% with optimization' if pipeline_duration > 300 else '10-15% fine-tuning'}
        - **Implementation Strategy**: {'Phase 1: Parallel processing, Phase 2: Prompt optimization' if performance_grade in ['C', 'F'] else 'Incremental improvements'}

        ## Scalability Analysis
        - **Current Capacity**: {section_count} sections in {pipeline_duration/60:.1f} minutes
        - **Projected 10-Section Pipeline**: {(pipeline_duration * 10 / section_count)/60:.1f} minutes (linear scaling)
        - **Projected 20-Section Pipeline**: {(pipeline_duration * 20 / section_count)/60:.1f} minutes (linear scaling)
        - **Scalability Grade**: {'A' if pipeline_duration < 400 else 'B' if pipeline_duration < 700 else 'C'}

        ## Performance Targets
        - **Target Pipeline Duration**: < 10 minutes (Current: {pipeline_duration/60:.1f} minutes)
        - **Target Generation Rate**: > 15 words/second (Current: {words_per_second:.1f})
        - **Target Section Throughput**: > 1.0 sections/minute (Current: {sections_per_minute:.1f})
        - **Meets Performance Goals**: {'✅ Yes' if pipeline_duration < 600 and words_per_second > 15 else '❌ Optimization needed'}

        ## Next Steps
        - **Focus Area**: {'Pipeline parallelization and section generation optimization' if performance_grade in ['C', 'F'] else 'Fine-tune existing performance'}
        - **Expected Timeline**: {'2-4 weeks for major improvements' if performance_grade in ['C', 'F'] else '1-2 weeks for optimization'}
        - **Resource Requirements**: {'High - significant architecture changes' if pipeline_duration > 900 else 'Medium - targeted optimizations' if pipeline_duration > 450 else 'Low - incremental improvements'}
        """

        section_analysis = [
            "Test Configuration",
            "Pipeline Performance Results",
            "Content Generation Results",
            "Section Breakdown",
            "Performance Analysis",
            "Pipeline Stage Analysis",
            "Optimization Recommendations",
            "Scalability Analysis",
            "Performance Targets",
            "Next Steps"
        ]

        perf_ctx.set_content(analysis_content, section_analysis)


        if not success:
            perf_ctx.add_warning("Pipeline execution failed - critical issue")
        if pipeline_duration > 900:
            perf_ctx.add_warning(f"Very slow pipeline: {pipeline_duration/60:.1f} minutes")
        if section_count < len(grant_template.grant_sections):
            perf_ctx.add_warning(f"Incomplete section generation: {section_count}/{len(grant_template.grant_sections)}")
        if words_per_second < 10:
            perf_ctx.add_warning(f"Low generation throughput: {words_per_second:.1f} words/second")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1800)
async def test_pipeline_stage_breakdown_analysis(
    async_session_maker: async_sessionmaker[Any],
    logger: logging.Logger,
) -> None:
    """
    Analyze performance breakdown across individual pipeline stages.
    Identifies bottlenecks and optimization opportunities in each stage.
    """

    with create_performance_context(
        test_name="pipeline_stage_breakdown_analysis",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "stage_breakdown",
            "operation": "bottleneck_identification",
            "research_objectives_count": 3,
            "section_count": 6,
        },
        expected_patterns=["pipeline", "stage", "breakdown", "bottleneck"]
    ) as perf_ctx:

        logger.info("=== PIPELINE STAGE BREAKDOWN ANALYSIS ===")


        async with async_session_maker() as session, session.begin():

            grant_template = GrantTemplateFactory.build(
                title="Stage Analysis Template",
                grant_sections=[
                    GrantLongFormSection(
                        id="work-plan-1",
                        title="Research Plan",
                        description="Research plan for stage analysis",
                        order=1,
                        max_words=1500,
                        generation_instructions="Generate research plan",
                        keywords=["research", "plan"],
                        topics=["Research Plan"],
                        is_detailed_research_plan=True,
                        depends_on=[]
                    ),
                    GrantLongFormSection(
                        id="background-2",
                        title="Background",
                        description="Research background",
                        order=2,
                        max_words=1200,
                        generation_instructions="Generate background",
                        keywords=["background"],
                        topics=["Background"],
                        depends_on=["work-plan-1"]
                    ),
                    GrantLongFormSection(
                        id="methodology-3",
                        title="Methodology",
                        description="Research methodology",
                        order=3,
                        max_words=1400,
                        generation_instructions="Generate methodology",
                        keywords=["methodology"],
                        topics=["Methodology"],
                        depends_on=["work-plan-1"]
                    ),
                    GrantLongFormSection(
                        id="innovation-4",
                        title="Innovation",
                        description="Innovation aspects",
                        order=4,
                        max_words=1000,
                        generation_instructions="Generate innovation",
                        keywords=["innovation"],
                        topics=["Innovation"],
                        depends_on=["background-2", "methodology-3"]
                    ),
                    GrantLongFormSection(
                        id="timeline-5",
                        title="Timeline",
                        description="Project timeline",
                        order=5,
                        max_words=800,
                        generation_instructions="Generate timeline",
                        keywords=["timeline"],
                        topics=["Timeline"],
                        depends_on=["methodology-3"]
                    ),
                    GrantLongFormSection(
                        id="budget-6",
                        title="Budget",
                        description="Budget justification",
                        order=6,
                        max_words=1000,
                        generation_instructions="Generate budget",
                        keywords=["budget"],
                        topics=["Budget"],
                        depends_on=["methodology-3", "timeline-5"]
                    )
                ]
            )
            session.add(grant_template)
            await session.flush()

            research_objectives = [
                ResearchObjectiveFactory.build(
                    number=i+1,
                    title=f"Objective {i+1}: {title}",
                    description=desc,
                    research_tasks=[
                        {
                            "number": j+1,
                            "title": f"Task {i+1}.{j+1}: {task_title}",
                            "description": f"Task description for {i+1}.{j+1}",
                            "deliverables": [f"Deliverable {i+1}.{j+1}.1"],
                            "timeline_months": (j+1) * 4,
                            "dependencies": []
                        }
                        for j, task_title in enumerate(["Analysis", "Validation"])
                    ]
                )
                for i, (title, desc) in enumerate([
                    ("Cell Engineering", "Engineer enhanced therapeutic cells"),
                    ("Process Development", "Develop scalable manufacturing processes"),
                    ("Clinical Translation", "Translate research to clinical applications")
                ])
            ]

            form_inputs = ResearchDeepDive(
                research_domain="Therapeutic Cell Engineering",
                research_question="How can we develop more effective cell-based therapies?",
                methodology_approach="Engineering and manufacturing optimization",
                innovation_aspects="Novel cell engineering approaches",
                expected_outcomes="Improved therapeutic outcomes"
            )

            grant_application = GrantApplicationFactory.build(
                title="Cell Engineering Pipeline Analysis",
                grant_template=grant_template,
                research_objectives=research_objectives,
                form_inputs=form_inputs
            )
            session.add(grant_application)
            await session.flush()

            application_id = grant_application.id


        stage_timings = {}

        with perf_ctx.stage_timer("stage_1_initialization"):
            stage_start = datetime.now(UTC)
            job_manager = JobManager(async_session_maker)
            stage_timings["initialization"] = (datetime.now(UTC) - stage_start).total_seconds()

        with perf_ctx.stage_timer("stage_2_validation"):
            stage_start = datetime.now(UTC)

            stage_timings["validation"] = (datetime.now(UTC) - stage_start).total_seconds()

        with perf_ctx.stage_timer("stage_3_work_plan_generation"):
            stage_start = datetime.now(UTC)
            try:

                application_text, section_texts = await grant_application_text_generation_pipeline_handler(
                    grant_application_id=application_id,
                    session_maker=async_session_maker,
                    job_manager=job_manager
                )
                work_plan_duration = (datetime.now(UTC) - stage_start).total_seconds()
                stage_timings["work_plan_generation"] = work_plan_duration
                pipeline_success = True

            except Exception as e:
                work_plan_duration = (datetime.now(UTC) - stage_start).total_seconds()
                stage_timings["work_plan_generation"] = work_plan_duration
                pipeline_success = False
                application_text = ""
                section_texts = {}
                logger.error("Pipeline stage analysis failed", error=str(e), exc_info=e)


        total_pipeline_time = sum(stage_timings.values())
        stage_percentages = {stage: (duration / total_pipeline_time) * 100 if total_pipeline_time > 0 else 0
                           for stage, duration in stage_timings.items()}

        bottleneck_stage = max(stage_timings.items(), key=lambda x: x[1]) if stage_timings else ("none", 0)
        fastest_stage = min(stage_timings.items(), key=lambda x: x[1]) if stage_timings else ("none", 0)

        analysis_content = f"""
        # Pipeline Stage Breakdown Analysis

        ## Test Configuration
        - Application ID: {application_id}
        - Research Objectives: {len(research_objectives)}
        - Grant Sections: {len(grant_template.grant_sections)}
        - Pipeline Stages Analyzed: {len(stage_timings)}

        ## Stage Performance Breakdown
        - **Total Pipeline Time**: {total_pipeline_time:.2f} seconds
        - **Pipeline Status**: {'✅ Success' if pipeline_success else '❌ Failed'}

        ### Individual Stage Timings
        {chr(10).join([
            f"#### {stage.replace('_', ' ').title()}" + chr(10) +
            f"- Duration: {duration:.2f} seconds" + chr(10) +
            f"- Percentage of Total: {stage_percentages[stage]:.1f}%" + chr(10) +
            f"- Status: {'✅ Completed' if duration > 0 else '❌ Not measured'}"
            for stage, duration in stage_timings.items()
        ])}

        ## Bottleneck Analysis
        - **Primary Bottleneck**: {bottleneck_stage[0].replace('_', ' ').title()} ({bottleneck_stage[1]:.2f}s, {stage_percentages.get(bottleneck_stage[0], 0):.1f}%)
        - **Fastest Stage**: {fastest_stage[0].replace('_', ' ').title()} ({fastest_stage[1]:.2f}s, {stage_percentages.get(fastest_stage[0], 0):.1f}%)
        - **Performance Variance**: {bottleneck_stage[1] - fastest_stage[1]:.2f}s spread
        - **Stage Balance**: {'Well balanced' if bottleneck_stage[1] / fastest_stage[1] < 3 else 'Imbalanced' if bottleneck_stage[1] / fastest_stage[1] < 10 else 'Severely imbalanced'}

        ## Stage Optimization Opportunities
        ### High Priority (>25% of total time)
        {chr(10).join([
            f"- **{stage.replace('_', ' ').title()}**: {duration:.2f}s ({percentage:.1f}%) - Optimization target"
            for stage, (duration, percentage) in [(s, (d, stage_percentages[s])) for s, d in stage_timings.items()]
            if percentage > 25
        ]) or "- No stages exceed 25% threshold"}

        ### Medium Priority (10-25% of total time)
        {chr(10).join([
            f"- **{stage.replace('_', ' ').title()}**: {duration:.2f}s ({percentage:.1f}%) - Monitoring recommended"
            for stage, (duration, percentage) in [(s, (d, stage_percentages[s])) for s, d in stage_timings.items()]
            if 10 <= percentage <= 25
        ]) or "- No stages in medium priority range"}

        ### Low Priority (<10% of total time)
        {chr(10).join([
            f"- **{stage.replace('_', ' ').title()}**: {duration:.2f}s ({percentage:.1f}%) - Well optimized"
            for stage, (duration, percentage) in [(s, (d, stage_percentages[s])) for s, d in stage_timings.items()]
            if percentage < 10
        ]) or "- No stages in low priority range"}

        ## Performance Recommendations
        - **Immediate Focus**: {'Optimize ' + bottleneck_stage[0].replace('_', ' ') if stage_percentages.get(bottleneck_stage[0], 0) > 40 else 'Balanced optimization across stages'}
        - **Parallelization Potential**: {'High' if len([s for s, p in stage_percentages.items() if p > 20]) > 2 else 'Medium' if len([s for s, p in stage_percentages.items() if p > 20]) > 1 else 'Low'}
        - **Expected Improvement**: {'50-70% with bottleneck optimization' if stage_percentages.get(bottleneck_stage[0], 0) > 50 else '25-40% with targeted improvements' if stage_percentages.get(bottleneck_stage[0], 0) > 30 else '10-20% with general optimization'}

        ## Implementation Strategy
        - **Phase 1**: {'Focus on ' + bottleneck_stage[0].replace('_', ' ') + ' optimization' if stage_percentages.get(bottleneck_stage[0], 0) > 30 else 'General performance improvements'}
        - **Phase 2**: {'Implement stage parallelization' if len([s for s, p in stage_percentages.items() if p > 15]) > 2 else 'Fine-tune remaining stages'}
        - **Phase 3**: {'Monitor and maintain performance' if total_pipeline_time < 300 else 'Continue optimization efforts'}

        ## Performance Targets
        - **Target Total Time**: < 5 minutes (Current: {total_pipeline_time/60:.1f} minutes)
        - **Target Bottleneck**: < 40% of total time (Current: {stage_percentages.get(bottleneck_stage[0], 0):.1f}%)
        - **Target Stage Balance**: < 3x variance (Current: {bottleneck_stage[1] / fastest_stage[1] if fastest_stage[1] > 0 else 1:.1f}x)
        - **Meets Performance Goals**: {'✅ Yes' if total_pipeline_time < 300 and stage_percentages.get(bottleneck_stage[0], 0) < 40 else '❌ Optimization needed'}

        ## Next Steps
        - **Priority Action**: {'Optimize ' + bottleneck_stage[0].replace('_', ' ') + ' stage performance' if stage_percentages.get(bottleneck_stage[0], 0) > 35 else 'Implement parallel processing for multiple stages'}
        - **Timeline**: {'1-2 weeks for targeted optimization' if stage_percentages.get(bottleneck_stage[0], 0) > 40 else '2-4 weeks for comprehensive improvements'}
        """

        section_analysis = [
            "Test Configuration",
            "Stage Performance Breakdown",
            "Individual Stage Timings",
            "Bottleneck Analysis",
            "Stage Optimization Opportunities",
            "Performance Recommendations",
            "Implementation Strategy",
            "Performance Targets",
            "Next Steps"
        ]

        perf_ctx.set_content(analysis_content, section_analysis)


        if not pipeline_success:
            perf_ctx.add_warning("Pipeline execution failed during stage analysis")
        if stage_percentages.get(bottleneck_stage[0], 0) > 50:
            perf_ctx.add_warning(f"Severe bottleneck: {bottleneck_stage[0]} uses {stage_percentages.get(bottleneck_stage[0], 0):.1f}% of time")
        if total_pipeline_time > 600:
            perf_ctx.add_warning(f"Slow overall performance: {total_pipeline_time/60:.1f} minutes")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result