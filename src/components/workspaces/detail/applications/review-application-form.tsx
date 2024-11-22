import { useWizardStore } from "@/stores/wizard";
import { useShallow } from "zustand/react/shallow";
import { Button } from "gen/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { Copy, Download, Loader2 } from "lucide-react";
import { generateApplicationDraft } from "@/actions/text-generation";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FIVE_SECONDS, TEN_MINUTES } from "@/constants";
import { retrieveGenerationResultByTicketID } from "@/actions/db";

export function ReviewApplicationForm({
	onPressPrevious,
	workspaceId,
	applicationId,
}: {
	onPressPrevious: () => void;
	workspaceId: string;
	applicationId: string;
}) {
	const [isLoading, setIsLoading] = useState(false);
	const [applicationDraftText, setApplicationDraftText] = useState<string | null>(null);
	const markdownRef = useRef<HTMLDivElement>(null);
	const { application, significance, innovation, researchAims, researchTasks, grantCFP } = useWizardStore({
		workspaceId,
	})(
		useShallow((state) => ({
			application: state.application,
			significance: state.significance,
			innovation: state.innovation,
			researchAims: state.researchAims,
			researchTasks: state.researchTasks,
			grantCFP: state.cfp,
		})),
	);

	if (!application || !significance || !innovation || !researchAims.length || !researchTasks.length) {
		return <div>Loading...</div>;
	}

	const handleGenerateDraft = async () => {
		setIsLoading(true);
		try {
			const ticketId = await generateApplicationDraft({
				workspace_id: workspaceId,
				application_id: applicationId,
				cfp_title: `${grantCFP!.code} - ${grantCFP!.title}`,
				application_title: application.title,
				grant_funding_organization: "NIH",
				significance_description: significance.text,
				innovation_description: innovation.text,
				significance_id: significance.id,
				innovation_id: innovation.id,
				research_aims: researchAims.map((aim) => ({
					id: aim.id,
					title: aim.title,
					description: aim.description,
					requires_clinical_trials: aim.requiresClinicalTrials,
					tasks: researchTasks
						.filter((task) => task.aimId === aim.id)
						.map((task) => ({
							id: task.id,
							title: task.title,
							description: task.description,
						})),
				})),
			});

			const startTime = Date.now();
			while (Date.now() - startTime < TEN_MINUTES) {
				const result = await retrieveGenerationResultByTicketID(ticketId);
				if (result) {
					setApplicationDraftText(result.text);
					return;
				}
				await new Promise((resolve) => setTimeout(resolve, FIVE_SECONDS));
			}

			throw new Error(`Polling timeout exceeded for ticket ${ticketId}`);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCopyMarkdown = () => {
		if (applicationDraftText) {
			void navigator.clipboard.writeText(applicationDraftText);
		}
	};

	const handleDownloadMarkdown = () => {
		if (applicationDraftText) {
			const blob = new Blob([applicationDraftText], { type: "text/markdown" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "application_draft.md";
			document.body.append(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		}
	};

	return (
		<div className="space-y-6">
			{applicationDraftText ? (
				<div className="space-y-4">
					<div className="flex justify-end space-x-2">
						<Button onClick={handleCopyMarkdown} variant="outline">
							<Copy className="mr-2 h-4 w-4" />
							Copy
						</Button>
						<Button onClick={handleDownloadMarkdown} variant="outline">
							<Download className="mr-2 h-4 w-4" />
							Download
						</Button>
					</div>
					<div ref={markdownRef} className="max-h-[60vh] overflow-y-auto border rounded-md p-4">
						<ReactMarkdown>{applicationDraftText}</ReactMarkdown>
					</div>
				</div>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>General Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div>
							<span className="font-semibold">NIH Activity Code:</span> {application.cfpId}
						</div>
						<div>
							<span className="font-semibold">Title:</span> {application.title}
						</div>
					</CardContent>
				</Card>
			)}

			<div className="pt-10 flex justify-between">
				<Button onClick={onPressPrevious} disabled={isLoading} variant="outline">
					Go Back
				</Button>
				<Button onClick={handleGenerateDraft} disabled={isLoading} data-testid="review-application-form-submit">
					{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Draft"}
				</Button>
			</div>
		</div>
	);
}
