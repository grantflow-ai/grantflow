"use client";

import {
	FileWithIdFactory,
	FormInputsFactory,
	GrantSectionDetailedFactory,
	ResearchObjectiveFactory,
} from "::testing/factories";
import { Wand2 } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { crawlTemplateUrl } from "@/actions/sources";
import { AppButton } from "@/components/app/buttons/app-button";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { log } from "@/utils/logger";

const TEST_FILES = [
	{
		name: "MRA-2023-2024-RFP-Final.pdf",
		path: "../testing/test_data/sources/cfps/MRA-2023-2024-RFP-Final.pdf",
		type: "application/pdf",
	},
	{
		name: "israeli_chief_scientist_cfp.docx",
		path: "../testing/test_data/sources/cfps/israeli_chief_scientist_cfp.docx",
		type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	},
];

const TEST_URLS = [
	"https://grants.nih.gov/grants/guide/pa-files/PAR-25-383.html",
	"https://www.nsf.gov/pubs/2023/nsf23515/nsf23515.htm",
];

export function DevAutofillButton() {
	const params = useParams();
	const currentStep = useWizardStore((state) => state.currentStep);
	const handleTitleChange = useWizardStore((state) => state.handleTitleChange);
	const addFile = useApplicationStore((state) => state.addFile);
	const addUrl = useApplicationStore((state) => state.addUrl);
	const application = useApplicationStore((state) => state.application);
	const updateApplication = useApplicationStore((state) => state.updateApplication);
	const updateGrantSections = useApplicationStore((state) => state.updateGrantSections);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Dev hack - intentionally complex for testing
	const handleAutofill = async () => {
		try {
			const projectId = params.projectId as string;

			switch (currentStep) {
				case WizardStep.APPLICATION_DETAILS: {
					handleTitleChange("AI-Powered Early Cancer Detection Using Novel Biomarkers");

					for (const url of TEST_URLS) {
						try {
							await crawlTemplateUrl(projectId, application?.grant_template?.id ?? "", url);
							toast.success(`URL added: ${url}`);
							if (application?.grant_template?.id) {
								await addUrl(url, application.grant_template.id);
							}
						} catch (error) {
							log.error("dev-autofill-crawlTemplateUrl", error);
							toast.error(`Failed to add URL: ${url}`);
						}
					}

					for (const fileInfo of TEST_FILES) {
						const fileWithId = FileWithIdFactory.build({
							name: fileInfo.name,
							type: fileInfo.type,
						});
						if (application?.grant_template?.id) {
							await addFile(fileWithId, application.grant_template.id);
						}
					}

					toast.success("🎉 Step 1 autofilled! Click 'Next' to proceed.");

					break;
				}
				case WizardStep.APPLICATION_STRUCTURE: {
					if (!application?.grant_template?.id) {
						toast.error("No grant template found. Complete Application Details step first.");
						break;
					}

					const mainSections = GrantSectionDetailedFactory.batch(3).map((section, index) => ({
						...section,
						max_words: [1000, 1500, 2000][index] || section.max_words,
						order: index,
						parent_id: null,
						title:
							["Project Overview", "Research Methodology", "Implementation Plan"][index] || section.title,
					}));

					const subsections = [
						...GrantSectionDetailedFactory.batch(2).map((section, index) => ({
							...section,
							max_words: [500, 750][index] || section.max_words,
							order: index,
							parent_id: mainSections[0].id,
							title: ["Background & Significance", "Objectives & Aims"][index] || section.title,
						})),
						...GrantSectionDetailedFactory.batch(1).map((section) => ({
							...section,
							max_words: 800,
							order: 0,
							parent_id: mainSections[1].id,
							title: "Experimental Design",
						})),
						...GrantSectionDetailedFactory.batch(3).map((section, index) => ({
							...section,
							max_words: [600, 700, 500][index] || section.max_words,
							order: index,
							parent_id: mainSections[2].id,
							title:
								["Timeline & Milestones", "Budget & Resources", "Risk Management"][index] ||
								section.title,
						})),
					];

					const mockSections = [...mainSections, ...subsections];

					await updateGrantSections(mockSections);
					toast.success("🎉 Application structure populated with 3 sections and 6 subsections!");

					break;
				}
				case WizardStep.GENERATE_AND_COMPLETE: {
					toast.success("🎉 Application is ready for generation! Click 'Generate Application' to proceed.");

					break;
				}
				case WizardStep.KNOWLEDGE_BASE: {
					const knowledgeUrls = [
						"https://example.com/research-paper-1",
						"https://example.com/research-paper-2",
					];

					for (const url of knowledgeUrls) {
						if (application?.id) {
							await addUrl(url, application.id);
						}
					}

					const knowledgeFiles = [
						{ name: "research-paper.pdf", type: "application/pdf" },
						{
							name: "lab-results.docx",
							type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
						},
					];

					for (const fileInfo of knowledgeFiles) {
						if (!application?.id) continue;
						const fileWithId = FileWithIdFactory.build({
							name: fileInfo.name,
							type: fileInfo.type,
						});
						await addFile(fileWithId, application.id);
					}

					toast.success("🎉 Knowledge base populated!");
					break;
				}
				case WizardStep.RESEARCH_DEEP_DIVE: {
					const mockFormInputs = FormInputsFactory.build();

					await updateApplication({
						form_inputs: mockFormInputs,
					});

					toast.success("🎉 Research deep dive form populated with comprehensive data!");

					break;
				}
				case WizardStep.RESEARCH_PLAN: {
					const mockResearchObjectives = ResearchObjectiveFactory.batch(3).map((objective, index) => ({
						...objective,
						number: index + 1,
						title:
							[
								"Develop novel biomarker detection algorithms",
								"Validate biomarkers in clinical samples",
								"Optimize early detection protocols",
							][index] || objective.title,
					}));

					await updateApplication({
						research_objectives: mockResearchObjectives,
					});

					toast.success(`🎉 Research plan populated with ${mockResearchObjectives.length} objectives!`);

					break;
				}
				default: {
					toast.info("Autofill not implemented for this step yet.");
				}
			}
		} catch {
			toast.error("Failed to autofill wizard");
		}
	};

	if (process.env.NODE_ENV === "production") {
		return null;
	}

	return (
		<AppButton
			data-testid="dev-autofill-button"
			leftIcon={<Wand2 />}
			onClick={handleAutofill}
			size="sm"
			variant="primary"
		>
			{currentStep === WizardStep.GENERATE_AND_COMPLETE ? "Ready" : "Autofill"} {currentStep}
		</AppButton>
	);
}
