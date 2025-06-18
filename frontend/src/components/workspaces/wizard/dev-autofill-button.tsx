"use client";

import { Wand2 } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { crawlTemplateUrl } from "@/actions/sources";
import { Button } from "@/components/ui/button";
import { FileWithId } from "@/components/workspaces/wizard/application-preview";
import { useWizardStore } from "@/stores/wizard-store";
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
	const { addUrl, applicationState, setApplicationTitle, setUploadedFiles, ui } = useWizardStore();

	const handleAutofill = async () => {
		try {
			const workspaceId = params.workspaceId as string;

			// Step 0: Application Details
			switch (ui.currentStep) {
				case 0: {
					// Set title
					setApplicationTitle("AI-Powered Early Cancer Detection Using Novel Biomarkers");

					// Add URLs via real API calls
					for (const url of TEST_URLS) {
						try {
							await crawlTemplateUrl(workspaceId, applicationState.templateId ?? "", url);
							toast.success(`URL added: ${url}`);
							addUrl(url);
						} catch (error) {
							logError({ error, identifier: "dev-autofill-crawlTemplateUrl" });
							toast.error(`Failed to add URL: ${url}`);
						}
					}

					// Create test files from the actual test data
					const testFiles = await Promise.all(
						TEST_FILES.map(async (fileInfo) => {
							// For development, we'll create mock File objects
							// In a real scenario, you'd fetch these from the file system
							const file = new File(["Test file content"], fileInfo.name, { type: fileInfo.type });

							// Add id property to the File object
							(file as FileWithId).id = `file-${Date.now()}-${Math.random()}`;

							return file as FileWithId;
						}),
					);

					setUploadedFiles(testFiles);

					toast.success("🎉 Step 1 autofilled! Click 'Next' to proceed.");

					break;
				}
				case 1: {
					// The structure is already generated when moving from step 0 to step 1
					// Just click "Approve and Continue"
					toast.info("Application structure is ready. Click 'Approve and Continue'.");

					break;
				}
				case 2: {
					// RAG sources should already be populated from step 0
					toast.info("Knowledge base is ready. Click 'Next' to proceed.");

					break;
				}
				default: {
					toast.info("Autofill not implemented for this step yet.");
				}
			}
		} catch (error) {
			console.error("Autofill error:", error);
			toast.error("Failed to autofill wizard");
		}
	};

	// Only show in development
	if (process.env.NODE_ENV === "production") {
		return null;
	}

	return (
		<Button
			className="absolute left-1/2 -translate-x-1/2 gap-2"
			data-testid="dev-autofill-button"
			onClick={handleAutofill}
			size="sm"
			variant="outline"
		>
			<Wand2 className="size-4" />
			Autofill Step {ui.currentStep + 1}
		</Button>
	);
}
