"use client";

import { Wand2 } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import {
	FormInputsFactory,
	GrantSectionDetailedFactory,
	RagSourceFactory,
	ResearchObjectiveFactory,
} from "::testing/factories";
import { crawlTemplateUrl } from "@/actions/sources";
import { AppButton } from "@/components/app-button";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { FileWithId } from "@/types/files";
import { logError } from "@/utils/logging";

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
	const { currentStep, handleTitleChange } = useWizardStore();
	const { addUrl, application, setUploadedFiles, setUrls, updateApplication, updateGrantSections } =
		useApplicationStore();

	const handleAutofill = async () => {
		try {
			const workspaceId = params.workspaceId as string;

			switch (currentStep) {
				case "Application Details": {
					handleTitleChange("AI-Powered Early Cancer Detection Using Novel Biomarkers");

					for (const url of TEST_URLS) {
						try {
							await crawlTemplateUrl(workspaceId, application?.grant_template?.id ?? "", url);
							toast.success(`URL added: ${url}`);
							await addUrl(url);
						} catch (error) {
							logError({ error, identifier: "dev-autofill-crawlTemplateUrl" });
							toast.error(`Failed to add URL: ${url}`);
						}
					}

					const testFiles = TEST_FILES.map((fileInfo) => {
						const file = new File(["Test file content"], fileInfo.name, { type: fileInfo.type });

						const fileWithId: FileWithId = Object.assign(file, {
							id: `file-${Date.now()}-${Math.random()}`,
						});

						return fileWithId;
					});

					setUploadedFiles(testFiles);

					toast.success("🎉 Step 1 autofilled! Click 'Next' to proceed.");

					break;
				}
				case "Application Structure": {
					if (!application?.grant_template?.id) {
						toast.error("No grant template found. Complete Application Details step first.");
						break;
					}

					const mockSections = GrantSectionDetailedFactory.batch(5).map((section, index) => ({
						...section,
						max_words: [500, 2000, 1500, 1000, 800][index] || section.max_words,
						order: index,
						parent_id: null,
						title:
							[
								"Executive Summary",
								"Project Description",
								"Research Methodology",
								"Budget Justification",
								"Team Qualifications",
							][index] || section.title,
					}));

					await updateGrantSections(mockSections);
					toast.success("🎉 Application structure populated with 5 sections!");

					break;
				}
				case "Generate and Complete": {
					toast.success("🎉 Application is ready for generation! Click 'Generate Application' to proceed.");

					break;
				}
				case "Knowledge Base": {
					const mockRagSources = RagSourceFactory.batch(3).map((source) => ({
						...source,
						status: "FINISHED" as const,
					}));

					const mockFiles: FileWithId[] = mockRagSources
						.filter((source) => source.filename)
						.map((source) => {
							const file = new File(["Mock file content for testing"], source.filename!, {
								type: "application/pdf",
							});
							return Object.assign(file, {
								id: source.sourceId,
							});
						});

					const mockUrls = mockRagSources.filter((source) => source.url).map((source) => source.url!);

					setUploadedFiles(mockFiles);
					setUrls(mockUrls);

					toast.success(
						`🎉 Knowledge base populated with ${mockFiles.length} files and ${mockUrls.length} URLs!`,
					);

					break;
				}
				case "Research Deep Dive": {
					const mockFormInputs = FormInputsFactory.build();

					await updateApplication({
						form_inputs: mockFormInputs,
					});

					toast.success("🎉 Research deep dive form populated with comprehensive data!");

					break;
				}
				case "Research Plan": {
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
			className="absolute left-1/2 -translate-x-1/2"
			data-testid="dev-autofill-button"
			leftIcon={<Wand2 />}
			onClick={handleAutofill}
			size="sm"
			variant="secondary"
		>
			{currentStep === "Generate and Complete" ? "Ready" : "Autofill"} {currentStep}
		</AppButton>
	);
}