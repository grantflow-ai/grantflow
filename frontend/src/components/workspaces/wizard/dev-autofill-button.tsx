"use client";

import { Wand2 } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { crawlTemplateUrl } from "@/actions/sources";
import { Button } from "@/components/ui/button";
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
	const { addUrl, application, setUploadedFiles } = useApplicationStore();

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
					toast.info("Application structure is ready. Click 'Approve and Continue'.");

					break;
				}
				case "Knowledge Base": {
					toast.info("Knowledge base is ready. Click 'Next' to proceed.");

					break;
				}
				case "Generate and Complete":
				case "Research Deep Dive":
				case "Research Plan":
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
		<Button
			className="absolute left-1/2 -translate-x-1/2 gap-2"
			data-testid="dev-autofill-button"
			onClick={handleAutofill}
			size="sm"
			variant="outline"
		>
			<Wand2 className="size-4" />
			Autofill {currentStep}
		</Button>
	);
}